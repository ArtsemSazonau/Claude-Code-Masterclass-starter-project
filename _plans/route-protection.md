# Plan: Route Protection

Spec: [_specs/route-protection.md](../_specs/route-protection.md)
Branch: `claude/feature/route-protection`

## Context

Right now neither route group enforces auth state. A logged-out user can manually navigate to `/heists` and see protected UI flicker before any redirect (today there is no layout-level redirect at all — only the splash `/` page redirects in a `useEffect`). Conversely, a logged-in user can land back on `/login` or `/signup`.

We want both [app/(public)/layout.tsx](../app/(public)/layout.tsx) and [app/(dashboard)/layout.tsx](../app/(dashboard)/layout.tsx) to become the source of truth for auth gating, reading `useUser` from [lib/auth.tsx](../lib/auth.tsx). Until Firebase resolves the initial auth state (`isLoading: true`), each layout renders a centered `Spinner` in place of `{children}` so no unauthorized content flashes. Resolved Open Questions from the spec:

- `/preview` stays in the public group but must be reachable from **both** auth states — so the public-layout redirect needs a pathname exception.
- [app/(public)/page.tsx](../app/(public)/page.tsx) keeps its own `useEffect` redirect (harmless duplicate; both redirects agree on `/heists`).
- Loader renders inside the existing layout wrappers (`<main className="public">` and `<main>`), not as a full-page replacement.
- In the dashboard layout, the `<Navbar />` keeps rendering during the loading window — only the children slot swaps to the Spinner.

## Files to Modify

### 1. [app/(public)/layout.tsx](../app/(public)/layout.tsx)

- Add `"use client"` at the top.
- Import `useEffect` from `react`, `useRouter` and `usePathname` from `next/navigation`, `useUser` from `@/lib/auth`, and `Spinner` from `@/components/Spinner`.
- Read `{ isLoading, isLoggedIn }` from `useUser()` and `pathname` from `usePathname()`.
- In a `useEffect` depending on `[isLoading, isLoggedIn, pathname, router]`, redirect when `!isLoading && isLoggedIn && pathname !== "/preview"` → `router.replace("/heists")`.
- Compute `shouldGate = isLoading || (isLoggedIn && pathname !== "/preview")`.
- Keep the existing `<main className="public">` wrapper. Inside it render `<Spinner />` when `shouldGate` is true, otherwise `{children}`.

Reasoning: the `/preview` exception is needed because resolved Open Question 1 says preview must remain reachable while logged in. Computing `shouldGate` instead of a separate "loading" branch also prevents the brief frame between auth resolving and the `router.replace` taking effect from showing the wrong content.

### 2. [app/(dashboard)/layout.tsx](../app/(dashboard)/layout.tsx)

- Add `"use client"` at the top.
- Import `useEffect` from `react`, `useRouter` from `next/navigation`, `useUser` from `@/lib/auth`, and `Spinner` from `@/components/Spinner`. Keep the existing `Navbar` import.
- Read `{ isLoading, isLoggedIn }` from `useUser()`.
- In a `useEffect` depending on `[isLoading, isLoggedIn, router]`, redirect when `!isLoading && !isLoggedIn` → `router.replace("/login")`.
- Compute `shouldGate = isLoading || !isLoggedIn`.
- Keep the existing `<Navbar />` outside the gate. Inside `<main>` render `<Spinner />` when `shouldGate` is true, otherwise `{children}`.

Reasoning: this covers logout-from-dashboard for free — when [Navbar](../components/Navbar/Navbar.tsx) calls `signOut(auth)`, `useUser` flips to logged-out, the `useEffect` fires and redirects to `/login`. No change to Navbar needed.

### 3. No change needed to:

- [app/(public)/page.tsx](../app/(public)/page.tsx) — its own redirect stays per resolved Open Question 2; it just agrees with the layout redirect.
- [app/layout.tsx](../app/layout.tsx) — `AuthProvider` already wraps the whole tree, so `useUser` works in both layouts.
- [components/LoginForm](../components/LoginForm/LoginForm.tsx) — does no `router.push` on success today and doesn't need one: the public layout will redirect to `/heists` automatically once `isLoggedIn` flips.
- [components/SignupForm](../components/SignupForm/SignupForm.tsx) — already calls `router.replace("/heists")`; the layout would catch this anyway, but the explicit call stays as the primary path.
- [components/Spinner](../components/Spinner) — used as-is with default props.

## New Test Files

Follow the existing `vi.mock("@/lib/auth", ...)` / `vi.mock("next/navigation", ...)` pattern from [tests/components/Navbar.test.tsx](../tests/components/Navbar.test.tsx). Reuse the `loggedOutState` / `loadingState` / `loggedInState` fixture style.

### `tests/app/public-layout.test.tsx`

Import the default export from `app/(public)/layout.tsx`. Mock `useUser`, `useRouter` (capture `replace`), and `usePathname`.

Cases:
- `isLoading: true` → renders `<Spinner />`, does not render the test child, does not call `replace`.
- `isLoading: false, isLoggedIn: false`, pathname `/login` → renders test child, does not call `replace`.
- `isLoading: false, isLoggedIn: true`, pathname `/login` → calls `replace("/heists")` and renders the Spinner (not the child).
- `isLoading: false, isLoggedIn: true`, pathname `/preview` → renders test child, does **not** call `replace` (preview exception).
- `isLoading: false, isLoggedIn: false`, pathname `/preview` → renders test child, does not call `replace`.

### `tests/app/dashboard-layout.test.tsx`

Import the default export from `app/(dashboard)/layout.tsx`. Mock `useUser` and `useRouter` (capture `replace`). The layout imports `Navbar`, which transitively pulls Firebase — mock `@/components/Navbar` to a stub like `() => <nav data-testid="navbar" />` to keep the test focused (the existing Navbar already has its own test file).

Cases:
- `isLoading: true` → renders the navbar stub and the Spinner; does not render the test child; does not call `replace`.
- `isLoading: false, isLoggedIn: false` → calls `replace("/login")` and renders the Spinner (not the child); navbar still renders.
- `isLoading: false, isLoggedIn: true` → renders the navbar stub and the test child; does not call `replace`.

## Verification

1. `npm run test -- run` — both new test files pass alongside existing suite.
2. `npm run lint` — no new lint errors (the `"use client"` directive on the layouts is required for `useUser`/`useRouter`/`usePathname`).
3. Manual smoke (`npm run dev`) on the running app:
   - Logged out: visit `/heists` directly → brief spinner → redirect to `/login`.
   - Logged out: visit `/login`, `/signup`, `/preview` → each renders normally after a brief spinner.
   - Log in via `/login` → land on `/heists` (no flicker of `/login` after).
   - Logged in: visit `/login` directly → brief spinner → redirect to `/heists`.
   - Logged in: visit `/preview` → renders normally, no redirect (the exception).
   - From `/heists`, click logout in the navbar → redirected to `/login` automatically.
   - Hard refresh on `/heists` while logged in → spinner shows briefly, then page; never a flash of `/login` content.
