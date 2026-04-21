import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  type AuthError,
} from 'firebase/auth'
import { getFirebaseAuth, googleProvider } from '@/lib/firebase'
import { getMe, logout as apiLogout, type User } from '@/lib/api'

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

  useEffect(() => {
    const auth = getFirebaseAuth()
    getRedirectResult(auth)
      .then(async (result) => {
        if (!result) return
        const idToken = await result.user.getIdToken()
        await exchangeIdToken(idToken)
        queryClient.invalidateQueries({ queryKey: ['me'] })
        queryClient.invalidateQueries({ queryKey: ['progress'] })
      })
      .catch((err) => {
        console.error('[auth] redirect result failed:', err)
      })
  }, [queryClient])

  const login = async () => {
    const auth = getFirebaseAuth()
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const idToken = await result.user.getIdToken()
      await exchangeIdToken(idToken)
      queryClient.invalidateQueries({ queryKey: ['me'] })
      queryClient.invalidateQueries({ queryKey: ['progress'] })
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
    queryClient.invalidateQueries({ queryKey: ['progress'] })
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
