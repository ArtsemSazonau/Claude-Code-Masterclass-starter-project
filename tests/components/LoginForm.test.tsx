import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"

const signInWithEmailAndPassword = vi.fn()
const replaceMock = vi.fn()
const pushMock = vi.fn()

vi.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: (...args: unknown[]) =>
    signInWithEmailAndPassword(...args),
}))

vi.mock("@/lib/firebase", () => ({
  auth: {},
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
}))

import LoginForm from "@/components/LoginForm"

beforeEach(() => {
  signInWithEmailAndPassword.mockReset()
  replaceMock.mockReset()
  pushMock.mockReset()
  signInWithEmailAndPassword.mockResolvedValue({ user: { uid: "user-abc" } })
})

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  {
    email = "alice@example.com",
    password = "password123",
  }: { email?: string; password?: string } = {},
) {
  await user.type(screen.getByLabelText(/email/i), email)
  await user.type(screen.getByLabelText(/password/i), password)
  await user.click(screen.getByRole("button", { name: /log in/i }))
}

describe("LoginForm", () => {
  it("renders email, password, and submit button", () => {
    render(<LoginForm />)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument()
  })

  it("calls signInWithEmailAndPassword with the entered email and password", async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await fillAndSubmit(user)

    expect(signInWithEmailAndPassword).toHaveBeenCalledTimes(1)
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      "alice@example.com",
      "password123",
    )
  })

  it("shows the success message and removes the form on successful login", async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await fillAndSubmit(user)

    expect(screen.getByRole("status")).toHaveTextContent(/you are logged in/i)
    expect(screen.queryByRole("button", { name: /log in/i })).not.toBeInTheDocument()
  })

  it("does not redirect after a successful login", async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await fillAndSubmit(user)

    expect(replaceMock).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it("disables the submit button and shows the loading label while the request is in flight", async () => {
    signInWithEmailAndPassword.mockImplementationOnce(() => new Promise(() => {}))
    const user = userEvent.setup()
    render(<LoginForm />)

    await fillAndSubmit(user)

    const button = screen.getByRole("button", { name: /logging in/i })
    expect(button).toBeDisabled()
  })

  it("shows a friendly error and keeps the form interactive on invalid credentials", async () => {
    signInWithEmailAndPassword.mockRejectedValueOnce({ code: "auth/invalid-credential" })
    const user = userEvent.setup()
    render(<LoginForm />)

    await fillAndSubmit(user)

    expect(screen.getByRole("alert")).toHaveTextContent(/invalid email or password/i)
    expect(screen.getByRole("button", { name: /log in/i })).toBeEnabled()
  })

  it("falls back to a generic message on unknown errors", async () => {
    signInWithEmailAndPassword.mockRejectedValueOnce({ code: "auth/something-weird" })
    const user = userEvent.setup()
    render(<LoginForm />)

    await fillAndSubmit(user)

    expect(screen.getByRole("alert")).toHaveTextContent(/something went wrong/i)
    expect(screen.getByRole("button", { name: /log in/i })).toBeEnabled()
  })

  it("renders a cross-link to /signup", () => {
    render(<LoginForm />)

    const link = screen.getByRole("link", { name: /sign up/i })
    expect(link).toHaveAttribute("href", "/signup")
  })

  it("focuses the email input on mount", () => {
    render(<LoginForm />)

    expect(screen.getByLabelText(/email/i)).toHaveFocus()
  })
})
