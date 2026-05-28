# Spec for create-heist-form

branch: claude/feature/create-heist-form

## Summary

Add a "Create Heist" form to the `/heists` dashboard page (`app/(dashboard)/heists/page.tsx`) that authenticated users can use to brief a new tiny mission. The form collects the user-facing fields of `CreateHeistInput` from `types/firestore/heist.ts` — title, description, and the assignee (`assignedTo` + `assignedToCodename`). Crew members available for assignment are fetched from the Firestore `users` collection so the submitter can pick any registered codename (including themselves). The remaining `CreateHeistInput` fields are filled in programmatically on submit: `createdBy` and `createdByCodename` come from the current Firebase user, `createdAt` is `serverTimestamp()`, `deadline` is a programmatically-derived `Timestamp`, and `finalStatus` is `null`. On a successful write to the `heists` collection, the user is redirected to `/heists` (effectively a reset/refresh of the dashboard) so any new heist will appear in the relevant list once that listing work lands. Only the Firebase Web SDK is used — no Admin SDK or server routes.

## Possible Edge Cases

- Submitter has no Firebase user (session expired mid-form) — block submission and show an inline error; the dashboard layout already gates `/heists` behind auth, but the form must not write with a missing `createdBy`.
- Submitter's codename is missing from the Firebase user's `displayName` — fall back to reading it from the `users/{uid}` document; if still missing, surface an inline error rather than writing a heist with a blank `createdByCodename`.
- Users collection fetch fails — show a non-blocking error on the assignee field and disable submission until a retry succeeds.
- Users collection returns zero documents — disable the assignee select with an explanatory placeholder ("No crew available yet").
- Submitter assigns the heist to themselves — explicitly allowed; their own codename should appear in the assignee list.
- Title or description is empty / only whitespace — block submission with inline validation.
- Title or description exceed a reasonable length (e.g. 80 chars title, 500 chars description) — block submission with inline validation.
- Form submit while a previous submit is still in flight — disable the submit button to prevent duplicate writes.
- Firestore `addDoc` to `heists` fails (network, permission rules) — show a generic error inline; do not redirect.
- Programmatic `deadline` calculation drifts due to client clock skew — accepted; the field is informational and a server-side rule is out of scope here.
- Page is rendered for an unauthenticated user (defence in depth) — the form should not render at all.

## Acceptance Criteria

- A `CreateHeistForm` component is added under `components/CreateHeistForm/` following the project's component folder convention (`CreateHeistForm.tsx`, `CreateHeistForm.module.css`, `index.ts`) and rendered on `app/(dashboard)/heists/page.tsx`.
- The form exposes input controls for exactly the user-supplied subset of `CreateHeistInput`:
  - `title` (single-line text input, required)
  - `description` (multi-line textarea, required)
  - `assignedTo` + `assignedToCodename` (single select; options are populated from the Firestore `users` collection and each option maps a user `id` to its `codename`)
- The remaining `CreateHeistInput` fields are populated programmatically on submit and never exposed in the UI:
  - `createdBy` — current Firebase user's `uid` (via `useUser` from `lib/auth.tsx`)
  - `createdByCodename` — current user's codename (`auth.currentUser.displayName`, with a fallback read from `users/{uid}.codename` if missing)
  - `createdAt` — `serverTimestamp()` from the Firebase Web SDK
  - `deadline` — a `Timestamp` derived programmatically from a fixed default offset from now (see Open Questions for the exact default)
  - `finalStatus` — `null`
- On mount, the form fetches all documents from the Firestore `users` collection via the `db` export from `lib/firebase.ts` and renders them in the assignee select sorted by codename (alphabetical).
- While the users fetch is in flight, the assignee select shows a loading state and the submit button is disabled.
- Submitting the form calls `addDoc` against the `heists` collection (using `COLLECTIONS.HEISTS` from `types/firestore/index.ts`) with a payload that satisfies `CreateHeistInput`.
- On a successful write, the user is redirected to `/heists` using `router.replace("/heists")` so the dashboard re-renders with a clean state.
- While the create request is in flight the submit button is disabled and shows a loading state.
- Validation errors (empty title, empty description, no assignee selected) are surfaced inline using the existing error styling (`text-error`) without ever hitting Firestore.
- Firestore write errors are caught and displayed inline; the user remains on the page so they can retry.
- The form uses the existing button (`btn`), form-title, and theme token utilities — no new global styles are introduced beyond a component-scoped CSS module.
- No server-side code, API route, or Firebase Admin SDK is introduced.

## Open Questions

- What should the default `deadline` be? Options: a fixed offset like "now + 7 days", an arbitrary far-future date, or actually a user-supplied date input despite the brief? **Recommendation: now + 7 days, hard-coded.** now + 48 hours, hard-coded
- Should the assignee list include the current user (self-assignment allowed) or be filtered to other crew only? **Recommendation: include self.** include self
- Should the form live always-visible on `/heists` or behind a toggle / collapsible "+ New Heist" affordance? **Recommendation: behind a toggle so the dashboard isn't dominated by an empty form once the listing sections gain content.** behind a toggle 
- Once the heist is created, should we show a transient success toast / banner before the redirect, or redirect immediately? **Recommendation: redirect immediately, matching the signup flow.** redirect immediately
- Should we add a `USERS: "users"` entry to the `COLLECTIONS` constant in `types/firestore/index.ts` alongside `HEISTS`, or use the string literal `"users"` directly? **Recommendation: add it for consistency.** add it for consistency
- Does the `users` fetch need to be live (`onSnapshot`) or is a one-shot `getDocs` on mount sufficient? **Recommendation: one-shot is fine for now.**one-shot is fine for now
-  What should happen if the users collection is empty? show a message instead of form

## Testing Guidlines

Create a test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going too heavy:

- The form renders inputs for title, description, and assignee, and a submit button.
- On mount, `getDocs` is called against the `users` collection and the returned codenames are rendered as options in the assignee select (sorted alphabetically).
- Submitting with an empty title shows an inline validation error and does not call `addDoc`.
- Submitting with an empty description shows an inline validation error and does not call `addDoc`.
- Submitting without selecting an assignee shows an inline validation error and does not call `addDoc`.
- Submitting a valid form calls `addDoc` against the `heists` collection with a payload containing `title`, `description`, `assignedTo`, `assignedToCodename`, `createdBy` (current uid), `createdByCodename` (current codename), `createdAt` (a `FieldValue` server timestamp), `deadline` (a future `Timestamp`), and `finalStatus: null`.
- On a successful `addDoc`, `router.replace("/heists")` is called.
- The submit button is disabled while the create request is in flight.
- When `addDoc` rejects, an inline error is shown and the user remains on the page.
- When the `users` fetch fails, the assignee select shows an error state and submission is blocked.
