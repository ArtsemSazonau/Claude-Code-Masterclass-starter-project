"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Timestamp,
  addDoc,
  collection,
  getDocs,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useUser } from "@/lib/auth"
import { COLLECTIONS, type CreateHeistInput } from "@/types/firestore"
import Spinner from "@/components/Spinner"
import styles from "./CreateHeistForm.module.css"

const DEADLINE_OFFSET_MS = 48 * 60 * 60 * 1000

type CrewMember = { id: string; codename: string }

function mapFirebaseError(err: unknown): string {
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code: unknown }).code
    if (code === "permission-denied") return "You don't have permission to create heists."
  }
  return "Something went wrong. Please try again."
}

export default function CreateHeistForm() {
  const router = useRouter()
  const { uid, user } = useUser()

  const [crew, setCrew] = useState<CrewMember[]>([])
  const [crewLoading, setCrewLoading] = useState(true)
  const [crewError, setCrewError] = useState("")

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [assigneeId, setAssigneeId] = useState("")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    async function loadCrew() {
      try {
        const snapshot = await getDocs(collection(db, COLLECTIONS.USERS))
        if (cancelled) return
        const members: CrewMember[] = snapshot.docs
          .map((d) => {
            const data = d.data() as { id?: string; codename?: string }
            return { id: data.id ?? d.id, codename: data.codename ?? "" }
          })
          .filter((m) => m.codename)
          .sort((a, b) => a.codename.localeCompare(b.codename))
        setCrew(members)
      } catch (err) {
        if (cancelled) return
        console.error("Failed to load crew", err)
        setCrewError("Couldn't load the crew. Refresh to try again.")
      } finally {
        if (!cancelled) setCrewLoading(false)
      }
    }
    loadCrew()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")

    const trimmedTitle = title.trim()
    const trimmedDescription = description.trim()
    const assignee = crew.find((m) => m.id === assigneeId)

    if (!trimmedTitle || !trimmedDescription || !assignee) return
    if (!uid) {
      setError("You must be signed in to create a heist.")
      return
    }

    const createdByCodename =
      user?.displayName ?? crew.find((m) => m.id === uid)?.codename ?? ""
    if (!createdByCodename) {
      setError("Your codename is missing. Please sign out and back in.")
      return
    }

    setIsSubmitting(true)
    try {
      const payload: CreateHeistInput = {
        title: trimmedTitle,
        description: trimmedDescription,
        createdBy: uid,
        createdByCodename,
        assignedTo: assignee.id,
        assignedToCodename: assignee.codename,
        createdAt: serverTimestamp(),
        deadline: Timestamp.fromDate(new Date(Date.now() + DEADLINE_OFFSET_MS)),
        finalStatus: null,
      }
      await addDoc(collection(db, COLLECTIONS.HEISTS), payload)
      router.replace("/heists")
    } catch (err) {
      setError(mapFirebaseError(err))
      setIsSubmitting(false)
    }
  }

  if (crewLoading) {
    return (
      <div className={styles.statusWrap}>
        <Spinner />
      </div>
    )
  }

  if (crewError) {
    return (
      <p role="alert" className={styles.emptyState}>
        {crewError}
      </p>
    )
  }

  if (crew.length === 0) {
    return (
      <p className={styles.emptyState}>
        No crew available yet — invite teammates to sign up before briefing a heist.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <label htmlFor="heist-title">Title</label>
      <input
        id="heist-title"
        name="title"
        type="text"
        required
        maxLength={80}
        autoComplete="off"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <label htmlFor="heist-description">Description</label>
      <textarea
        id="heist-description"
        name="description"
        required
        maxLength={500}
        rows={4}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <label htmlFor="heist-assignee">Assign to</label>
      <select
        id="heist-assignee"
        name="assignedTo"
        required
        value={assigneeId}
        onChange={(e) => setAssigneeId(e.target.value)}
      >
        <option value="" disabled>
          Pick a crew member…
        </option>
        {crew.map((member) => (
          <option key={member.id} value={member.id}>
            {member.codename}
          </option>
        ))}
      </select>

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      <button type="submit" className="btn" disabled={isSubmitting}>
        {isSubmitting ? "Briefing the crew…" : "Brief the heist"}
      </button>
    </form>
  )
}
