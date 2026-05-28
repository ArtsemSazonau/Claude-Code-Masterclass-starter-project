# Spec for use-heists-hook

branch: claude/feature/use-heists-hook
figma_component (if used): n/a

## Summary

Introduce a `useHeists` React hook that subscribes to the Firestore `heists` collection in real-time and returns an array of heist objects filtered by a single mode argument. The hook accepts one of three modes:

- `'active'` — heists assigned **to** the current user where the `deadline` has not yet passed.
- `'assigned'` — heists assigned **by** the current user where the `deadline` has not yet passed.
- `'expired'` — heists where the `deadline` has passed **and** `finalStatus` is not null, regardless of which user is involved.

The hook uses the supplied mode to build the corresponding Firestore query and keeps the result set in sync via a real-time listener (e.g. `onSnapshot`). It exposes the current heists array along with basic state needed by callers (loading, error).

After the hook is in place, wire it into [app/(dashboard)/heists/page.tsx](app/(dashboard)/heists/page.tsx) so that each of the three existing sections (`Your Active Heists`, `Heists You've Assigned`, `All Expired Heists`) calls the hook with the appropriate mode and renders **only the title** of each returned heist as a simple list under its section heading.

## Figma Design Reference (only if referenced)

Not applicable — this feature is data wiring on an existing page. No new visual design is introduced; titles are rendered as plain text within the existing layout.

## Possible Edge Cases

- The current user is not yet known (auth still resolving) — the hook should not fire queries against an undefined user for `'active'` / `'assigned'` modes.
- The current user becomes null (signed out) while the hook is mounted — listener should clean up and the returned array should reset to empty.
- The mode argument changes between renders — the previous Firestore listener must be unsubscribed before a new one is created to avoid leaks and stale data.
- The component using the hook unmounts — the listener must be cleaned up.
- A heist document is missing or has malformed fields (e.g. missing `deadline`, missing `finalStatus`, missing `assignedTo` / `assignedBy`) — such documents should be safely ignored or skipped rather than crashing the consumer.
- The Firestore query returns zero results — each section should render its heading with an empty list (no error, no placeholder text required beyond what's already on the page).
- A Firestore listener error occurs (permissions, network) — the hook should surface an error state without throwing.
- The `'expired'` query is global and may return a large set — acknowledge this but no pagination is required in this iteration.
- A heist's `deadline` passes while the hook is subscribed — the hook reflects whatever the underlying Firestore query/index returns at that moment; real-time re-classification (active → expired) is not a requirement of this iteration.
- Multiple instances of the hook are mounted on the same page (three on the heists page) — each must maintain its own independent subscription.

## Acceptance Criteria

- A `useHeists` hook exists and can be imported and used from a client component.
- The hook accepts exactly one argument: a mode of type `'active' | 'assigned' | 'expired'`.
- The hook returns an array of heist objects matching the Firestore schema already defined for heists in this project.
- In `'active'` mode, returned heists are those assigned to the currently authenticated user with a `deadline` strictly in the future.
- In `'assigned'` mode, returned heists are those assigned by the currently authenticated user with a `deadline` strictly in the future.
- In `'expired'` mode, returned heists are those whose `deadline` is in the past **and** whose `finalStatus` is not null, regardless of the current user.
- The hook updates returned data in real time as the underlying Firestore documents change (uses an `onSnapshot`-style subscription, not a one-shot fetch).
- The hook cleans up its Firestore subscription on unmount and when the mode argument or current user changes.
- For modes that require a current user, the hook does not run queries until the user is known.
- The hook exposes enough state for a caller to distinguish between loading, error, and ready states without inspecting the returned array length.
- [app/(dashboard)/heists/page.tsx](app/(dashboard)/heists/page.tsx) renders the existing three sections and, inside each one, lists the **titles only** of the heists returned by `useHeists` called with the matching mode (`'active'`, `'assigned'`, `'expired'`).
- The page continues to render its three section headings even when a section has zero results.
- No regressions to other pages, routes, or existing tests.

## Open Questions

- Should the hook return a stable object shape such as `{ heists, loading, error }`, or should `heists` be returned directly and loading/error be exposed via additional return values? (Affects ergonomics on the page.) hould `heists` be returned directly
- Should the listing on the heists page render titles as a plain `<ul>`, an unstyled list, or use a dedicated component? (Spec currently says "titles only" with no styling commitment.) unstyled list
- Should the heists page become a client component in its entirety, or should the per-section title list be extracted into a small client component while the page stays a server component? a client component
- For `'expired'`, "finalStatus is not null" — does this include documents where the field is missing entirely, or only documents where the field exists and holds a non-null value? (Firestore `!= null` queries behave differently for missing fields.) include documents where the field is missing entirely
- Should deadlines be compared against client-side `Date.now()` or against the Firestore server timestamp? (Affects correctness near the boundary.) against the Firestore server timestamp
- Should errors from the Firestore listener be surfaced to the UI on the heists page in this iteration, or silently swallowed for now?  errors from the Firestore listener should be surfaced to the UI

## Testing Guidlines

Create a test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going to heavy:

- The hook subscribes to Firestore with a query appropriate to the `'active'` mode (assigned-to current user, deadline in the future) and returns the resulting heists.
- The hook subscribes with a query appropriate to the `'assigned'` mode (assigned-by current user, deadline in the future) and returns the resulting heists.
- The hook subscribes with a query appropriate to the `'expired'` mode (deadline in the past AND `finalStatus` not null) and returns the resulting heists regardless of the current user.
- The hook unsubscribes from its Firestore listener on unmount.
- The hook re-subscribes (and unsubscribes the previous listener) when the mode argument changes.
- The hook does not subscribe for `'active'` or `'assigned'` modes while the current user is unknown.
- The hook surfaces an error state when the Firestore listener reports an error.
- The heists page renders the titles returned by each `useHeists` call under the correct section heading.
- The heists page continues to render all three section headings when the corresponding hook returns an empty array.
