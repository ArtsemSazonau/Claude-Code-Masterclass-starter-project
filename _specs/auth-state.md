# Spec for auth-state

branch: claude/feature/auth-state

## Summary

Introduce a single source of truth for the currently-authenticated Firebase user inside the Next.js client app. Any client component or page should be able to call a `useUser()` hook and synchronously receive one of:

- `null` — the user is signed out
- a `User` object — the user is signed in (Firebase `User` instance from `firebase/auth`)

Under the hood, a global, app-wide listener subscribes once to Firebase's real-time auth state via `onAuthStateChanged`. When Firebase reports a change (sign-in, sign-out, token refresh, page reload that restores a session), every subscriber re-renders with the new value. There must be exactly one active subscription regardless of how many components call the hook.

The scope of this spec is **only the listener and the hook**. No sign-up, sign-in, sign-out, password-reset, or account-management UI/logic is in scope. Components that today have no notion of "the current user" should be updated to consume the hook so that future auth-aware features (route gating, conditional Navbar items, "logout" affordances, personalised heists, etc.) can be built on top without further refactoring.

## Possible Edge Cases

- **Initial hydration** — on first render of a page, Firebase has not yet told us whether a session exists. The hook must distinguish "we don't know yet" from "we know the user is logged out".
- **Page reload with an existing session** — Firebase rehydrates the user asynchronously from local storage; consumers must not assume `null` permanently just because the first render returned `null`.
- **SSR / server components** — Firebase Auth is browser-only. Any code path that imports the hook must run on the client. Server components must not call the hook.
- **Multiple consumers** — many components calling `useUser()` simultaneously must share one underlying `onAuthStateChanged` subscription, not create N of them.
- **Provider unmount / app teardown** — the subscription must be cleaned up to avoid memory leaks (e.g. during fast refresh in dev).
- **Token expiry / refresh** — Firebase silently refreshes ID tokens; subscribers should not see spurious `null` values during a refresh.
- **Sign-out from another tab** — if the user signs out in another browser tab, this tab's `useUser()` should observe the change in real time.
- **Use outside the provider** — a component that calls `useUser()` without the provider in its tree must fail in a clear, immediate way during development rather than silently returning `null` forever.
- **Concurrent rendering / React 19 strict mode** — the subscription must tolerate double-mount in dev mode without leaking listeners or producing duplicate state updates.
- **Slow networks** — the "we don't know yet" loading state should be exposed so loading skeletons can render instead of flashing the logged-out UI.

## Acceptance Criteria

- A `useUser()` hook is exported from a single well-known location (e.g. `lib/auth` or `hooks/useUser`) and importable via the existing `@/*` path alias.
- The hook returns at minimum the current user (`User | null`) and a boolean indicating whether the initial auth check has completed.
- The hook is callable from any client component without additional props or context wiring at the call site.
- Exactly one `onAuthStateChanged` subscription exists at any time, regardless of how many components consume the hook (verified via dev-tools or test).
- The subscription is set up at the root of the client app so it covers both the `(public)` and `(dashboard)` route groups.
- Calling the hook outside the provider tree throws a clear, named error in development.
- The hook returns updated values within one render after Firebase reports a sign-in or sign-out event.
- Server components and server-only code paths are not affected — no `firebase/auth` imports leak into server bundles.
- Any component or page in the existing codebase that derives behaviour from "is a user logged in?" (currently: none, but the home splash at `app/(public)/page.tsx` has a TODO comment that describes such a redirect) is wired to use the hook as part of this work.
- No sign-up, sign-in, sign-out, or password code is added or modified by this spec's implementation. Existing `LoginForm` / `SignupForm` `console.log` stubs are left untouched.
- The Firebase web SDK initialisation already in `lib/firebase.ts` is reused. No additional Firebase apps are initialised.

## Open Questions

- **Where exactly should the hook + provider live?** Options: `lib/auth.tsx` (single file, co-located with `lib/firebase.ts`), `hooks/useUser.ts` + `components/AuthProvider/`, or a `providers/` directory. answer:  `lib/auth.tsx`
- **Return shape**: just `User | null`, or an object like `{ user, isLoading }` (or `{ user, status: "loading" | "authed" | "anon" }`)? The richer shape lets consumers render loading skeletons; the simpler shape is easier to use. Answer: object like `{ user, isLoading }`
- **State implementation**: React Context vs. a Zustand-style store vs. a hand-rolled module-level subscriber pattern. Context is the lowest-dep, idiomatic React choice but re-renders all consumers on every change. answer: react context
- **Where should the provider be mounted?** Root `app/layout.tsx` (covers everything, requires the root layout to render a client component), or split per route-group layout (more isolated but two listeners). answer: Root `app/layout.tsx`
- **Should the hook also expose convenience derived values** like `isLoggedIn`, `uid`, `email`, or should consumers destructure off `user` themselves? answer: lets hook to expose convenience derived values
- **Loading state on the splash page**: should `app/(public)/page.tsx` render nothing while loading, render a spinner, or default to the logged-out experience and let it correct itself when auth resolves? answer: simple spinner
- **Future route gating**: out of scope for this spec, but does the design need to anticipate Next.js middleware integration (server-side gate using a session cookie), or is purely client-side gating acceptable for now? answer : client-side
- **Testing approach**: should we mock `firebase/auth` per test, set up a shared test helper, or pivot to using Firebase Auth emulator in tests? The current test suite doesn't touch Firebase yet. answer: mo mocking

## Testing Guidlines

Create a test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going to heavy:

- Calling `useUser()` inside the provider with no signed-in user returns `null` (and a "not loading" flag once the listener has fired).
- Calling `useUser()` inside the provider with a signed-in user returns the user object received from `onAuthStateChanged`.
- The hook transitions from "loading" to "resolved" exactly once on initial mount.
- Calling `useUser()` outside the provider throws (or returns a sentinel that surfaces the misuse) — verify the failure mode.
- Mounting two components that both call `useUser()` results in only one subscription to Firebase (the underlying `onAuthStateChanged` mock is called exactly once).
- The subscription is unsubscribed when the provider unmounts (the cleanup function returned by `onAuthStateChanged` is invoked).
- Firing a sign-in event causes every subscriber to re-render with the new user.
- Firing a sign-out event causes every subscriber to re-render with `null`.
- The hook works without errors under React 19 strict mode's double-mount in tests.
