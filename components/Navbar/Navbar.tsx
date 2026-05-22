"use client"

import { Clock8, Plus } from "lucide-react"
import Link from "next/link"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useUser } from "@/lib/auth"
import styles from "./Navbar.module.css"

export default function Navbar() {
  const { isLoggedIn, isLoading } = useUser()

  function handleLogout() {
    signOut(auth).catch((err) => console.error("Failed to sign out", err))
  }

  const showLogout = !isLoading && isLoggedIn

  return (
    <div className={styles.siteNav}>
      <nav>
        <header>
          <h1>
            <Link href="/heists">
              P<Clock8 className={styles.logo} size={14} strokeWidth={2.75} />
              cket Heist
            </Link>
          </h1>
          <div>Tiny missions. Big office mischief.</div>
        </header>
        <ul>
          {showLogout && (
            <li>
              <button type="button" onClick={handleLogout} className={styles.logout}>
                Logout
              </button>
            </li>
          )}
          <li>
            <Link href="/heists/create" className={styles.cta}>
              <Plus size={16} strokeWidth={2.5} />
              Create Heist
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  )
}
