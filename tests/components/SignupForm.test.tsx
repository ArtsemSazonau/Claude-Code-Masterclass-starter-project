import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import SignupForm from "@/components/SignupForm"

describe("SignupForm", () => {
  let logSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
  })

  afterEach(() => {
    logSpy.mockRestore()
  })

  it("renders email, password, confirm-password, and submit button", () => {
    render(<SignupForm />)

    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /sign up/i })).toBeInTheDocument()
  })

  it("logs email and password on submit when passwords match", async () => {
    const user = userEvent.setup()
    render(<SignupForm />)

    await user.type(screen.getByLabelText(/^email$/i), "alice@example.com")
    await user.type(screen.getByLabelText(/^password$/i), "password123")
    await user.type(screen.getByLabelText(/confirm password/i), "password123")
    await user.click(screen.getByRole("button", { name: /sign up/i }))

    expect(logSpy).toHaveBeenCalledWith("signup", {
      email: "alice@example.com",
      password: "password123",
    })
  })

  it("blocks submission and sets a custom validity message when passwords do not match", async () => {
    const user = userEvent.setup()
    render(<SignupForm />)

    await user.type(screen.getByLabelText(/^email$/i), "alice@example.com")
    await user.type(screen.getByLabelText(/^password$/i), "password123")
    const confirmInput = screen.getByLabelText(/confirm password/i) as HTMLInputElement
    await user.type(confirmInput, "different456")
    await user.click(screen.getByRole("button", { name: /sign up/i }))

    expect(confirmInput.validationMessage).toBe("Passwords do not match")
    expect(logSpy).not.toHaveBeenCalled()
  })

  it("renders a cross-link to /login", () => {
    render(<SignupForm />)

    const link = screen.getByRole("link", { name: /log in/i })
    expect(link).toHaveAttribute("href", "/login")
  })
})
