import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

import Spinner from "@/components/Spinner"

describe("Spinner", () => {
  it("renders with the default accessible label", () => {
    render(<Spinner />)
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Loading")
  })

  it("uses a custom label when provided", () => {
    render(<Spinner label="Fetching heists" />)
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Fetching heists")
  })
})
