import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"

const useUserMock = vi.fn()
const replaceMock = vi.fn()

vi.mock("@/lib/auth", () => ({
  useUser: () => useUserMock(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}))

vi.mock("@/components/Navbar", () => ({
  default: () => <nav data-testid="navbar" />,
}))

import HeistsLayout from "@/app/(dashboard)/layout"

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

const CHILD_TEXT = "dashboard-child-content"

beforeEach(() => {
  useUserMock.mockReset()
  replaceMock.mockReset()
  useUserMock.mockReturnValue(loggedOutState)
})

describe("HeistsLayout", () => {
  it("renders the navbar and spinner and hides children while auth is loading", () => {
    useUserMock.mockReturnValue(loadingState)
    render(<HeistsLayout>{CHILD_TEXT}</HeistsLayout>)

    expect(screen.getByTestId("navbar")).toBeInTheDocument()
    expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument()
    expect(screen.queryByText(CHILD_TEXT)).not.toBeInTheDocument()
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it("redirects logged-out users to /login and hides children", () => {
    useUserMock.mockReturnValue(loggedOutState)
    render(<HeistsLayout>{CHILD_TEXT}</HeistsLayout>)

    expect(replaceMock).toHaveBeenCalledWith("/login")
    expect(screen.queryByText(CHILD_TEXT)).not.toBeInTheDocument()
    expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument()
    expect(screen.getByTestId("navbar")).toBeInTheDocument()
  })

  it("renders the navbar and children for a logged-in user", () => {
    useUserMock.mockReturnValue(loggedInState)
    render(<HeistsLayout>{CHILD_TEXT}</HeistsLayout>)

    expect(screen.getByTestId("navbar")).toBeInTheDocument()
    expect(screen.getByText(CHILD_TEXT)).toBeInTheDocument()
    expect(replaceMock).not.toHaveBeenCalled()
  })
})
