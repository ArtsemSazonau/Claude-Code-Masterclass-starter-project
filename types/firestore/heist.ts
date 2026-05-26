import {
  DocumentData,
  FieldValue,
  QueryDocumentSnapshot,
  Timestamp,
} from "firebase/firestore"

export type HeistFinalStatus = "success" | "failure"

export interface Heist {
  id: string
  title: string
  description: string
  createdBy: string
  createdByCodename: string
  assignedTo: string
  assignedToCodename: string
  createdAt: Date
  deadline: Date
  finalStatus: HeistFinalStatus | null
}

export interface CreateHeistInput {
  title: string
  description: string
  createdBy: string
  createdByCodename: string
  assignedTo: string
  assignedToCodename: string
  createdAt: FieldValue
  deadline: Timestamp
  finalStatus: null
}

export interface UpdateHeistInput {
  title?: string
  description?: string
  assignedTo?: string
  assignedToCodename?: string
  deadline?: Timestamp
  finalStatus?: HeistFinalStatus | null
}

export const heistConverter = {
  toFirestore: (data: Partial<Heist>): DocumentData => data,

  fromFirestore: (snapshot: QueryDocumentSnapshot): Heist =>
    ({
      id: snapshot.id,
      ...snapshot.data(),
      createdAt: snapshot.data().createdAt?.toDate(),
      deadline: snapshot.data().deadline?.toDate(),
    }) as Heist,
}
