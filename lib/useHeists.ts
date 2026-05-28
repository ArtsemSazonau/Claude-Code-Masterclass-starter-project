"use client"

import { useEffect, useState } from "react"
import {
  Timestamp,
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  type CollectionReference,
  type Query,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useUser } from "@/lib/auth"
import { COLLECTIONS, heistConverter, type Heist } from "@/types/firestore"

export type HeistMode = "active" | "assigned" | "expired"

export type UseHeistsResult = {
  heists: Heist[]
  loading: boolean
  error: Error | null
}

const EMPTY: Heist[] = []

// Requires Firestore composite indexes: assignedTo+deadline, createdBy+deadline, deadline+finalStatus.
function buildQuery(mode: HeistMode, uid: string): Query<Heist> {
  const heistsRef = collection(db, COLLECTIONS.HEISTS).withConverter(
    heistConverter,
  ) as CollectionReference<Heist>
  const now = Timestamp.now()

  if (mode === "active") {
    return query(
      heistsRef,
      where("assignedTo", "==", uid),
      where("deadline", ">", now),
      orderBy("deadline", "asc"),
    )
  }

  if (mode === "assigned") {
    return query(
      heistsRef,
      where("createdBy", "==", uid),
      where("deadline", ">", now),
      orderBy("deadline", "asc"),
    )
  }

  return query(
    heistsRef,
    where("deadline", "<", now),
    where("finalStatus", "in", ["success", "failure"]),
    orderBy("deadline", "desc"),
  )
}

type SnapshotState = {
  key: string
  heists: Heist[]
  loading: boolean
  error: Error | null
}

const INITIAL_SNAPSHOT: SnapshotState = {
  key: "",
  heists: [],
  loading: false,
  error: null,
}

export function useHeists(mode: HeistMode): UseHeistsResult {
  const { uid, isLoading: authLoading } = useUser()
  const [snapshot, setSnapshot] = useState<SnapshotState>(INITIAL_SNAPSHOT)

  // 'expired' is global; 'active' / 'assigned' need a uid.
  const needsUser = mode === "active" || mode === "assigned"
  const canSubscribe = !authLoading && (!needsUser || uid !== null)
  const subscriptionKey = canSubscribe ? `${mode}|${uid ?? ""}` : ""

  useEffect(() => {
    if (!canSubscribe) return

    const q = buildQuery(mode, uid as string)

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setSnapshot({
          key: subscriptionKey,
          heists: snap.docs.map((d) => d.data()),
          loading: false,
          error: null,
        })
      },
      (err) => {
        setSnapshot({
          key: subscriptionKey,
          heists: [],
          loading: false,
          error: err,
        })
      },
    )

    return unsubscribe
  }, [subscriptionKey, canSubscribe, mode, uid])

  if (authLoading) {
    return { heists: EMPTY, loading: true, error: null }
  }
  if (!canSubscribe) {
    return { heists: EMPTY, loading: false, error: null }
  }
  // Snapshot from a previous subscription is stale until the new listener fires.
  if (snapshot.key !== subscriptionKey) {
    return { heists: EMPTY, loading: true, error: null }
  }
  return { heists: snapshot.heists, loading: snapshot.loading, error: snapshot.error }
}
