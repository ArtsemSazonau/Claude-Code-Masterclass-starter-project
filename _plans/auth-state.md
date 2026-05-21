# Plan: Auth State (useUser hook + AuthProvider)

## Context

The Firebase web SDK is already initialised in [`lib/firebase.ts`](lib/firebase.ts) and exports a singleton `auth` instance, but no React-side glue exists. Today the app has no notion of "the current user": [`app/(public)/page.tsx`](app/(public)/page.tsx) has a TODO comment about redirecting based on login state but doesn't do it, and the Navbar / heists pages render the same content regardless of who's signed in.

This plan implements the spec at `_specs/auth-state.md`: a single React Context provider subscribed once to Firebase's `onAuthStateChanged`, plus a `useUser()` hook that any client component can call. The hook returns `{ user, isLoading, isLoggedIn, uid, email }`. As a small consumer, the splash page at `/` is rewired to redirect on resolve.

Sign-in / sign-up / sign-out flows are explicitly **out of scope** — only the listener, the hook, and the splash-page redirect.

Locked design choices from the spec's inline answers:
- Location: single file at `lib/auth.tsx`
- Return shape: object `{ user, isLoading, isLoggedIn, uid, email }`
- State impl: React Context (no Zustand, no module-level store)
- Provider mounted in root `app/layout.tsx`
- Loading state: a reusable `<Spinner />` component (new)
- Testing: mock `firebase/auth` per test (matches existing test conventions)
- Route gating: client-side only (no Next.js middleware in this PR)

## File-by-file changes

### New: `lib/auth.tsx`
- First line: `"use client"`.
- Imports: `createContext`, `useContext`, `useEffect`, `useState`, `useMemo`, `type ReactNode` from `react`; `onAuthStateChanged`, `type User` from `firebase/auth`; `auth` from `@/lib/firebase`.
- Internal type `AuthContextValue = { user: User | null; isLoading: boolean; isLoggedIn: boolean; uid: string | null; email: string | null }`.
- `AuthContext = createContext<AuthContextValue | undefined>(undefined)` — `undefined` default so `useUser` outside the provider throws.
- `AuthProvider({ children }: { children: ReactNode })` — keeps state `{ user, isLoading }` starting at `{ null, true }`. Single `useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); setIsLoading(false); }), [])` — returns the unsubscribe directly. Memo the context value with `useMemo` so derived fields are stable references.
- `useUser()` — `const ctx = useContext(AuthContext); if (!ctx) throw new Error("useUser must be used inside <AuthProvider>"); return ctx;`
- Only `AuthProvider` and `useUser` are exported. The internal type and context stay private.

### New: `components/Spinner/Spinner.tsx`
- Follows the `components/<Name>/` convention used by `Avatar`, `Navbar`, `Skeleton`.
- Plain server-safe SFC — no state, no `"use client"`.
- Accepts optional `size` (default 32) and `label` (default `"Loading"`, used for `aria-label`).
- Renders a `<div role="status" aria-label={label}>` containing an inline SVG circle that spins via `animate-spin`.
- Uses `text-primary` for the active arc and `text-body` for the track.

### New: `components/Spinner/Spinner.module.css`
- `@reference "../../app/globals.css";`
- `.center` helper class: `@apply flex items-center justify-center;` so callers can drop the spinner into a centered region without re-rolling utility classes.

### New: `components/Spinner/index.ts`
- One line: `export { default } from "./Spinner"`.

### Modified: `app/layout.tsx`
- Stays a server component (keeps `export const metadata`).
- Add `import { AuthProvider } from "@/lib/auth"`.
- Wrap `{children}` inside `<body>`: `<body><AuthProvider>{children}</AuthProvider></body>`.
- That's it — server components are allowed to render client components, so the file itself doesn't need `"use client"`.

### Modified: `app/(public)/page.tsx`
- Add `"use client"` at the top.
- Replace current body with: read `useUser()` → `{ isLoading, isLoggedIn }`; use `useRouter()` from `next/navigation`; `useEffect(() => { if (isLoading) return; router.replace(isLoggedIn ? "/heists" : "/login"); }, [isLoading, isLoggedIn, router])`.
- Always render the existing splash markup (logo + tagline) with the new `<Spinner />` centered beneath it — this is the brief view the user sees before the redirect lands.
- Drop the "// this page should be used only as a splash page..." comment since the redirect logic now embodies it.

### New: `tests/lib/auth.test.tsx`
Vitest + RTL. Top of file uses `vi.mock("firebase/auth", ...)` to stub `onAuthStateChanged` with a controllable fake, and `vi.mock("@/lib/firebase", () => ({ auth: {} }))` so importing `lib/auth.tsx` doesn't pull the real SDK. The fake stores the callback so each test can drive it. Cases:
- Initial render: `useUser()` returns `{ user: null, isLoading: true, isLoggedIn: false, uid: null, email: null }`.
- After the fake fires a `User`-shaped object: hook returns that user, `isLoading: false`, `isLoggedIn: true`, `uid`/`email` populated.
- After the fake fires `null`: hook returns `isLoading: false`, `isLoggedIn: false`.
- Calling `useUser()` outside `<AuthProvider>` throws with message matching `/must be used inside/i`. Use `expect(() => render(<Probe />)).toThrow(...)` with a silenced console.
- Two `<Probe />` consumers under one provider → `onAuthStateChanged` mock is called exactly once.
- Unmounting the provider invokes the unsubscribe function the mock returned.

### New: `tests/components/Spinner.test.tsx`
One smoke test: renders, has `role="status"`, exposes the default accessible label `"Loading"`, and a custom `label` prop is reflected on the root.

## Conventions reused

- Existing path alias `@/*` (tsconfig.json).
- Existing `auth` export from `lib/firebase.ts` — no new Firebase initialisation.
- Component folder pattern (`Name.tsx` + `Name.module.css` + `index.ts`) mirroring `Avatar/`, `Navbar/`, `Skeleton/`.
- Existing test pattern: vitest globals, `@testing-library/react`, `@testing-library/jest-dom/vitest` (already in `vitest.setup.ts`), `vi.mock` / `vi.spyOn` (precedent in `LoginForm.test.tsx`).
- Tailwind utilities (`animate-spin`, `text-primary`, `text-body`) — all already valid in this project's `@theme` block.

## Critical files

- `lib/auth.tsx` (new) — the heart of the change
- `app/layout.tsx` (modify) — single-line wrap
- `app/(public)/page.tsx` (modify) — first real consumer
- `components/Spinner/Spinner.tsx` (new)
- `tests/lib/auth.test.tsx` (new)
- `tests/components/Spinner.test.tsx` (new)

## Risks & accepted trade-offs

1. **Server-component boundary** — `app/layout.tsx` stays server; `AuthProvider` is a client component imported into it. This works in App Router but the boundary must not move — if we ever inline the provider's logic into `layout.tsx` directly, `export const metadata` will break.
2. **Context re-renders all consumers on every user change** — acceptable because user changes are infrequent (sign-in / sign-out / token refresh). Can split into two contexts later if consumer count grows.
3. **Splash flash** — the `/` page renders the splash + spinner for one frame before redirecting. Acceptable as the "simple spinner" answer requested.
4. **Strict-mode double-mount** — `onAuthStateChanged` returns a real unsubscribe and the `useEffect` cleanup calls it, so the second mount just re-subscribes. No leaks.
5. **Module-mock leakage between tests** — the `firebase/auth` mock state must reset between tests; the test file uses `beforeEach` to clear stored callbacks and re-prime the mock.

## Verification

1. `npm run lint` — passes.
2. `npx vitest run tests/lib/auth.test.tsx tests/components/Spinner.test.tsx` — new tests pass.
3. `npx vitest run` — existing 13 tests still pass (no regressions).
4. `npm run build` — type-checks cleanly (validates the server → client boundary).
5. `npm run dev`, then manually:
   - Visit `/` with no Firebase session → splash + spinner briefly, then routes to `/login` client-side (no full document reload).
   - Sign in via the Firebase console (or a temporary one-off call) → revisit `/` → redirects to `/heists`.
   - Confirm via React DevTools that exactly one `onAuthStateChanged` subscription exists no matter how many `useUser()` consumers mount.
