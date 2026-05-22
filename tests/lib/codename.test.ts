import { describe, it, expect } from "vitest"
import { adjectives, animals, colours, generateCodename } from "@/lib/codename"

describe("generateCodename", () => {
  it("returns a non-empty string with no whitespace or punctuation", () => {
    const codename = generateCodename()
    expect(codename.length).toBeGreaterThan(0)
    expect(codename).toMatch(/^[A-Za-z]+$/)
  })

  it("is composed of one adjective, one colour, and one animal in that order", () => {
    for (let i = 0; i < 20; i++) {
      const codename = generateCodename()
      const adjective = adjectives.find((w) => codename.startsWith(w))
      expect(adjective, `no adjective prefix in ${codename}`).toBeDefined()

      const afterAdj = codename.slice(adjective!.length)
      const colour = colours.find((w) => afterAdj.startsWith(w))
      expect(colour, `no colour after adjective in ${codename}`).toBeDefined()

      const afterColour = afterAdj.slice(colour!.length)
      expect(animals).toContain(afterColour)
    }
  })

  it("does not always return the same value", () => {
    const results = new Set<string>()
    for (let i = 0; i < 50; i++) {
      results.add(generateCodename())
    }
    expect(results.size).toBeGreaterThan(1)
  })
})
