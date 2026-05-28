import { render, screen, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useHeists, type HeistMode } from "@/lib/useHeists"
import type { Heist } from "@/types/firestore"

type SnapshotDoc = { data: () => Heist }
type Snapshot = { docs: SnapshotDoc[] }
type SnapshotHandler = (snap: Snapshot) => void
type ErrorHandler = (err: Error) => void

const NOW_MS = 1_700_000_000_000

type Subscription = {
  queryArg: unknown
  onNext: SnapshotHandler
  onError: ErrorHandler
  unsubscribe: ReturnType<typeof vi.fn>
}

const subscriptions: Subscription[] = []

const collection = vi.fn((_db: unknown, name: string) => ({ __kind: "collection", name }))
const withConverter = vi.fn(function (this: { name: string }) {
  return { __kind: "collectionWithConverter", name: this.name }
})
const where = vi.fn((field: string, op: string, value: unknown) => ({
  __kind: "where",
  field,
  op,
  value,
}))
const orderBy = vi.fn((field: string, direction: string) => ({
  __kind: "orderBy",
  field,
  direction,
}))
const query = vi.fn((source: unknown, ...constraints: unknown[]) => ({
  __kind: "query",
  source,
  constraints,
}))

const onSnapshot = vi.fn((q: unknown, onNext: SnapshotHandler, onError: ErrorHandler) => {
  const unsubscribe = vi.fn()
  subscriptions.push({ queryArg: q, onNext, onError, unsubscribe })
  return unsubscribe
})

vi.mock("firebase/firestore", () => ({
  collection: (db: unknown, name: string) => {
    const ref = collection(db, name)
    return { ...ref, withConverter: () => withConverter.call({ name }) }
  },
  query: (source: unknown, ...constraints: unknown[]) => query(source, ...constraints),
  where: (field: string, op: string, value: unknown) => where(field, op, value),
  orderBy: (field: string, direction: string) => orderBy(field, direction),
  onSnapshot: (q: unknown, onNext: SnapshotHandler, onError: ErrorHandler) =>
    onSnapshot(q, onNext, onError),
  Timestamp: {
    now: () => ({ __kind: "timestamp", ms: NOW_MS }),
  },
}))

vi.mock("@/lib/firebase", () => ({
  db: { __kind: "db" },
}))

const useUserMock = vi.fn()
vi.mock("@/lib/auth", () => ({
  useUser: () => useUserMock(),
}))

function makeHeist(overrides: Partial<Heist> = {}): Heist {
  return {
    id: "h1",
    title: "Operation Stapler",
    description: "Liberate one Swingline.",
    createdBy: "u1",
    createdByCodename: "Fox",
    assignedTo: "u2",
    assignedToCodename: "Badger",
    createdAt: new Date(NOW_MS),
    deadline: new Date(NOW_MS + 1000),
    finalStatus: null,
    ...overrides,
  }
}

function Probe({ mode }: { mode: HeistMode }) {
  const { heists, loading, error } = useHeists(mode)
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="error">{error ? error.message : "null"}</span>
      <ul data-testid="titles">
        {heists.map((h) => (
          <li key={h.id}>{h.title}</li>
        ))}
      </ul>
    </div>
  )
}

function emitSnapshot(index: number, heists: Heist[]) {
  act(() => {
    subscriptions[index].onNext({
      docs: heists.map((h) => ({ data: () => h })),
    })
  })
}

function emitError(index: number, err: Error) {
  act(() => {
    subscriptions[index].onError(err)
  })
}

beforeEach(() => {
  subscriptions.length = 0
  collection.mockClear()
  withConverter.mockClear()
  where.mockClear()
  orderBy.mockClear()
  query.mockClear()
  onSnapshot.mockClear()
  useUserMock.mockReset()
  useUserMock.mockReturnValue({
    uid: "u1",
    user: null,
    isLoading: false,
    isLoggedIn: true,
    email: null,
  })
})

describe("useHeists", () => {
  it("subscribes with assignedTo + future deadline query for 'active' mode", () => {
    render(<Probe mode="active" />)

    expect(onSnapshot).toHaveBeenCalledTimes(1)
    expect(where).toHaveBeenCalledWith("assignedTo", "==", "u1")
    expect(where).toHaveBeenCalledWith(
      "deadline",
      ">",
      expect.objectContaining({ __kind: "timestamp" }),
    )

    emitSnapshot(0, [makeHeist({ id: "a", title: "Active One" })])

    expect(screen.getByTestId("loading")).toHaveTextContent("false")
    expect(screen.getByTestId("titles")).toHaveTextContent("Active One")
  })

  it("subscribes with createdBy + future deadline query for 'assigned' mode", () => {
    render(<Probe mode="assigned" />)

    expect(onSnapshot).toHaveBeenCalledTimes(1)
    expect(where).toHaveBeenCalledWith("createdBy", "==", "u1")
    expect(where).toHaveBeenCalledWith(
      "deadline",
      ">",
      expect.objectContaining({ __kind: "timestamp" }),
    )

    emitSnapshot(0, [makeHeist({ id: "b", title: "Assigned One" })])

    expect(screen.getByTestId("titles")).toHaveTextContent("Assigned One")
  })

  it("subscribes with past deadline + finalStatus in [success, failure] for 'expired' mode regardless of uid", () => {
    useUserMock.mockReturnValue({
      uid: null,
      user: null,
      isLoading: false,
      isLoggedIn: false,
      email: null,
    })

    render(<Probe mode="expired" />)

    expect(onSnapshot).toHaveBeenCalledTimes(1)
    expect(where).toHaveBeenCalledWith(
      "deadline",
      "<",
      expect.objectContaining({ __kind: "timestamp" }),
    )
    expect(where).toHaveBeenCalledWith("finalStatus", "in", ["success", "failure"])

    emitSnapshot(0, [makeHeist({ id: "c", title: "Expired One" })])

    expect(screen.getByTestId("titles")).toHaveTextContent("Expired One")
  })

  it("unsubscribes from the Firestore listener on unmount", () => {
    const { unmount } = render(<Probe mode="active" />)
    const unsub = subscriptions[0].unsubscribe

    unmount()

    expect(unsub).toHaveBeenCalledTimes(1)
  })

  it("re-subscribes (and unsubscribes the previous listener) when mode changes", () => {
    const { rerender } = render(<Probe mode="active" />)
    expect(onSnapshot).toHaveBeenCalledTimes(1)
    const firstUnsub = subscriptions[0].unsubscribe

    rerender(<Probe mode="expired" />)

    expect(firstUnsub).toHaveBeenCalledTimes(1)
    expect(onSnapshot).toHaveBeenCalledTimes(2)
    expect(where).toHaveBeenCalledWith("finalStatus", "in", ["success", "failure"])
  })

  it("does not subscribe for 'active' or 'assigned' modes when uid is null", () => {
    useUserMock.mockReturnValue({
      uid: null,
      user: null,
      isLoading: false,
      isLoggedIn: false,
      email: null,
    })

    const { rerender } = render(<Probe mode="active" />)
    expect(onSnapshot).not.toHaveBeenCalled()
    expect(screen.getByTestId("loading")).toHaveTextContent("false")
    expect(screen.getByTestId("titles")).toBeEmptyDOMElement()

    rerender(<Probe mode="assigned" />)
    expect(onSnapshot).not.toHaveBeenCalled()
  })

  it("does not subscribe while auth is still loading", () => {
    useUserMock.mockReturnValue({
      uid: null,
      user: null,
      isLoading: true,
      isLoggedIn: false,
      email: null,
    })

    render(<Probe mode="active" />)

    expect(onSnapshot).not.toHaveBeenCalled()
    expect(screen.getByTestId("loading")).toHaveTextContent("true")
  })

  it("surfaces an error when the Firestore listener reports an error", () => {
    render(<Probe mode="active" />)

    emitError(0, new Error("listener boom"))

    expect(screen.getByTestId("error")).toHaveTextContent("listener boom")
    expect(screen.getByTestId("loading")).toHaveTextContent("false")
  })
})
