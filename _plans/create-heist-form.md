# Plan: Create Heist Form

Spec: [_specs/create-heist-form.md](../_specs/create-heist-form.md)
Branch: `claude/feature/create-heist-form`

## Context

Authenticated users currently land on `/heists` ([app/(dashboard)/heists/page.tsx](../app/(dashboard)/heists/page.tsx)) but have no way to actually create a heist. The Navbar already advertises a `+ Create Heist` action at [components/Navbar/Navbar.tsx:40](../components/Navbar/Navbar.tsx#L40) that points to `/heists/create` — a route that doesn't exist yet, so the link 404s. The Firestore schema is in place ([types/firestore/heist.ts](../types/firestore/heist.ts) — `CreateHeistInput`) and the auth/user infrastructure is wired up via Firebase Web SDK (no Admin SDK). This plan implements the form, mounts it at `/heists/create` so the existing Navbar link works, and writes new heists to the `heists` collection.

Decisions confirmed with the user:

- **Location**: `/heists/create` route (NOT a toggle on `/heists`) — matches the Navbar link.
- **Deadline**: hard-coded `now + 48 hours`.
- **Assignee list**: includes self.
- **Post-submit**: redirect immediately to `/heists` (no toast).
- **Empty users collection**: render a "no crew available" message instead of the form.
- **Users fetch**: one-shot `getDocs` on mount.
- **COLLECTIONS constant**: add `USERS: "users"` for consistency.

## Approach

Mirror the established `SignupForm` pattern closely — `"use client"` component, controlled inputs, in-flight disabled submit, inline error via `role="alert"`, CSS module with `@reference`, and per-file vitest mocks. The form is rendered on a new dashboard route. The dashboard layout ([app/(dashboard)/layout.tsx](../app/(dashboard)/layout.tsx)) already gates the whole `(dashboard)` group behind auth, so the new page inherits that protection for free.

### Files to create

**`components/CreateHeistForm/CreateHeistForm.tsx`** *(new)*

- `"use client"`, mirroring [components/SignupForm/SignupForm.tsx](../components/SignupForm/SignupForm.tsx).
- State: `title`, `description`, `assigneeId` (string), `users` (array `{ id, codename }`), `usersLoading`, `usersError`, `isSubmitting`, `error`.
- On mount: `useEffect` calls `getDocs(collection(db, COLLECTIONS.USERS))`, sorts by `codename` alphabetically, sets `users`. On failure: set `usersError`.
- Hooks: `useUser()` from [lib/auth.tsx](../lib/auth.tsx) for `uid` + the underlying `user.displayName` (current codename). Also derive codename as a fallback from the fetched users list (`users.find(u => u.id === uid)?.codename`) in case `displayName` is empty.
- Render states (in order of precedence):
  1. `usersLoading` → reuse `<Spinner />` from [components/Spinner](../components/Spinner).
  2. `usersError` → inline error message, no form.
  3. `users.length === 0` → "No crew available yet — invite teammates first." message, no form.
  4. Otherwise → the form.
- Form fields:
  - `<input type="text">` for title — `required`, `maxLength={80}`.
  - `<textarea>` for description — `required`, `maxLength={500}`.
  - `<select>` for assignee — populated from `users`, sorted by codename, includes self. `required`.
- Submit handler:
  - Build `CreateHeistInput` payload:
    - `title`, `description` (trimmed)
    - `assignedTo = assigneeId`, `assignedToCodename = users.find(u => u.id === assigneeId)!.codename`
    - `createdBy = uid`
    - `createdByCodename = user?.displayName ?? users.find(u => u.id === uid)?.codename ?? ""` — if empty after fallback, abort with inline error
    - `createdAt: serverTimestamp()`
    - `deadline: Timestamp.fromDate(new Date(Date.now() + 48 * 60 * 60 * 1000))`
    - `finalStatus: null`
  - Call `addDoc(collection(db, COLLECTIONS.HEISTS), payload)`.
  - On success: `router.replace("/heists")`.
  - On failure: `setError(mapFirebaseError(err))`, leave `isSubmitting` false.
- Reuse the `mapFirebaseError` shape from [components/SignupForm/SignupForm.tsx:12-19](../components/SignupForm/SignupForm.tsx#L12-L19) (copy locally — small, no need to extract a shared util yet).

**`components/CreateHeistForm/CreateHeistForm.module.css`** *(new)*

- Start with `@reference "../../app/globals.css";` per CLAUDE.md.
- Mirror [components/SignupForm/SignupForm.module.css](../components/SignupForm/SignupForm.module.css) for `.form`, `.error`, label/input styling. Add `.form textarea` and `.form select` rules that match the existing input look (`bg-lighter`, `text-heading`, `rounded-md`, `border focus:border-primary`).
- Add an `.emptyState` rule for the "no crew" message.

**`components/CreateHeistForm/index.ts`** *(new)*

- `export { default } from "./CreateHeistForm"`.

**`app/(dashboard)/heists/create/page.tsx`** *(new)*

- Server component is fine (the form itself is client). Renders within `.page-content`:
  - Heading (`<h2>` per existing `.form-title` style or a custom heading).
  - `<CreateHeistForm />`.
  - Optional `<Link href="/heists">← Back to heists</Link>`.

**`tests/components/CreateHeistForm.test.tsx`** *(new)*

- Mirror mock setup from [tests/components/SignupForm.test.tsx](../tests/components/SignupForm.test.tsx).
- Mock `firebase/firestore` (`collection`, `doc`, `getDocs`, `addDoc`, `serverTimestamp`, `Timestamp.fromDate`).
- Mock `@/lib/firebase` (`auth: {}`, `db: {}`).
- Mock `@/lib/auth` so `useUser` returns `{ uid: "u1", user: { displayName: "SilentCrimsonFox" } }`.
- Mock `next/navigation` for `useRouter().replace`.
- Tests:
  1. Renders title, description, assignee inputs, and submit button after users load.
  2. Calls `getDocs` against the users collection on mount; renders codenames as `<option>`s sorted alphabetically.
  3. Empty users → renders "No crew available" message, no form.
  4. Users fetch error → renders error, no form.
  5. Submitting with empty title / empty description / no assignee blocks `addDoc` and shows inline validation.
  6. Valid submit calls `addDoc` with a payload that includes the correct `title`, `description`, `assignedTo`, `assignedToCodename`, `createdBy`, `createdByCodename`, `createdAt` (a `FieldValue`), `deadline` (a `Timestamp` ~48h in the future), `finalStatus: null`.
  7. On successful submit, `router.replace("/heists")` is called.
  8. Submit button is disabled while in flight.
  9. When `addDoc` rejects, inline error is shown and no redirect happens.

### Files to modify

**`types/firestore/index.ts`** — add `USERS: "users"` to the `COLLECTIONS` const so both the form's read (`collection(db, COLLECTIONS.USERS)`) and the existing signup write (currently hard-codes `"users"` at [components/SignupForm/SignupForm.tsx:55](../components/SignupForm/SignupForm.tsx#L55)) can use it. Updating SignupForm to use the constant is a one-line nicety we'll do for consistency.

**`components/SignupForm/SignupForm.tsx`** — swap the literal `"users"` for `COLLECTIONS.USERS`. Trivial; keeps the codebase consistent now that the constant exists.

### Files NOT to modify

- **Navbar** — link already points to `/heists/create`; once the page exists, the link works.
- **`app/(dashboard)/heists/page.tsx`** — out of scope; the form is on `/heists/create`, not inline.
- **`lib/auth.tsx`** — no need to expose codename through context; we read `user.displayName` and fall back to the fetched users list.

## Reused existing pieces

- `useUser()` from [lib/auth.tsx](../lib/auth.tsx) — supplies `uid` and `user.displayName`.
- `auth`, `db` from [lib/firebase.ts](../lib/firebase.ts).
- `CreateHeistInput`, `heistConverter` from [types/firestore/heist.ts](../types/firestore/heist.ts) — payload typing.
- `COLLECTIONS` from [types/firestore/index.ts](../types/firestore/index.ts) — extended with `USERS`.
- `<Spinner />` from [components/Spinner](../components/Spinner) — loading state.
- `.btn`, `.page-content`, `.form-title` global utilities from [app/globals.css](../app/globals.css).
- `mapFirebaseError` shape from SignupForm — copied locally (small, no shared util needed yet).

## Verification

1. **Tests**: `npx vitest run tests/components/CreateHeistForm.test.tsx` — all 9 tests pass. Then `npm run test -- run` to confirm no regressions in the rest of the suite.
2. **Lint**: `npm run lint` — clean (note: a pre-existing unescaped-apostrophe error in `app/(dashboard)/heists/page.tsx` is out of scope).
3. **Dev server**:
   - `npm run dev`, log in.
   - Click `+ Create Heist` in the Navbar → lands on `/heists/create` with the form rendered.
   - Verify the assignee dropdown is populated with codenames from Firestore (including own codename) and sorted alphabetically.
   - Submit with empty title → inline validation, no Firestore write.
   - Submit a valid heist → land on `/heists`.
   - Open Firebase console → confirm a new document in `heists` with `createdBy = current uid`, `assignedTo` matches the selection, `createdAt` is a server timestamp, `deadline` is ~48h in the future, `finalStatus = null`.
   - Force-fail the write (block network) → inline error shows, user stays on the page.
4. **Empty-state spot check**: temporarily mock the users fetch to return `[]` (or clear the collection in a dev project) → "No crew available" message renders in place of the form.
