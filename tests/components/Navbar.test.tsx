import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"

const useUserMock = vi.fn()
const signOutMock = vi.fn()

vi.mock("@/lib/auth", () => ({
  useUser: () => useUserMock(),
}))

vi.mock("firebase/auth", () => ({
  signOut: (...args: unknown[]) => signOutMock(...args),
}))

vi.mock("@/lib/firebase", () => ({
  auth: { __mock: "auth" },
}))

import Navbar from "@/components/Navbar"
import { auth as mockedAuth } from "@/lib/firebase"

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

beforeEach(() => {
  useUserMock.mockReset()
  signOutMock.mockReset()
  useUserMock.mockReturnValue(loggedOutState)
  signOutMock.mockResolvedValue(undefined)
})

describe("Navbar", () => {
  it("renders the main heading", () => {
    render(<Navbar />)

    const heading = screen.getByRole("heading", { level: 1 })
    expect(heading).toBeInTheDocument()
  })

  it("renders the Create Heist link", () => {
    render(<Navbar />)

    const createLink = screen.getByRole("link", { name: /create heist/i })
    expect(createLink).toBeInTheDocument()
    expect(createLink).toHaveAttribute("href", "/heists/create")
  })

  it("does not render the Logout button when the user is logged out", () => {
    render(<Navbar />)

    expect(screen.queryByRole("button", { name: /logout/i })).not.toBeInTheDocument()
  })

  it("does not render the Logout button while auth is loading", () => {
    useUserMock.mockReturnValue(loadingState)
    render(<Navbar />)

    expect(screen.queryByRole("button", { name: /logout/i })).not.toBeInTheDocument()
  })

  it("renders the Logout button when the user is logged in", () => {
    useUserMock.mockReturnValue(loggedInState)
    render(<Navbar />)

    const logoutButton = screen.getByRole("button", { name: /logout/i })
    expect(logoutButton).toBeInTheDocument()
    expect(logoutButton.tagName).toBe("BUTTON")
  })

  it("places the Logout button before the Create Heist link in DOM order", () => {
    useUserMock.mockReturnValue(loggedInState)
    render(<Navbar />)

    const logoutButton = screen.getByRole("button", { name: /logout/i })
    const createLink = screen.getByRole("link", { name: /create heist/i })

    const position = logoutButton.compareDocumentPosition(createLink)
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("calls signOut with the firebase auth instance exactly once when Logout is clicked", async () => {
    useUserMock.mockReturnValue(loggedInState)
    const user = userEvent.setup()
    render(<Navbar />)

    await user.click(screen.getByRole("button", { name: /logout/i }))

    expect(signOutMock).toHaveBeenCalledTimes(1)
    expect(signOutMock).toHaveBeenCalledWith(mockedAuth)
  })
})
