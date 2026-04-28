"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import styles from "./SignupForm.module.css"

export default function SignupForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const confirmRef = useRef<HTMLInputElement>(null)

  function checkMatch(pw: string, confirm: string) {
    return confirm && confirm !== pw ? "Passwords do not match" : ""
  }

  function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setPassword(value)
    confirmRef.current?.setCustomValidity(checkMatch(value, confirmPassword))
  }

  function handleConfirmChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setConfirmPassword(value)
    e.target.setCustomValidity(checkMatch(password, value))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    console.log("signup", { email, password })
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <label htmlFor="signup-email">Email</label>
      <input
        id="signup-email"
        name="email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <label htmlFor="signup-password">Password</label>
      <input
        id="signup-password"
        name="password"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        value={password}
        onChange={handlePasswordChange}
      />

      <label htmlFor="signup-confirm-password">Confirm password</label>
      <input
        id="signup-confirm-password"
        name="confirmPassword"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        ref={confirmRef}
        value={confirmPassword}
        onChange={handleConfirmChange}
      />

      <button type="submit" className="btn">
        Sign up
      </button>

      <p className={styles.crossLink}>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </form>
  )
}
