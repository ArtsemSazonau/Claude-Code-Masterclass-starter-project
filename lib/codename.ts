export const adjectives = [
  "Silent",
  "Crimson",
  "Ghost",
  "Hollow",
  "Neon",
  "Velvet",
  "Phantom",
  "Rogue",
  "Midnight",
  "Quiet",
  "Swift",
  "Brazen",
  "Frozen",
  "Restless",
  "Vivid",
] as const

export const colours = [
  "Amber",
  "Cobalt",
  "Obsidian",
  "Scarlet",
  "Indigo",
  "Onyx",
  "Ivory",
  "Jade",
  "Saffron",
  "Plum",
  "Slate",
  "Copper",
  "Pearl",
  "Bronze",
  "Lilac",
] as const

export const animals = [
  "Fox",
  "Raven",
  "Cobra",
  "Lynx",
  "Viper",
  "Wolf",
  "Falcon",
  "Panther",
  "Otter",
  "Heron",
  "Stag",
  "Mantis",
  "Jackal",
  "Magpie",
  "Hawk",
] as const

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function generateCodename(): string {
  return `${pick(adjectives)}${pick(colours)}${pick(animals)}`
}
