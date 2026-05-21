"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { auth } from "@/lib/firebase"

type AuthContextValue = {
  user: User | null
  isLoading: boolean
  isLoggedIn: boolean
  uid: string | null
  email: string | null
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (next) => {
      setUser(next)
      setIsLoading(false)
    })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isLoggedIn: user !== null,
      uid: user?.uid ?? null,
      email: user?.email ?? null,
    }),
    [user, isLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useUser(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useUser must be used inside <AuthProvider>")
  }
  return ctx
}
