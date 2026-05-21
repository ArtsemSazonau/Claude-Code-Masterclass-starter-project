import { render, screen, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import type { User } from "firebase/auth"

const listeners: Array<(u: User | null) => void> = []
const unsubscribe = vi.fn()
const onAuthStateChanged = vi.fn((_auth: unknown, cb: (u: User | null) => void) => {
  listeners.push(cb)
  return unsubscribe
})

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (auth: unknown, cb: (u: User | null) => void) => onAuthStateChanged(auth, cb),
}))

vi.mock("@/lib/firebase", () => ({
  auth: {},
}))

import { AuthProvider, useUser } from "@/lib/auth"

function Probe({ testId = "probe" }: { testId?: string }) {
  const { user, isLoading, isLoggedIn, uid, email } = useUser()
  return (
    <div data-testid={testId}>
      <span data-testid={`${testId}-loading`}>{String(isLoading)}</span>
      <span data-testid={`${testId}-logged-in`}>{String(isLoggedIn)}</span>
      <span data-testid={`${testId}-uid`}>{uid ?? "null"}</span>
      <span data-testid={`${testId}-email`}>{email ?? "null"}</span>
      <span data-testid={`${testId}-user`}>{user ? "user" : "null"}</span>
    </div>
  )
}

function emit(u: User | null) {
  act(() => {
    listeners.forEach((cb) => cb(u))
  })
}

const fakeUser = { uid: "abc123", email: "alice@example.com" } as User

beforeEach(() => {
  listeners.length = 0
  onAuthStateChanged.mockClear()
  unsubscribe.mockClear()
})

describe("AuthProvider + useUser", () => {
  it("starts in loading state with no user", () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    expect(screen.getByTestId("probe-loading")).toHaveTextContent("true")
    expect(screen.getByTestId("probe-logged-in")).toHaveTextContent("false")
    expect(screen.getByTestId("probe-user")).toHaveTextContent("null")
    expect(screen.getByTestId("probe-uid")).toHaveTextContent("null")
    expect(screen.getByTestId("probe-email")).toHaveTextContent("null")
  })

  it("exposes the user and derived fields after sign-in event", () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    emit(fakeUser)

    expect(screen.getByTestId("probe-loading")).toHaveTextContent("false")
    expect(screen.getByTestId("probe-logged-in")).toHaveTextContent("true")
    expect(screen.getByTestId("probe-uid")).toHaveTextContent("abc123")
    expect(screen.getByTestId("probe-email")).toHaveTextContent("alice@example.com")
  })

  it("resolves to logged-out state when listener fires with null", () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    emit(null)

    expect(screen.getByTestId("probe-loading")).toHaveTextContent("false")
    expect(screen.getByTestId("probe-logged-in")).toHaveTextContent("false")
    expect(screen.getByTestId("probe-user")).toHaveTextContent("null")
  })

  it("transitions back to null on sign-out", () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    emit(fakeUser)
    expect(screen.getByTestId("probe-logged-in")).toHaveTextContent("true")

    emit(null)
    expect(screen.getByTestId("probe-logged-in")).toHaveTextContent("false")
    expect(screen.getByTestId("probe-uid")).toHaveTextContent("null")
  })

  it("creates only one onAuthStateChanged subscription even with multiple consumers", () => {
    render(
      <AuthProvider>
        <Probe testId="a" />
        <Probe testId="b" />
      </AuthProvider>,
    )

    expect(onAuthStateChanged).toHaveBeenCalledTimes(1)
  })

  it("calls the unsubscribe function when the provider unmounts", () => {
    const { unmount } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    unmount()
    expect(unsubscribe).toHaveBeenCalled()
  })

  it("throws a clear error when useUser is called outside the provider", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    expect(() => render(<Probe />)).toThrow(/must be used inside/i)
    errSpy.mockRestore()
  })
})
