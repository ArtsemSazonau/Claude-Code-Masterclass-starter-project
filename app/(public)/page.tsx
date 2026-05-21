"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Clock8 } from "lucide-react"
import Spinner from "@/components/Spinner"
import { useUser } from "@/lib/auth"

export default function Home() {
  const router = useRouter()
  const { isLoading, isLoggedIn } = useUser()

  useEffect(() => {
    if (isLoading) return
    router.replace(isLoggedIn ? "/heists" : "/login")
  }, [isLoading, isLoggedIn, router])

  return (
    <div className="center-content">
      <div className="page-content">
        <h1>
          P<Clock8 className="logo" strokeWidth={2.75} />
          cket Heist
        </h1>
        <div>Your mission. Their stapler.</div>
        <div className="mt-6">
          <Spinner />
        </div>
      </div>
    </div>
  )
}
