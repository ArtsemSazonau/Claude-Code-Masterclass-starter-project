# Spec for route-protection

branch: claude/feature/route-protection

## Summary

Add client-side route protection that gates the two route groups by Firebase auth state:

- Routes in `app/(public)/` (home splash, login, signup, preview) must only be viewable by **unauthenticated** users. Authenticated users hitting any public route are redirected to `/heists`.
- Routes in `app/(dashboard)/` (heists and any future authenticated routes) must only be viewable by **authenticated** users. Unauthenticated users hitting any dashboard route are redirected to `/login`.

Both group layouts (`app/(public)/layout.tsx` and `app/(dashboard)/layout.tsx`) read auth state via the existing `useUser` hook from `lib/auth.tsx`. While `isLoading` is true (initial Firebase auth state resolution), the layouts render a simple centered loader instead of their children, so a flash of the wrong content never reaches the user before the redirect kicks in.

The existing redirect logic on the home splash page (`app/(public)/page.tsx`) becomes redundant once the public group layout handles redirects for logged-in users — the splash page itself can remain as a marketing/loading visual but its `useEffect` redirect should be removed or left as a no-op since the layout takes over.

## Figma Design Reference (only if referenced)

Not applicable. No Figma reference provided. Loader visual should match the existing app aesthetic (reuse the `Spinner` component already in `components/Spinner`).

## Possible Edge Cases

- **Initial load flash:** Firebase auth state resolves asynchronously. Without the loader gate, an unauthenticated user briefly sees `/heists` content before being redirected, and vice versa. The `isLoading` loader must block rendering of children until resolution completes.
- **Direct navigation to a protected URL while logged out:** User pastes `/heists/<id>` into the address bar. Dashboard layout must redirect to `/login` after auth resolves.
- **Direct navigation to a public URL while logged in:** User pastes `/login` while already authenticated. Public layout must redirect to `/heists` after auth resolves.
- **Logout from inside dashboard:** When the user logs out via the navbar, `useUser` flips to unauthenticated. The dashboard layout should detect this and redirect to `/login` without requiring a manual navigation.
- **Login from inside public group:** When a user successfully logs in on `/login`, `useUser` flips to authenticated. The public layout should detect this and redirect to `/heists`. (The login form already navigates manually on success — the layout redirect is a safety net, not the primary path. Both should agree on the destination.)
- **`/preview` route:** Currently lives in the public group. Confirm whether preview should remain gated as public-only or whether it should be reachable regardless of auth. **Assumed public-only** unless flagged otherwise.
- **The home splash `/` route:** Already redirects via `useEffect`. With the public layout redirecting authenticated users to `/heists`, this client-side logic becomes redundant. Keep the splash visual but the layout-level redirect is the source of truth.
- **Redirect loop risk:** If the public layout redirects authed users to `/heists` and the dashboard layout redirects unauthed users to `/login`, the two must not race during the loading window. The loader-while-loading rule prevents this.
- **Server-rendered first paint:** Layouts are client components (they must be, to read `useUser`). Confirm `"use client"` directive is added to both layouts.

## Acceptance Criteria

- An unauthenticated user visiting `/heists` (or any nested dashboard route) sees the loader briefly, then is redirected to `/login`.
- An authenticated user visiting `/login`, `/signup`, or `/` sees the loader briefly, then is redirected to `/heists`.
- An unauthenticated user visiting `/login` or `/signup` sees the loader briefly, then sees the page (no redirect).
- An authenticated user visiting `/heists` sees the loader briefly, then sees the page (no redirect).
- Logging out from the dashboard navbar immediately routes the user away from the protected page to `/login`.
- The loader is visually simple, centered on the page, and reuses the existing `Spinner` component so it matches the app's style.
- No flash of unauthorized content occurs on initial page load or hard refresh of any route.
- Both `app/(public)/layout.tsx` and `app/(dashboard)/layout.tsx` are marked as client components.
- Existing layout chrome (the `<main className="public">` wrapper for public pages and the `<Navbar />` + `<main>` wrapper for dashboard pages) is preserved — the loader replaces only the `{children}` slot, not the entire layout.

## Open Questions

- Should the `/preview` route stay in the public group (and therefore be inaccessible to logged-in users), or should it be reachable from both auth states? **Default assumption: stays public-only.** stay in the public group but reachable from both auth states
- Should the home splash page (`app/(public)/page.tsx`) keep its own `useEffect` redirect, or should it be simplified to render only the splash visual now that the layout owns the redirect? **Default assumption: remove the redundant `useEffect` from the splash page; the layout is the source of truth.** keep its own `useEffect` redirect
- Where exactly should the loader render — inside the existing `<main className="public">` / `<main>` wrappers, or as a full-page overlay that replaces them entirely during loading? **Default assumption: inside the wrappers, so layout chrome stays consistent.** inside the wrappers, so layout chrome stays consistent.
- For the dashboard loader, should the navbar render during the loading window or be hidden until auth resolves? **Default assumption: hide the navbar during loading, since it shows the logged-in user's controls — render only the loader until auth resolves.** the navbar render during the loading window

## Testing Guidlines

Create a test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going too heavy:

- Public layout renders the loader when `useUser` returns `isLoading: true`.
- Public layout renders `{children}` when `useUser` returns `isLoading: false, isLoggedIn: false`.
- Public layout calls `router.replace("/heists")` when `useUser` returns `isLoading: false, isLoggedIn: true`.
- Dashboard layout renders the loader when `useUser` returns `isLoading: true`.
- Dashboard layout renders `<Navbar />` and `{children}` when `useUser` returns `isLoading: false, isLoggedIn: true`.
- Dashboard layout calls `router.replace("/login")` when `useUser` returns `isLoading: false, isLoggedIn: false`.
- Mock `useUser` from `@/lib/auth` and `useRouter` from `next/navigation` in each test rather than spinning up real Firebase state.
