/**
 * Authentication context.
 *
 * On mount, if a token exists in localStorage, /auth/me is called to
 * rehydrate the user session without forcing a re-login.
 * All auth state is centralised here; components never touch localStorage directly.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { authService } from '@/services/auth.service'
import type { AuthState, LoginRequest, SignupRequest, TokenResponse, User } from '@/types'

// ── Context shape ─────────────────────────────────────────────────────────────

interface AuthContextValue extends AuthState {
  login: (payload: LoginRequest) => Promise<void>
  signup: (payload: SignupRequest) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// ── Token storage helpers ─────────────────────────────────────────────────────

const TOKEN_KEY = 'access_token'

function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

function readToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: readToken(),
    isAuthenticated: false,
    isLoading: true,   // true until the bootstrap /me call resolves
  })

  // ── Bootstrap: rehydrate session from stored token ────────────────────────
  useEffect(() => {
    const token = readToken()
    if (!token) {
      setAuthState((s) => ({ ...s, isLoading: false }))
      return
    }

    authService
      .me()
      .then((user: User) => {
        setAuthState({ user, token, isAuthenticated: true, isLoading: false })
      })
      .catch(() => {
        // Token is expired or invalid — clean up silently
        clearToken()
        setAuthState({ user: null, token: null, isAuthenticated: false, isLoading: false })
      })
  }, [])

  // ── Actions ───────────────────────────────────────────────────────────────

  const _applyTokenResponse = useCallback((res: TokenResponse) => {
    storeToken(res.access_token)
    setAuthState({
      user: res.user,
      token: res.access_token,
      isAuthenticated: true,
      isLoading: false,
    })
  }, [])

  const login = useCallback(async (payload: LoginRequest) => {
    const res = await authService.login(payload)
    _applyTokenResponse(res)
  }, [_applyTokenResponse])

  const signup = useCallback(async (payload: SignupRequest) => {
    const res = await authService.signup(payload)
    _applyTokenResponse(res)
  }, [_applyTokenResponse])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } catch {
      // Proceed with local cleanup even if server call fails
    } finally {
      clearToken()
      setAuthState({ user: null, token: null, isAuthenticated: false, isLoading: false })
    }
  }, [])

  return (
    <AuthContext.Provider value={{ ...authState, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
