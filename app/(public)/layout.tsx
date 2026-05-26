"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import Spinner from "@/components/Spinner"
import { useUser } from "@/lib/auth"

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoading, isLoggedIn } = useUser()

  const shouldGate = isLoading || (isLoggedIn && pathname !== "/preview")

  useEffect(() => {
    if (!isLoading && isLoggedIn && pathname !== "/preview") {
      router.replace("/heists")
    }
  }, [isLoading, isLoggedIn, pathname, router])

  return <main className="public">{shouldGate ? <Spinner /> : children}</main>
}
