import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"

const useUserMock = vi.fn()
const replaceMock = vi.fn()
const pathnameMock = vi.fn()

vi.mock("@/lib/auth", () => ({
  useUser: () => useUserMock(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => pathnameMock(),
}))

import PublicLayout from "@/app/(public)/layout"

const loggedOutState = {
  user: null,
  isLoading: false,
  isLoggedIn: false,
  uid: null,
  email: null,
}

const loadingState = {
  user: null,
  isLoading: true,
  isLoggedIn: false,
  uid: null,
  email: null,
}

const loggedInState = {
  user: { uid: "user-abc", email: "alice@example.com" },
  isLoading: false,
  isLoggedIn: true,
  uid: "user-abc",
  email: "alice@example.com",
}

const CHILD_TEXT = "public-child-content"

beforeEach(() => {
  useUserMock.mockReset()
  replaceMock.mockReset()
  pathnameMock.mockReset()
  useUserMock.mockReturnValue(loggedOutState)
  pathnameMock.mockReturnValue("/login")
})

describe("PublicLayout", () => {
  it("renders the spinner and hides children while auth is loading", () => {
    useUserMock.mockReturnValue(loadingState)
    render(<PublicLayout>{CHILD_TEXT}</PublicLayout>)

    expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument()
    expect(screen.queryByText(CHILD_TEXT)).not.toBeInTheDocument()
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it("renders children for a logged-out user on /login", () => {
    useUserMock.mockReturnValue(loggedOutState)
    pathnameMock.mockReturnValue("/login")
    render(<PublicLayout>{CHILD_TEXT}</PublicLayout>)

    expect(screen.getByText(CHILD_TEXT)).toBeInTheDocument()
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it("redirects a logged-in user away from /login to /heists and hides children", () => {
    useUserMock.mockReturnValue(loggedInState)
    pathnameMock.mockReturnValue("/login")
    render(<PublicLayout>{CHILD_TEXT}</PublicLayout>)

    expect(replaceMock).toHaveBeenCalledWith("/heists")
    expect(screen.queryByText(CHILD_TEXT)).not.toBeInTheDocument()
    expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument()
  })

  it("allows a logged-in user to view /preview without redirecting", () => {
    useUserMock.mockReturnValue(loggedInState)
    pathnameMock.mockReturnValue("/preview")
    render(<PublicLayout>{CHILD_TEXT}</PublicLayout>)

    expect(replaceMock).not.toHaveBeenCalled()
    expect(screen.getByText(CHILD_TEXT)).toBeInTheDocument()
  })

  it("allows a logged-out user to view /preview without redirecting", () => {
    useUserMock.mockReturnValue(loggedOutState)
    pathnameMock.mockReturnValue("/preview")
    render(<PublicLayout>{CHILD_TEXT}</PublicLayout>)

    expect(replaceMock).not.toHaveBeenCalled()
    expect(screen.getByText(CHILD_TEXT)).toBeInTheDocument()
  })
})
