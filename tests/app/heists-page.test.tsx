import { render, screen, within } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import type { Heist } from "@/types/firestore"
import type { HeistMode, UseHeistsResult } from "@/lib/useHeists"

const useHeistsMock = vi.fn<(mode: HeistMode) => UseHeistsResult>()

vi.mock("@/lib/useHeists", () => ({
  useHeists: (mode: HeistMode) => useHeistsMock(mode),
}))

import HeistsPage from "@/app/(dashboard)/heists/page"

function heist(id: string, title: string): Heist {
  return {
    id,
    title,
    description: "",
    createdBy: "u1",
    createdByCodename: "",
    assignedTo: "u2",
    assignedToCodename: "",
    createdAt: new Date(),
    deadline: new Date(),
    finalStatus: null,
  }
}

function ok(heists: Heist[]): UseHeistsResult {
  return { heists, loading: false, error: null }
}

function sectionFor(heading: RegExp): HTMLElement {
  return screen.getByRole("heading", { name: heading }).parentElement as HTMLElement
}

beforeEach(() => {
  useHeistsMock.mockReset()
})

describe("HeistsPage", () => {
  it("renders titles under the correct section heading for each mode", () => {
    useHeistsMock.mockImplementation((mode) => {
      if (mode === "active") return ok([heist("a1", "Active Alpha"), heist("a2", "Active Beta")])
      if (mode === "assigned") return ok([heist("b1", "Assigned One")])
      return ok([heist("c1", "Expired Old"), heist("c2", "Expired Older")])
    })

    render(<HeistsPage />)

    const active = sectionFor(/your active heists/i)
    expect(within(active).getByText("Active Alpha")).toBeInTheDocument()
    expect(within(active).getByText("Active Beta")).toBeInTheDocument()

    const assigned = sectionFor(/heists you've assigned/i)
    expect(within(assigned).getByText("Assigned One")).toBeInTheDocument()

    const expired = sectionFor(/all expired heists/i)
    expect(within(expired).getByText("Expired Old")).toBeInTheDocument()
    expect(within(expired).getByText("Expired Older")).toBeInTheDocument()
  })

  it("renders all three section headings even when every hook returns an empty array", () => {
    useHeistsMock.mockReturnValue(ok([]))

    render(<HeistsPage />)

    expect(screen.getByRole("heading", { name: /your active heists/i })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /heists you've assigned/i })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /all expired heists/i })).toBeInTheDocument()
  })

  it("renders an error message under a section when the hook surfaces an error", () => {
    useHeistsMock.mockImplementation((mode) => {
      if (mode === "active") return { heists: [], loading: false, error: new Error("nope, missing index") }
      return ok([])
    })

    render(<HeistsPage />)

    const active = sectionFor(/your active heists/i)
    const alert = within(active).getByRole("alert")
    expect(alert).toHaveTextContent("nope, missing index")
  })
})
