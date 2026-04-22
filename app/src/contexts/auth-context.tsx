import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
  type AuthError,
  type User as FirebaseUser,
} from 'firebase/auth'
import { getFirebaseAuth, googleProvider } from '@/lib/firebase'
import { getMe, logout as apiLogout, migrateProgress, type User } from '@/lib/api'
import { PROGRESS_QUERY_KEY } from '@/lib/hooks/use-progress'

const MIGRATE_BATCH_KEY = 'progress_migration_batch_id'

/**
 * Best-effort merge of guest progress into the authed user. The `batchId` is
 * persisted so a retry after crash or offline reuses the same server-side
 * batch record — replay returns `already_applied` without duplicating work.
 */
async function runMigrateProgress(): Promise<void> {
  let batchId = localStorage.getItem(MIGRATE_BATCH_KEY)
  if (!batchId) {
    batchId = crypto.randomUUID()
    localStorage.setItem(MIGRATE_BATCH_KEY, batchId)
  }
  try {
    const res = await migrateProgress(batchId)
    if (res.status === 'in_progress') {
      // Another worker is still running this batch (or a prior attempt crashed
      // mid-flight). batchId stays in storage; the next auth trigger retries.
      return
    }
    localStorage.removeItem(MIGRATE_BATCH_KEY)
    if (res.status === 'completed' && (res.imported ?? 0) > 0) {
      toast.success(`Đã đồng bộ ${res.imported} lab từ phiên khách`)
    }
  } catch (err) {
    console.error('[auth] progress migrate failed:', err)
    // Surface only once per session-ish; keep batchId for retry.
    toast.error('Không đồng bộ được tiến độ từ phiên khách — thử lại lần đăng nhập kế tiếp')
  }
}

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function exchangeIdToken(idToken: string) {
  const res = await fetch('/auth/firebase/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  })
  if (!res.ok) throw new Error('session_exchange_failed')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const hasBackendUser = !!data?.user
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null)
  const [fbReady, setFbReady] = useState(false)

  useEffect(() => {
    const auth = getFirebaseAuth()
    getRedirectResult(auth)
      .then(async (result) => {
        if (!result) return
        const idToken = await result.user.getIdToken()
        await exchangeIdToken(idToken)
        await runMigrateProgress()
        queryClient.invalidateQueries({ queryKey: ['me'] })
        queryClient.invalidateQueries({ queryKey: PROGRESS_QUERY_KEY })
      })
      .catch((err) => {
        console.error('[auth] redirect result failed:', err)
      })

    const unsub = onAuthStateChanged(auth, (u) => {
      setFbUser(u)
      setFbReady(true)
    })
    return () => unsub()
  }, [queryClient])

  // Firebase persists auth locally — if Firebase has a user but backend session
  // is missing (cookie expired/cleared), re-exchange idToken to restore session.
  useEffect(() => {
    if (!fbReady || isLoading) return
    if (!fbUser || hasBackendUser) return
    let cancelled = false
    ;(async () => {
      try {
        const idToken = await fbUser.getIdToken()
        if (cancelled) return
        await exchangeIdToken(idToken)
        await runMigrateProgress()
        queryClient.invalidateQueries({ queryKey: ['me'] })
        queryClient.invalidateQueries({ queryKey: PROGRESS_QUERY_KEY })
      } catch (err) {
        console.error('[auth] token exchange on state change failed:', err)
      }
    })()
    return () => { cancelled = true }
  }, [fbReady, isLoading, fbUser, hasBackendUser, queryClient])

  const login = async () => {
    const auth = getFirebaseAuth()
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const idToken = await result.user.getIdToken()
      await exchangeIdToken(idToken)
      await runMigrateProgress()
      queryClient.invalidateQueries({ queryKey: ['me'] })
      queryClient.invalidateQueries({ queryKey: PROGRESS_QUERY_KEY })
    } catch (err) {
      const code = (err as AuthError)?.code
      if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user') {
        await signInWithRedirect(auth, googleProvider)
        return
      }
      console.error('[auth] login failed:', err)
    }
  }

  const logout = async () => {
    try {
      await signOut(getFirebaseAuth())
    } catch {
      // ignore Firebase signOut errors — still clear BE session
    }
    await apiLogout()
    queryClient.setQueryData(['me'], { user: null })
    queryClient.invalidateQueries({ queryKey: PROGRESS_QUERY_KEY })
  }

  return (
    <AuthContext.Provider
      value={{
        user: data?.user ?? null,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
