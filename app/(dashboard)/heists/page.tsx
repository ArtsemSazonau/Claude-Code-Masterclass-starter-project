"use client"

import { useHeists, type UseHeistsResult } from "@/lib/useHeists"

function SectionBody({ result }: { result: UseHeistsResult }) {
  if (result.error) {
    return (
      <p role="alert" className="text-error">
        {result.error.message}
      </p>
    )
  }
  return (
    <ul>
      {result.heists.map((heist) => (
        <li key={heist.id}>{heist.title}</li>
      ))}
    </ul>
  )
}

export default function HeistsPage() {
  const active = useHeists("active")
  const assigned = useHeists("assigned")
  const expired = useHeists("expired")

  return (
    <div className="page-content">
      <div className="active-heists">
        <h2>Your Active Heists</h2>
        <SectionBody result={active} />
      </div>
      <div className="assigned-heists">
        <h2>Heists You&apos;ve Assigned</h2>
        <SectionBody result={assigned} />
      </div>
      <div className="expired-heists">
        <h2>All Expired Heists</h2>
        <SectionBody result={expired} />
      </div>
    </div>
  )
}
