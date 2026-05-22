# Spec for logout-functionality

branch: claude/feature/logout-functionality

## Summary

Add a Logout button to the `Navbar` component that signs the current user out of Firebase Authentication when clicked. The button is only rendered when a user is authenticated (driven by the existing `useUser` hook in `lib/auth.tsx`). It sits immediately to the left of the existing "Create Heist" call-to-action and visually matches it (same height, padding, font size, border radius, icon sizing, hover behaviour) except for the background, which is solid red instead of the purple→pink gradient. No redirect is performed after sign-out — the auth state change is enough; route gating belongs to a later feature.

## Possible Edge Cases

- Button rendered on a public route where no user exists — it must not appear at all (avoid a flash of the button before auth state resolves; treat the loading state as "not logged in" for visibility purposes).
- Click while a sign-out request is already in flight — guard against duplicate `signOut` calls (e.g. disable the button or ignore subsequent clicks until resolved).
- `signOut` rejects (network failure, etc.) — log the error to the console; do not crash the navbar. No user-facing error UI is required for v1.
- The navbar `<ul>` previously held a single `<li>`, so default block layout was fine; with two items the list MUST become a horizontal flex row with consistent gap, otherwise the Logout button stacks above Create Heist instead of sitting to its left.
- Spacing between Logout and Create Heist must remain consistent with the existing `<ul>` list-item layout so the navbar does not jump when the button toggles on/off.
- The button must remain keyboard accessible (focusable, activatable with Enter/Space) and have an accessible name of "Logout".

## Acceptance Criteria

- A Logout button is present in the `Navbar` when, and only when, `useUser()` returns an authenticated user.
- Clicking the button calls Firebase `signOut(auth)` using the `auth` export from `lib/firebase.ts`.
- The button is placed immediately to the left of the existing "Create Heist" link inside the same navigation list, sitting on the same horizontal line (the nav `<ul>` lays its items out as a horizontal flex row with a consistent gap).
- Visual styling matches the "Create Heist" button for: height, horizontal padding, font size, font weight, border radius, text colour, and hover behaviour.
- The background of the Logout button is solid red (using the existing `text-error` / equivalent error token where possible, or a clearly-red value documented in the component CSS module).
- Logout button is a `<button>` element (not a link) with an accessible name of "Logout".
- No redirect or navigation is triggered after sign-out — only the Firebase auth state changes.
- The button is not rendered while `useUser()` is still in its loading state.
- Existing Navbar tests continue to pass, and new tests cover: button visibility based on auth state, and `signOut` invocation on click.

## Open Questions

- Should the Logout button include an icon (e.g. a `LogOut` glyph from `lucide-react`) to mirror the `Plus` icon on Create Heist, or text only? text only.
- Should the red background use the existing `--color-error` / `text-error` token (`#FF6467`) or a darker, more conventional logout-red? darker red.
- Should the button show a transient loading state ("Signing out…") while `signOut` is in flight, or stay static? stay static.

## Testing Guidlines

Create a test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going to heavy:

- Logout button is **not** rendered when `useUser()` returns `{ user: null, loading: false }`.
- Logout button is **not** rendered when `useUser()` is in the loading state.
- Logout button **is** rendered when `useUser()` returns an authenticated user.
- Clicking the Logout button calls `signOut` with the Firebase `auth` instance exactly once.
- The Logout button sits before the "Create Heist" link in DOM order within the navigation list.
- The button has an accessible name of "Logout" and is a `<button>` element.
