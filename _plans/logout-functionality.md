# Plan: Logout Functionality

## Context

The [Navbar](../components/Navbar/Navbar.tsx) currently renders only a "Create Heist" CTA and has no auth-aware UI. Now that Firebase auth is wired up (signup writes a user, `AuthProvider` is mounted in [app/layout.tsx](../app/layout.tsx), and `useUser()` exposes `isLoggedIn` / `isLoading`), we need a way for authenticated users to sign back out.

Per the answered Open Questions in [_specs/logout-functionality.md](../_specs/logout-functionality.md):
- Text-only button (no `lucide-react` icon).
- Solid **darker** red — not the existing `text-error` token (`#FF6467`), which is too light.
- No transient "Signing out…" state — button stays static.
- No redirect; `onAuthStateChanged` in `AuthProvider` already flips the global auth state, and route-gating is a later feature.

Reusable pieces already in place:
- [lib/auth.tsx](../lib/auth.tsx) — `useUser()` returns `{ user, isLoading, isLoggedIn, uid, email }` and throws outside an `AuthProvider`. The provider is mounted in [app/layout.tsx](../app/layout.tsx), so Navbar can use it safely.
- [lib/firebase.ts](../lib/firebase.ts) — `auth: Auth` named export.
- [components/Navbar/Navbar.module.css](../components/Navbar/Navbar.module.css) — existing `.cta` class defines the shared button shape (`h-10 rounded-[10px] px-4 inline-flex items-center gap-2 text-heading font-medium transition hover:brightness-110`). The new logout button mirrors all of these and only overrides `background`.
- [tests/lib/auth.test.tsx](../tests/lib/auth.test.tsx) — established pattern for mocking `firebase/auth` and `@/lib/firebase`. The new Navbar tests can additionally mock `@/lib/auth` directly for `useUser`, which is the cleanest way to drive visibility states without re-mounting providers.

---

## Files to Modify

### 1. `components/Navbar/Navbar.tsx`

- Add `"use client"` as the first line — Navbar must use a hook (`useUser`) and an event handler.
- New imports:
  - `useUser` from `@/lib/auth`
  - `signOut` from `firebase/auth`
  - `auth` from `@/lib/firebase`
- Inside the component:
  - Destructure `{ isLoggedIn, isLoading } = useUser()`.
  - Define `handleLogout` that calls `signOut(auth)` and `.catch((err) => console.error("Failed to sign out", err))`. No loading state, no `await` ceremony — the auth state listener in `AuthProvider` will handle the UI flip.
- JSX changes inside the existing `<ul>`:
  - Render a new `<li>` containing `<button type="button" onClick={handleLogout} className={styles.logout}>Logout</button>`.
  - Conditional render: only when `!isLoading && isLoggedIn`. The combined check satisfies the spec edge case "treat the loading state as not-logged-in for visibility."
  - DOM order: the new `<li>` MUST appear **before** the existing "Create Heist" `<li>` so the button sits to its left visually.
  - Layout note: the navbar `<ul>` currently has no explicit `display` rule, so `<li>`s stack vertically by default. Once Logout is added we need a real horizontal layout on the list (see the CSS change in step 2) — otherwise Logout renders **above** Create Heist instead of to its left.

### 2. `components/Navbar/Navbar.module.css`

Two additions:

**a. Lay the nav list out horizontally.** Add a new rule for `.siteNav ul` so multiple items sit on the same row with a consistent gap — required by the new "horizontal flex row" acceptance criterion. Without this, the second `<li>` stacks below the first.

```
.siteNav ul {
  @apply flex items-center gap-3;
}
```

**b. Add the `.logout` class** mirroring `.cta`'s shape (height, padding, radius, font, transition, hover) and only overriding `background` with a solid darker red. Recommended value: `#B91C1C` (Tailwind `red-700` — conventional logout red, clearly darker than `text-error` `#FF6467`, still legible on the dark navbar). Duplicating the `@apply` line from `.cta` is simpler than `composes:` and avoids any friction between CSS Modules `composes` and Tailwind utilities; also add `cursor-pointer` since `<button>` does not get the pointer cursor by default the way `<a>` does.

```
.logout {
  @apply h-10 rounded-[10px] px-4 inline-flex items-center gap-2 text-heading font-medium transition hover:brightness-110 cursor-pointer;
  background: #B91C1C;
}
```

### 3. `tests/components/Navbar.test.tsx`

Replace the bare-render tests with a version that mocks `useUser` and `signOut`, following the pattern from [tests/components/SignupForm.test.tsx](../tests/components/SignupForm.test.tsx).

**Module-level mocks:**
- `const useUserMock = vi.fn()` and `const signOutMock = vi.fn()` at module scope.
- `vi.mock("@/lib/auth", () => ({ useUser: () => useUserMock() }))`
- `vi.mock("firebase/auth", () => ({ signOut: (...args) => signOutMock(...args) }))`
- `vi.mock("@/lib/firebase", () => ({ auth: {} }))`

**`beforeEach`:** reset both mocks. Default `useUserMock` to `{ user: null, isLoading: false, isLoggedIn: false, uid: null, email: null }` so the existing "renders heading" / "renders Create Heist link" tests keep passing without a logged-in state.

**Keep:**
- `renders the main heading`
- `renders the Create Heist link`

**Add:**
- `does not render the Logout button when the user is logged out` — default `useUserMock` state; `queryByRole("button", { name: /logout/i })` is null.
- `does not render the Logout button while auth is loading` — `useUserMock.mockReturnValue({ ..., isLoading: true, isLoggedIn: false })`; button still not in DOM.
- `renders the Logout button when the user is logged in` — `useUserMock.mockReturnValue({ user: fakeUser, isLoading: false, isLoggedIn: true, ... })`; assert the button is present and is a `<button>` element (use `getByRole("button", { name: /logout/i })`).
- `Logout button is positioned before the Create Heist link in DOM order` — query both, compare their `compareDocumentPosition` (or assert via `screen.getAllByRole(...)` ordering across the nav).
- `clicking Logout calls signOut with the firebase auth instance exactly once` — logged-in state, `await userEvent.click(...)`, assert `signOutMock` called once with the mocked `auth` object.

Do not test the visual red — that's a CSS concern not worth asserting in JSDOM.

---

## Verification

```bash
npx vitest run tests/components/Navbar.test.tsx
npm run lint
```

Then `npm run dev` and manually:
1. Visit `/login` while logged out → no Logout button in the navbar (navbar isn't rendered on public routes either, but if it were, it should not show the button).
2. Sign up or log in → land on `/heists` → Logout button appears immediately to the left of "Create Heist," **on the same horizontal line**, with a visible gap between the two; same height/padding/radius/font, solid dark-red background.
3. Click Logout → button stays clickable (no loading state), Firebase signs the user out, and any auth-driven UI (e.g. displayName references elsewhere) updates as `onAuthStateChanged` fires. The page does **not** redirect — this is intentional for v1.
4. Throttle network in DevTools, click Logout → no UI lock-up, no double-fire concerns (single click → single `signOut` call).
5. Resize the viewport down to a narrow width → Logout and Create Heist remain on the same row (no wrapping into a stack); the navbar `<ul>` continues to flex-row.
