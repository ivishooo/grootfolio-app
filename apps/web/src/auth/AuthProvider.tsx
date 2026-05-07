import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

interface User {
  name: string
  email: string
}

interface AuthContextValue {
  isAuthenticated: boolean
  user: User | null
  login: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const MOCK_USER: User = { name: 'Usuario Demo', email: 'demo@grootfolio.com' }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  const login = useCallback(() => setUser(MOCK_USER), [])
  const logout = useCallback(() => setUser(null), [])

  const value = useMemo<AuthContextValue>(
    () => ({ isAuthenticated: user !== null, user, login, logout }),
    [user, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
