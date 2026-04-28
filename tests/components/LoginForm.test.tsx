import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import LoginForm from "@/components/LoginForm"

describe("LoginForm", () => {
  let logSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
  })

  afterEach(() => {
    logSpy.mockRestore()
  })

  it("renders email, password, and submit button", () => {
    render(<LoginForm />)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument()
  })

  it("logs the email and password to the console on submit", async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.type(screen.getByLabelText(/email/i), "alice@example.com")
    await user.type(screen.getByLabelText(/password/i), "password123")
    await user.click(screen.getByRole("button", { name: /log in/i }))

    expect(logSpy).toHaveBeenCalledWith("login", {
      email: "alice@example.com",
      password: "password123",
    })
  })

  it("does not log when required fields are empty", async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.click(screen.getByRole("button", { name: /log in/i }))

    expect(logSpy).not.toHaveBeenCalled()
  })

  it("renders a cross-link to /signup", () => {
    render(<LoginForm />)

    const link = screen.getByRole("link", { name: /sign up/i })
    expect(link).toHaveAttribute("href", "/signup")
  })
})
