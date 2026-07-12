/**
 * Authentication context — prepared for JWT implementation.
 * Provides auth state and placeholder actions to the component tree.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { AuthState, User } from '@/types'

interface AuthContextValue extends AuthState {
  login: (token: string, user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const INITIAL_STATE: AuthState = {
  user: null,
  token: localStorage.getItem('access_token'),
  isAuthenticated: false,
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(INITIAL_STATE)

  const login = useCallback((token: string, user: User) => {
    localStorage.setItem('access_token', token)
    setAuthState({ user, token, isAuthenticated: true })
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    setAuthState({ user: null, token: null, isAuthenticated: false })
  }, [])

  return (
    <AuthContext.Provider value={{ ...authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
