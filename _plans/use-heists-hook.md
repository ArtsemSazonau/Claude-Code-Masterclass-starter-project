# Plan: `useHeists` real-time hook + wire into heists page

## Context

The heists page at [app/(dashboard)/heists/page.tsx](app/(dashboard)/heists/page.tsx) currently renders three empty sections (Active / Assigned / Expired). We need a `useHeists` hook that subscribes to the Firestore `heists` collection in real time and returns the right slice of data for each section, then update the page to list each result set's titles.

The hook accepts a single mode — `'active' | 'assigned' | 'expired'` — and builds the appropriate Firestore query, including an auth-aware filter for the two user-scoped modes. It must subscribe with `onSnapshot` (real-time, not one-shot), clean up on unmount / mode change / user change, and surface loading + error state alongside the data so the page can render errors inline.

Spec lives at [_specs/use-heists-hook.md](_specs/use-heists-hook.md). Open Questions answered inline there; one contradiction resolved with the user: **'expired' uses the strict filter** — only heists where `finalStatus` is `'success'` or `'failure'` AND `deadline` has passed.

## Files to create

### `lib/useHeists.ts` (new — placed next to [lib/auth.tsx](lib/auth.tsx) which exports `useUser`)
- `"use client"` at top.
- Public API: `useHeists(mode: HeistMode): UseHeistsResult` where
  - `HeistMode = 'active' | 'assigned' | 'expired'`
  - `UseHeistsResult = { heists: Heist[]; loading: boolean; error: Error | null }`
- Internally:
  - `const { uid, isLoading: authLoading } = useUser()` from [lib/auth.tsx](lib/auth.tsx)
  - `useState` for `heists`, `loading` (default `true`), `error` (default `null`).
  - `useEffect` keyed on `[mode, uid, authLoading]`:
    - If `authLoading` → keep `loading: true`, do nothing.
    - If mode is `'active'` or `'assigned'` and `uid` is `null` → reset to `{ heists: [], loading: false, error: null }` and skip subscription (user is signed out / unresolved).
    - Otherwise build the query and call `onSnapshot`. On snapshot, map docs through the converter to `Heist[]` and set state. On error, set `error` and `loading: false`.
    - Return the unsubscribe function from the effect for cleanup.
  - Use `collection(db, COLLECTIONS.HEISTS).withConverter(heistConverter)` so docs come back as fully-typed `Heist` (Timestamps already converted to `Date` per [types/firestore/heist.ts:44-54](types/firestore/heist.ts)).
- Query construction (`Timestamp.now()` as the "now" reference per the server-timestamp open-question answer — this is the Firebase JS SDK's Timestamp-typed bound, the closest practical equivalent to a server-time comparison in a client query):
  - `'active'`: `where('assignedTo', '==', uid)`, `where('deadline', '>', Timestamp.now())`, `orderBy('deadline', 'asc')`.
  - `'assigned'`: `where('createdBy', '==', uid)`, `where('deadline', '>', Timestamp.now())`, `orderBy('deadline', 'asc')`. (Schema uses `createdBy` for the assigner — confirmed in [types/firestore/heist.ts](types/firestore/heist.ts) and [components/CreateHeistForm/CreateHeistForm.tsx:96-106](components/CreateHeistForm/CreateHeistForm.tsx).)
  - `'expired'`: `where('deadline', '<', Timestamp.now())`, `where('finalStatus', 'in', ['success', 'failure'])`, `orderBy('deadline', 'desc')`.
- Note in a one-line comment that these queries require Firestore composite indexes (assignedTo+deadline, createdBy+deadline, deadline+finalStatus). The first run in dev will print an index-creation link in the console; surfacing it is out of scope here.

## Files to modify

### [app/(dashboard)/heists/page.tsx](app/(dashboard)/heists/page.tsx)
- Add `"use client"` at the top (per open-question answer: the whole page becomes a client component).
- Import `useHeists` from `@/lib/useHeists`.
- Call the hook three times: `useHeists('active')`, `useHeists('assigned')`, `useHeists('expired')`.
- Under each existing `<h2>`, render an unstyled `<ul>` of `<li>{heist.title}</li>` for each returned heist (unstyled list per open-question answer; key on `heist.id`).
- If a section's `error` is non-null, render its message inline under the heading (per open-question answer: errors are surfaced to UI). Use the existing `text-error` token class from [app/globals.css](app/globals.css) for the error text.
- Keep the existing three section divs/headings unchanged so empty result sets still show the heading.

## Files to create (tests)

### `tests/lib/useHeists.test.tsx` (new — mirrors [tests/lib/auth.test.tsx](tests/lib/auth.test.tsx) patterns)
- Mock `@/lib/firebase` to export a stub `db`.
- Mock `@/lib/auth` so `useUser` is controllable per test.
- Mock `firebase/firestore`: provide `vi.fn()` stubs for `onSnapshot`, `query`, `where`, `orderBy`, `collection`, `Timestamp` (with a working `now()`), and the converter-returning `withConverter`. Capture the args each `where` is called with so tests can assert query shape.
- Use a small `<Probe />` component that calls the hook and renders `heists.map(h => h.title)` / `loading` / `error` into `data-testid` nodes (matches the auth test's Probe pattern at [tests/lib/auth.test.tsx:22-32](tests/lib/auth.test.tsx)).
- Cases (per spec Testing Guidelines):
  1. `'active'` — builds the expected `where('assignedTo', '==', uid)` + future-deadline query and renders the snapshot's titles.
  2. `'assigned'` — builds `where('createdBy', '==', uid)` + future-deadline query.
  3. `'expired'` — builds the past-deadline + `finalStatus in [success, failure]` query and runs regardless of uid.
  4. Unsubscribes on unmount (assert the function returned by the mocked `onSnapshot` is called).
  5. Re-subscribes when `mode` prop changes (previous unsubscribe is called; new `onSnapshot` is called with a different query shape).
  6. Does NOT subscribe for `'active'` / `'assigned'` while `useUser` reports `uid: null` (assert `onSnapshot` not called); does subscribe for `'expired'` even with `uid: null`.
  7. Surfaces `error` state when the `onSnapshot` error callback fires.

### `tests/app/(dashboard)/heists/page.test.tsx` (new — keep it light)
- Mock `@/lib/useHeists` to return canned `{ heists, loading, error }` per mode (return different fixtures based on the `mode` arg).
- Render `<HeistsPage />`.
- Assert: all three section headings render; titles from each fixture appear under the correct heading; with an empty fixture the heading still renders; with an `error`, the error message renders under that section.

## Critical files (read before editing)

- [lib/firebase.ts](lib/firebase.ts) — `db` export.
- [lib/auth.tsx](lib/auth.tsx) — `useUser()` shape.
- [types/firestore/heist.ts](types/firestore/heist.ts) — `Heist` type, `heistConverter`, `COLLECTIONS`.
- [components/CreateHeistForm/CreateHeistForm.tsx](components/CreateHeistForm/CreateHeistForm.tsx) — established Firestore + auth pattern to mirror.
- [tests/lib/auth.test.tsx](tests/lib/auth.test.tsx) — test mocking pattern.
- [vitest.config.mts](vitest.config.mts) — jsdom + globals already configured.

## Verification

1. `npm run test -- run` — all new + existing tests pass.
2. `npm run lint` — clean.
3. `npm run build` — type-check passes (hook is fully typed, page compiles as a client component).
4. Manual: `npm run dev`, sign in, visit `/heists`.
   - Create a heist assigned to yourself with a future deadline → appears under "Your Active Heists" in real time without a refresh.
   - Create a heist assigned to another user with a future deadline → appears under "Heists You've Assigned" in real time.
   - In the Firestore console, update an existing heist's `deadline` to a past time AND `finalStatus` to `"success"` → it appears under "All Expired Heists" within seconds (real-time confirmation).
   - On first run, the dev console will print a composite-index creation link; click it to provision indexes for the Firestore project.
5. Sign out, sign back in → active/assigned sections refill for the new user; expired section unchanged (global).
