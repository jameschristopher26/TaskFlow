import { createContext } from 'react'
import type { AuthSession, RegistrationInput } from '../services/authService'

export type AuthContextValue = {
  session: AuthSession
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (input: RegistrationInput) => Promise<void>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
