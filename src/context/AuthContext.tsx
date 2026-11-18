import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  getSession,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  type AuthSession,
  type RegistrationInput,
} from '../services/authService'
import { AuthContext } from './authContextState'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshSession = useCallback(async () => {
    setIsLoading(true)
    try {
      setSession(await getSession())
    } catch {
      setSession(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void getSession(controller.signal)
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setIsLoading(false))
    return () => controller.abort()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    try {
      setSession(await loginRequest(email, password))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(async (input: RegistrationInput) => {
    await registerRequest(input)
  }, [])

  const logout = useCallback(async () => {
    setIsLoading(true)
    try {
      await logoutRequest()
      setSession(null)
      window.location.hash = 'login'
    } finally {
      setIsLoading(false)
    }
  }, [])

  const value = useMemo(
    () => ({ session, isLoading, login, register, logout, refreshSession }),
    [session, isLoading, login, register, logout, refreshSession],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
