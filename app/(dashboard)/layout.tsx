"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Navbar from "@/components/Navbar"
import Spinner from "@/components/Spinner"
import { useUser } from "@/lib/auth"

export default function HeistsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const router = useRouter()
  const { isLoading, isLoggedIn } = useUser()

  const shouldGate = isLoading || !isLoggedIn

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.replace("/login")
    }
  }, [isLoading, isLoggedIn, router])

  return (
    <>
      <Navbar />
      <main>{shouldGate ? <Spinner /> : children}</main>
    </>
  )
}
