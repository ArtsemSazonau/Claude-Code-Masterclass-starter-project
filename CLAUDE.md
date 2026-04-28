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

## Project Structure

```
app/
  (public)/          # Unauthenticated routes (login, signup, preview, home splash)
  (dashboard)/       # Authenticated routes (heists)
  globals.css        # Tailwind theme tokens + global utility classes
components/          # UI components — one folder per component
tests/
  components/        # Vitest + RTL tests, mirroring components/
_specs/              # Feature specs (written before implementation)
  template.md        # Spec template to copy for new features
_plans/              # Implementation plans (generated during planning)
.claude/
  commands/          # Custom slash commands (/spec-v1, /component, /commit-message-v1, etc.)
  settings.json      # Permissions + PostToolUse hooks
```

## Spec-Driven Development

New features follow a spec → plan → implement workflow driven by custom slash commands:

1. **`/spec-v1 <idea>`** — turns a plain-English idea into a markdown spec file in `_specs/` and creates a `claude/feature/<name>` branch. Answer the Open Questions inline in the spec file before planning.
2. **`/plan`** (or enter Plan Mode) — reads the spec and writes a file-by-file implementation plan to `_plans/`. Review and approve the plan before proceeding.
3. **Implement** — execute the approved plan. Use `/component` for new UI components (TDD: tests first).
4. **`/commit-message-v1`** — generates a commit message from staged changes; waits for confirmation before committing.

Specs live in `_specs/<feature-slug>.md` and follow the structure in `_specs/template.md` (Summary, Edge Cases, Acceptance Criteria, Open Questions, Testing Guidelines). Plans live in `_plans/<feature-slug>.md`.

## Architecture

**Pocket Heist** is a Next.js (App Router) app for managing "tiny missions" with an office theme. It's a starter project for a Claude Code Masterclass.

**Stack:** Next.js 16, React 19, TypeScript 5 (strict), Tailwind CSS 4, Vitest + React Testing Library

### Route Structure

Uses Next.js route groups to separate layout hierarchies:
- `app/(public)/` — Unauthenticated routes (home splash, login, signup, preview). Wrapped in `<main className="public">`.
- `app/(dashboard)/` — Authenticated routes (heists management). Wrapped in `<Navbar />` + `<main>`.

The home page (`app/(public)/page.tsx`) acts as a router: logged-in users go to `/heists`, others to `/login`.

### Component Conventions

- Components live in `components/<Name>/` with three files: `Name.tsx`, `Name.module.css`, `index.ts` (barrel export).
- Tests mirror the component path under `tests/` (e.g. `tests/components/Navbar.test.tsx`).
- Path alias `@/*` maps to the repo root.
- Components that use React state or hooks must include `"use client"` as the first line.

### Styling

- Tailwind CSS 4 utilities for most styling; CSS Modules for component-scoped overrides.
- Every CSS module must start with `@reference "../../app/globals.css";` to access theme tokens.
- Custom theme defined in `app/globals.css` (`@theme` block):
  - `bg-primary` / `text-primary` → `#C27AFF` (purple)
  - `bg-secondary` / `text-secondary` → `#FB64B6` (pink)
  - `bg-dark` → `#030712`, `bg-light` → `#0A101D`, `bg-lighter` → `#101828`
  - `text-heading` → white, `text-body` → `#99A1AF`, `text-error` → `#FF6467`
- Reusable global classes in `globals.css`: `.btn`, `.page-content`, `.center-content`, `.form-title`.

## Additional Coding Preferences

- Use the `git switch -c` command to switch to a new branch, not `git checkout`.
- Use minimal project dependencies where possible.
- A PostToolUse hook auto-runs Prettier on any `.ts`/`.tsx` file after Write or Edit — do not manually reformat these files.
