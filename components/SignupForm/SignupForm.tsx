"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { generateCodename } from "@/lib/codename"
import { COLLECTIONS } from "@/types/firestore"
import styles from "./SignupForm.module.css"

function mapFirebaseError(err: unknown): string {
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code: unknown }).code
    if (code === "auth/email-already-in-use") return "That email is already registered."
    if (code === "auth/weak-password") return "Password is too weak."
  }
  return "Something went wrong. Please try again."
}

export default function SignupForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setIsLoading(true)
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password)
      const codename = generateCodename()
      await updateProfile(user, { displayName: codename })
      try {
        await setDoc(doc(db, COLLECTIONS.USERS, user.uid), { id: user.uid, codename })
      } catch (firestoreErr) {
        console.error("Failed to write user document", firestoreErr)
      }
      router.replace("/heists")
    } catch (err) {
      setError(mapFirebaseError(err))
      setIsLoading(false)
    }
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

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      <button type="submit" className="btn" disabled={isLoading}>
        {isLoading ? "Signing up…" : "Sign up"}
      </button>

      <p className={styles.crossLink}>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </form>
  )
}
