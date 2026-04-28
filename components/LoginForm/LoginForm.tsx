"use client"

import { useState } from "react"
import Link from "next/link"
import styles from "./LoginForm.module.css"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    console.log("login", { email, password })
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate={false}>
      <label htmlFor="login-email">Email</label>
      <input
        id="login-email"
        name="email"
        type="email"
        required
        autoComplete="email"
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

      <button type="submit" className="btn">
        Log in
      </button>

      <p className={styles.crossLink}>
        Don&apos;t have an account? <Link href="/signup">Sign up</Link>
      </p>
    </form>
  )
}
