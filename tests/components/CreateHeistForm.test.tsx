import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"

const getDocs = vi.fn()
const addDoc = vi.fn()
const collection = vi.fn((_db: unknown, name: string) => ({ name }))
const serverTimestampSentinel = { __serverTimestamp: true }
const serverTimestamp = vi.fn(() => serverTimestampSentinel)
const timestampFromDate = vi.fn((date: Date) => ({ __timestamp: true, date }))
const replaceMock = vi.fn()

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) =>
    collection(...(args as [unknown, string])),
  getDocs: (...args: unknown[]) => getDocs(...args),
  addDoc: (...args: unknown[]) => addDoc(...args),
  serverTimestamp: () => serverTimestamp(),
  Timestamp: {
    fromDate: (date: Date) => timestampFromDate(date),
  },
}))

vi.mock("@/lib/firebase", () => ({
  auth: {},
  db: {},
}))

const useUserMock = vi.fn()
vi.mock("@/lib/auth", () => ({
  useUser: () => useUserMock(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}))

import CreateHeistForm from "@/components/CreateHeistForm"

function makeDocs(members: { id: string; codename: string }[]) {
  return {
    docs: members.map((m) => ({
      id: m.id,
      data: () => ({ id: m.id, codename: m.codename }),
    })),
  }
}

const defaultCrew = [
  { id: "u1", codename: "SilentCrimsonFox" },
  { id: "u2", codename: "BoldAzureBadger" },
  { id: "u3", codename: "QuickEmeraldOtter" },
]

beforeEach(() => {
  getDocs.mockReset()
  addDoc.mockReset()
  collection.mockClear()
  serverTimestamp.mockClear()
  timestampFromDate.mockClear()
  replaceMock.mockReset()
  useUserMock.mockReset()

  getDocs.mockResolvedValue(makeDocs(defaultCrew))
  addDoc.mockResolvedValue({ id: "new-heist-id" })
  useUserMock.mockReturnValue({
    uid: "u1",
    user: { displayName: "SilentCrimsonFox" },
    isLoading: false,
    isLoggedIn: true,
    email: null,
  })
})

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/title/i), "Operation Stapler")
  await user.type(
    screen.getByLabelText(/description/i),
    "Liberate one Swingline from the third-floor cubicle.",
  )
  await user.selectOptions(screen.getByLabelText(/assign to/i), "u2")
}

describe("CreateHeistForm", () => {
  it("renders title, description, assignee, and submit button once crew loads", async () => {
    render(<CreateHeistForm />)

    expect(await screen.findByLabelText(/title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/assign to/i)).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /brief the heist/i }),
    ).toBeInTheDocument()
  })

  it("fetches the users collection on mount and lists codenames alphabetically", async () => {
    render(<CreateHeistForm />)

    await screen.findByLabelText(/assign to/i)

    expect(collection).toHaveBeenCalledWith(expect.anything(), "users")
    expect(getDocs).toHaveBeenCalledWith({ name: "users" })

    const select = screen.getByLabelText(/assign to/i) as HTMLSelectElement
    const codenames = Array.from(select.options)
      .map((o) => o.textContent ?? "")
      .filter((t) => !t.toLowerCase().includes("pick"))
    expect(codenames).toEqual([
      "BoldAzureBadger",
      "QuickEmeraldOtter",
      "SilentCrimsonFox",
    ])
  })

  it("renders an empty-state message when the users collection is empty", async () => {
    getDocs.mockResolvedValueOnce(makeDocs([]))
    render(<CreateHeistForm />)

    expect(
      await screen.findByText(/no crew available/i),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText(/title/i)).not.toBeInTheDocument()
  })

  it("renders an error and no form when the crew fetch fails", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    getDocs.mockRejectedValueOnce(new Error("network"))
    render(<CreateHeistForm />)

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /couldn't load the crew/i,
    )
    expect(screen.queryByLabelText(/title/i)).not.toBeInTheDocument()
    errSpy.mockRestore()
  })

  it("does not call addDoc when title is empty", async () => {
    const user = userEvent.setup()
    render(<CreateHeistForm />)
    await screen.findByLabelText(/title/i)

    await user.type(
      screen.getByLabelText(/description/i),
      "Some description text",
    )
    await user.selectOptions(screen.getByLabelText(/assign to/i), "u2")
    await user.click(screen.getByRole("button", { name: /brief the heist/i }))

    expect(addDoc).not.toHaveBeenCalled()
  })

  it("does not call addDoc when description is empty", async () => {
    const user = userEvent.setup()
    render(<CreateHeistForm />)
    await screen.findByLabelText(/title/i)

    await user.type(screen.getByLabelText(/title/i), "Operation Stapler")
    await user.selectOptions(screen.getByLabelText(/assign to/i), "u2")
    await user.click(screen.getByRole("button", { name: /brief the heist/i }))

    expect(addDoc).not.toHaveBeenCalled()
  })

  it("does not call addDoc when no assignee is selected", async () => {
    const user = userEvent.setup()
    render(<CreateHeistForm />)
    await screen.findByLabelText(/title/i)

    await user.type(screen.getByLabelText(/title/i), "Operation Stapler")
    await user.type(
      screen.getByLabelText(/description/i),
      "Some description text",
    )
    await user.click(screen.getByRole("button", { name: /brief the heist/i }))

    expect(addDoc).not.toHaveBeenCalled()
  })

  it("writes a heist with the expected payload on valid submit", async () => {
    const user = userEvent.setup()
    render(<CreateHeistForm />)
    await screen.findByLabelText(/title/i)

    await fillValidForm(user)
    await user.click(screen.getByRole("button", { name: /brief the heist/i }))

    await waitFor(() => expect(addDoc).toHaveBeenCalledTimes(1))

    const [ref, payload] = addDoc.mock.calls[0]
    expect(ref).toEqual({ name: "heists" })
    expect(payload).toMatchObject({
      title: "Operation Stapler",
      description: "Liberate one Swingline from the third-floor cubicle.",
      createdBy: "u1",
      createdByCodename: "SilentCrimsonFox",
      assignedTo: "u2",
      assignedToCodename: "BoldAzureBadger",
      createdAt: serverTimestampSentinel,
      finalStatus: null,
    })
    expect(payload.deadline).toMatchObject({ __timestamp: true })
    const deadlineDate = (payload.deadline as { date: Date }).date
    const deltaMs = deadlineDate.getTime() - Date.now()
    expect(deltaMs).toBeGreaterThan(47 * 60 * 60 * 1000)
    expect(deltaMs).toBeLessThan(49 * 60 * 60 * 1000)
  })

  it("redirects to /heists on a successful submit", async () => {
    const user = userEvent.setup()
    render(<CreateHeistForm />)
    await screen.findByLabelText(/title/i)

    await fillValidForm(user)
    await user.click(screen.getByRole("button", { name: /brief the heist/i }))

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/heists"))
  })

  it("disables the submit button while the create request is in flight", async () => {
    addDoc.mockImplementationOnce(() => new Promise(() => {}))
    const user = userEvent.setup()
    render(<CreateHeistForm />)
    await screen.findByLabelText(/title/i)

    await fillValidForm(user)
    await user.click(screen.getByRole("button", { name: /brief the heist/i }))

    const button = await screen.findByRole("button", {
      name: /briefing the crew/i,
    })
    expect(button).toBeDisabled()
  })

  it("shows an inline error and stays on the page when addDoc rejects", async () => {
    addDoc.mockRejectedValueOnce({ code: "permission-denied" })
    const user = userEvent.setup()
    render(<CreateHeistForm />)
    await screen.findByLabelText(/title/i)

    await fillValidForm(user)
    await user.click(screen.getByRole("button", { name: /brief the heist/i }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /don't have permission/i,
    )
    expect(replaceMock).not.toHaveBeenCalled()
  })
})
