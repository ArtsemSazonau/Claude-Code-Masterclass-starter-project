# Plan: Signup Firebase Auth Integration

## Context

The `SignupForm` component currently stubs out the submit handler with a `console.log`. This plan wires it to Firebase Authentication (`createUserWithEmailAndPassword`), generates a random PascalCase codename for the new user, sets it as their Firebase `displayName`, and writes a lean Firestore document (`id` + `codename`) to the `users` collection. No email is stored in Firestore. Only the Firebase Web SDK is used.

Spec open questions are already answered inline in [_specs/signup-firebase-auth.md](../_specs/signup-firebase-auth.md):
- Codename logic lives in a separate utility file `lib/codename.ts`.
- On success, redirect immediately to `/heists`.
- If the Firestore write fails, log the error and redirect anyway.

Relevant existing pieces to reuse:
- [lib/firebase.ts](../lib/firebase.ts) already exports `auth` and `db`.
- [lib/auth.tsx](../lib/auth.tsx) (`AuthProvider` + `useUser`) listens to `onAuthStateChanged`, so the moment Firebase finishes creating the user, app-wide auth state is updated automatically — `SignupForm` does not need to poke any context manually; it only needs to `router.replace("/heists")` to leave the public route.
- [tests/lib/auth.test.tsx](../tests/lib/auth.test.tsx) shows the established pattern for mocking `firebase/auth` and `@/lib/firebase` with `vi.mock`. Mirror it for the new tests.
- Global error colour token `text-error` (`#FF6467`) is defined in [app/globals.css](../app/globals.css).

---

## Files to Create

### 1. `lib/codename.ts`
Export `generateCodename(): string`.

- Three exported arrays of ~15 unique PascalCase words each:
  - `adjectives` (e.g. `Silent`, `Crimson`, `Ghost`, `Hollow`, `Neon`, …)
  - `colours` (e.g. `Amber`, `Cobalt`, `Obsidian`, `Scarlet`, `Indigo`, …)
  - `animals` (e.g. `Fox`, `Raven`, `Cobra`, `Lynx`, `Viper`, …)
- Pick one word at random from each via `Math.floor(Math.random() * arr.length)`.
- Concatenate the three (no separator; already capitalised). Example: `"SilentAmberFox"`.

### 2. `tests/lib/codename.test.ts`
- Returns a non-empty string with no whitespace or punctuation.
- Result decomposes into one word from each of the three arrays (re-import the arrays and verify membership of the three slices).
- Repeated calls (e.g. 50 iterations) produce at least a few distinct values — proves randomness without being flaky.

---

## Files to Modify

### 3. `components/SignupForm/SignupForm.tsx`

**New imports:**
- `useRouter` from `next/navigation`
- `createUserWithEmailAndPassword`, `updateProfile`, `FirebaseError`-ish typing (use `unknown` + narrowing — no need to import the type) from `firebase/auth`
- `doc`, `setDoc` from `firebase/firestore`
- `auth`, `db` from `@/lib/firebase`
- `generateCodename` from `@/lib/codename`

**New state:**
- `isLoading: boolean` — disables the submit button during the in-flight request.
- `error: string` — inline error message displayed above the submit button.

**Replace `handleSubmit`** with an async handler:
1. `e.preventDefault()`, clear `error`, set `isLoading = true`.
2. `const { user } = await createUserWithEmailAndPassword(auth, email, password)`.
3. `const codename = generateCodename()`.
4. `await updateProfile(user, { displayName: codename })`.
5. Inner try/catch around `setDoc(doc(db, "users", user.uid), { id: user.uid, codename })`. On failure, `console.error("Failed to write user document", err)` — do **not** surface this to the user; redirect proceeds.
6. `router.replace("/heists")`.
7. Outer `catch (err: unknown)` for the auth call: `setError(mapFirebaseError(err))`, `setIsLoading(false)`. Note: on the success path we do **not** clear `isLoading` because we are navigating away.

**`mapFirebaseError(err: unknown): string`** (small private function in the same file):
- Narrow with `typeof err === "object" && err !== null && "code" in err`.
- `auth/email-already-in-use` → `"That email is already registered."`
- `auth/weak-password` → `"Password is too weak."`
- fallback → `"Something went wrong. Please try again."`

**JSX changes:**
- Submit button: add `disabled={isLoading}`; label becomes `"Signing up…"` while loading.
- Render `{error && <p role="alert" className={styles.error}>{error}</p>}` immediately above the submit button.

### 4. `components/SignupForm/SignupForm.module.css`
Add:
```css
.error {
  @apply text-sm text-error;
}
```

### 5. `tests/components/SignupForm.test.tsx`

Module-level mocks (following the pattern in [tests/lib/auth.test.tsx](../tests/lib/auth.test.tsx)):
- `vi.mock("firebase/auth", () => ({ createUserWithEmailAndPassword: vi.fn(), updateProfile: vi.fn() }))`
- `vi.mock("firebase/firestore", () => ({ doc: vi.fn((_db, col, id) => ({ col, id })), setDoc: vi.fn() }))`
- `vi.mock("@/lib/firebase", () => ({ auth: {}, db: {} }))`
- `vi.mock("@/lib/codename", () => ({ generateCodename: () => "TestCobaltFox" }))`
- `vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: replaceMock }) }))` — define `replaceMock` at module scope so each test can assert against it.

**Keep:**
- `renders email, password, confirm-password, and submit button`
- `blocks submission and sets a custom validity message when passwords do not match`
- `renders a cross-link to /login`

**Replace** the `logs email and password on submit` test with:
- `calls createUserWithEmailAndPassword with the entered email and password`

**Add:**
- On success: `updateProfile` called with `{ displayName: "TestCobaltFox" }`.
- On success: `setDoc` called with `(<doc-ref for users/<uid>>, { id: <uid>, codename: "TestCobaltFox" })`.
- On success: `replaceMock` called with `"/heists"`.
- When `createUserWithEmailAndPassword` rejects with `{ code: "auth/email-already-in-use" }`: `"That email is already registered."` appears on screen via `role="alert"`; no redirect.
- When `createUserWithEmailAndPassword` rejects with `{ code: "auth/weak-password" }`: `"Password is too weak."` appears on screen.
- Submit button is disabled while the request is in-flight: configure `createUserWithEmailAndPassword` to return a never-resolving promise, click submit, assert `button.disabled === true` and label is `"Signing up…"`.

---

## Verification

```bash
npx vitest run tests/lib/codename.test.ts
npx vitest run tests/components/SignupForm.test.tsx
npm run lint
```

Then `npm run dev` and manually:
1. Visit `/signup`, submit with a fresh email → lands on `/heists`; the navbar (driven by `useUser`) shows the new codename via Firebase `displayName`.
2. Submit again with the same email → inline `"That email is already registered."` error appears, no navigation.
3. Open Firestore console → confirm a `users/<uid>` doc exists with `{ id, codename }` and no `email` field.
