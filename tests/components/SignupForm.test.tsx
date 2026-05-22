import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"

const createUserWithEmailAndPassword = vi.fn()
const updateProfile = vi.fn()
const setDoc = vi.fn()
const doc = vi.fn((_db: unknown, col: string, id: string) => ({ col, id }))
const replaceMock = vi.fn()

vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: (...args: unknown[]) =>
    createUserWithEmailAndPassword(...args),
  updateProfile: (...args: unknown[]) => updateProfile(...args),
}))

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => doc(...(args as [unknown, string, string])),
  setDoc: (...args: unknown[]) => setDoc(...args),
}))

vi.mock("@/lib/firebase", () => ({
  auth: {},
  db: {},
}))

vi.mock("@/lib/codename", () => ({
  generateCodename: () => "TestCobaltFox",
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}))

import SignupForm from "@/components/SignupForm"

const fakeUser = { uid: "user-abc" }

beforeEach(() => {
  createUserWithEmailAndPassword.mockReset()
  updateProfile.mockReset()
  setDoc.mockReset()
  doc.mockClear()
  replaceMock.mockReset()
  createUserWithEmailAndPassword.mockResolvedValue({ user: fakeUser })
  updateProfile.mockResolvedValue(undefined)
  setDoc.mockResolvedValue(undefined)
})

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  {
    email = "alice@example.com",
    password = "password123",
    confirm = "password123",
  }: { email?: string; password?: string; confirm?: string } = {},
) {
  await user.type(screen.getByLabelText(/^email$/i), email)
  await user.type(screen.getByLabelText(/^password$/i), password)
  await user.type(screen.getByLabelText(/confirm password/i), confirm)
  await user.click(screen.getByRole("button", { name: /sign up/i }))
}

describe("SignupForm", () => {
  it("renders email, password, confirm-password, and submit button", () => {
    render(<SignupForm />)

    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /sign up/i })).toBeInTheDocument()
  })

  it("calls createUserWithEmailAndPassword with the entered email and password", async () => {
    const user = userEvent.setup()
    render(<SignupForm />)

    await fillAndSubmit(user)

    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      "alice@example.com",
      "password123",
    )
  })

  it("sets displayName to the generated codename on success", async () => {
    const user = userEvent.setup()
    render(<SignupForm />)

    await fillAndSubmit(user)

    expect(updateProfile).toHaveBeenCalledWith(fakeUser, { displayName: "TestCobaltFox" })
  })

  it("writes a users document with id and codename (no email) on success", async () => {
    const user = userEvent.setup()
    render(<SignupForm />)

    await fillAndSubmit(user)

    expect(doc).toHaveBeenCalledWith(expect.anything(), "users", "user-abc")
    expect(setDoc).toHaveBeenCalledWith(
      { col: "users", id: "user-abc" },
      { id: "user-abc", codename: "TestCobaltFox" },
    )
  })

  it("redirects to /heists on success", async () => {
    const user = userEvent.setup()
    render(<SignupForm />)

    await fillAndSubmit(user)

    expect(replaceMock).toHaveBeenCalledWith("/heists")
  })

  it("still redirects when the firestore write fails", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    setDoc.mockRejectedValueOnce(new Error("permission-denied"))
    const user = userEvent.setup()
    render(<SignupForm />)

    await fillAndSubmit(user)

    expect(replaceMock).toHaveBeenCalledWith("/heists")
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })

  it("shows a friendly message when the email is already in use", async () => {
    createUserWithEmailAndPassword.mockRejectedValueOnce({ code: "auth/email-already-in-use" })
    const user = userEvent.setup()
    render(<SignupForm />)

    await fillAndSubmit(user)

    expect(screen.getByRole("alert")).toHaveTextContent(/already registered/i)
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it("shows a friendly message when the password is too weak", async () => {
    createUserWithEmailAndPassword.mockRejectedValueOnce({ code: "auth/weak-password" })
    const user = userEvent.setup()
    render(<SignupForm />)

    await fillAndSubmit(user)

    expect(screen.getByRole("alert")).toHaveTextContent(/too weak/i)
  })

  it("disables the submit button while the request is in flight", async () => {
    createUserWithEmailAndPassword.mockImplementationOnce(() => new Promise(() => {}))
    const user = userEvent.setup()
    render(<SignupForm />)

    await fillAndSubmit(user)

    const button = screen.getByRole("button", { name: /signing up/i })
    expect(button).toBeDisabled()
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
    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled()
  })

  it("renders a cross-link to /login", () => {
    render(<SignupForm />)

    const link = screen.getByRole("link", { name: /log in/i })
    expect(link).toHaveAttribute("href", "/login")
  })
})
