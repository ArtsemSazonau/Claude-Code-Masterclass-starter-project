"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"
import styles from "./LoginForm.module.css"

function mapFirebaseError(err: unknown): string {
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code: unknown }).code
    if (
      code === "auth/invalid-credential" ||
      code === "auth/user-not-found" ||
      code === "auth/wrong-password"
    ) {
      return "Invalid email or password."
    }
    if (code === "auth/user-disabled") return "This account has been disabled."
    if (code === "auth/too-many-requests")
      return "Too many attempts. Please wait a moment and try again."
  }
  return "Something went wrong. Please try again."
}

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    emailRef.current?.focus()
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setIsLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      setIsLoggedIn(true)
    } catch (err) {
      setError(mapFirebaseError(err))
      setIsLoading(false)
    }
  }

  if (isLoggedIn) {
    return (
      <p role="status" aria-live="polite" className={styles.success}>
        You are logged in.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <label htmlFor="login-email">Email</label>
      <input
        id="login-email"
        name="email"
        type="email"
        required
        autoComplete="email"
        ref={emailRef}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <label htmlFor="login-password">Password</label>
      <input
        id="login-password"
        name="password"
        type="password"
        required
        minLength={8}
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      <button type="submit" className="btn" disabled={isLoading}>
        {isLoading ? "Logging in…" : "Log in"}
      </button>

      <p className={styles.crossLink}>
        Don&apos;t have an account? <Link href="/signup">Sign up</Link>
      </p>
    </form>
  )
}
