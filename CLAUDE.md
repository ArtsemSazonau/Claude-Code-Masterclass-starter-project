# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
npm run test     # Run Vitest in watch mode
npm run test -- run  # Single CI-style pass (no watch)
```

To run a single test file:
```bash
npx vitest run tests/components/Navbar.test.tsx
```

## Architecture

**Pocket Heist** is a Next.js (App Router) app for managing "tiny missions" with an office theme. It's a starter project for a Claude Code Masterclass.

**Stack:** Next.js 16, React 19, TypeScript 5 (strict), Tailwind CSS 4, Vitest + React Testing Library

### Route Structure

Uses Next.js route groups to separate layout hierarchies:
- `app/(public)/` — Unauthenticated routes (home splash, login, signup, preview)
- `app/(dashboard)/` — Authenticated routes (heists management, wrapped in Navbar layout)

The home page (`app/(public)/page.tsx`) acts as a router: logged-in users go to `/heists`, others to `/login`.

### Component Conventions

- Components live in `components/<Name>/` with three files: `Name.tsx`, `Name.module.css`, `index.ts` (barrel export)
- Tests mirror the component path under `tests/` (e.g., `tests/components/Navbar.test.tsx`)
- Path alias `@/*` maps to the repo root

### Styling

- Tailwind CSS 4 utilities for most styling; CSS Modules for component-scoped overrides
- Custom theme defined in `app/globals.css`:
  - Primary purple: `#C27AFF`
  - Secondary pink: `#FB64B6`
  - Dark background: `#030712`
  - Muted text: `#99A1AF`

## Additional Coding Preferences

- Use the `git switch -c` command to switch to new branch, not `git checkout`.
- Use minimal poject dependencies where possible.
