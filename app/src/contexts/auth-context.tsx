import { createContext, useContext, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getMe, logout as apiLogout, type User } from '@/lib/api'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: () => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const login = () => {
    window.location.href = '/auth/github'
  }

  const logout = async () => {
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
