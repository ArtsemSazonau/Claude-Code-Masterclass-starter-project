# Plan: login-form-auth

Spec: [_specs/login-form-auth.md](_specs/login-form-auth.md)
Branch: `claude/feature/login-form-auth`

## Context

The login page in [app/(public)/login/page.tsx](app/(public)/login/page.tsx) renders a `LoginForm` whose submit handler is still a placeholder — it just `console.log`s the credentials. Firebase Email/Password auth is already initialized in [lib/firebase.ts](lib/firebase.ts), and the SignupForm already demonstrates the project's accepted pattern (loading state, mapped error messages, `role="alert"`).

We will wire `LoginForm` to `signInWithEmailAndPassword`, swap the form for a success message on success (no redirect, per spec), surface mapped Firebase errors, and update the test file accordingly. Per the answered open questions in the spec: replace the form with the success message ("You are logged in."), leave fields untouched on failure, no "Forgot password?" link, and auto-focus the email input on mount.

## Files to change

1. [components/LoginForm/LoginForm.tsx](components/LoginForm/LoginForm.tsx) — primary change.
2. [components/LoginForm/LoginForm.module.css](components/LoginForm/LoginForm.module.css) — add `.error` and `.success` classes.
3. [tests/components/LoginForm.test.tsx](tests/components/LoginForm.test.tsx) — replace placeholder `console.log` tests with Firebase-mocked behaviour tests.

No changes needed to `app/(public)/login/page.tsx` or `lib/firebase.ts`.

## Implementation steps

### 1. `LoginForm.tsx` rewrite

Mirror the structure of [components/SignupForm/SignupForm.tsx](components/SignupForm/SignupForm.tsx), simplified for login:

- Add a local `mapFirebaseError(err)` helper. Handle these codes explicitly:
  - `auth/invalid-credential`, `auth/user-not-found`, `auth/wrong-password` → "Invalid email or password."
  - `auth/user-disabled` → "This account has been disabled."
  - `auth/too-many-requests` → "Too many attempts. Please wait a moment and try again."
  - fallback → "Something went wrong. Please try again."
- Component state: `email`, `password`, `isLoading`, `error`, `isLoggedIn` (boolean to flip view to success message).
- `handleSubmit`:
  - `e.preventDefault()`; clear `error`; set `isLoading(true)`.
  - `await signInWithEmailAndPassword(auth, email, password)` from `firebase/auth` using the shared `auth` from `@/lib/firebase`.
  - On success: `setIsLoggedIn(true)`; the form unmounts.
  - On error: `setError(mapFirebaseError(err))` and `setIsLoading(false)`. Leave `email`/`password` untouched.
- Auto-focus the email input on mount with a `ref` + `useEffect(() => emailRef.current?.focus(), [])`. Do not use the `autoFocus` attribute (jsx-a11y / SSR-fragile).
- Render branch:
  - If `isLoggedIn`: render `<p role="status" aria-live="polite" className={styles.success}>You are logged in.</p>` in place of the `<form>`. This replaces the entire form (per resolved open question).
  - Otherwise: render the form, with:
    - Error paragraph (`role="alert"`, `className={styles.error}`) when `error` is non-empty, placed above the submit button (mirroring SignupForm).
    - Submit button disabled while `isLoading`, label switches to "Logging in…".
    - Keep the existing "Don't have an account? Sign up" cross-link.
- Do NOT import `useRouter`; no navigation happens. (Tests verify this.)
- Keep `"use client"` directive on line 1.

### 2. `LoginForm.module.css`

Add `.error` and `.success` classes. Keep consistency with [components/SignupForm/SignupForm.module.css](components/SignupForm/SignupForm.module.css):

```
.error { @apply text-sm text-error; }
.success { @apply text-sm; color: var(--color-success); }
```

(`--color-success: #05DF72` is already defined in the `@theme` block of `app/globals.css`. Tailwind 4 doesn't generate a `text-success` utility from the custom token automatically, so use the CSS variable directly — that's why the success rule deviates slightly from the `.error` shape.)

### 3. `LoginForm.test.tsx` rewrite

Replace the placeholder file. Mirror the mocking pattern from [tests/components/SignupForm.test.tsx](tests/components/SignupForm.test.tsx):

```
const signInWithEmailAndPassword = vi.fn()
const replaceMock = vi.fn()
const pushMock = vi.fn()

vi.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: (...args) => signInWithEmailAndPassword(...args),
}))
vi.mock("@/lib/firebase", () => ({ auth: {} }))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
}))
```

`beforeEach`: reset mocks; `signInWithEmailAndPassword.mockResolvedValue({ user: { uid: "user-abc" } })`.

Tests to cover (one `it` block each):

1. Renders email input, password input, and submit button.
2. Calls `signInWithEmailAndPassword` once with the entered email + password on successful submit.
3. After successful submit, shows the success message ("You are logged in.") with `role="status"`; the form and submit button are no longer in the document.
4. After successful submit, neither `replaceMock` nor `pushMock` was called (no redirect).
5. Submit button is disabled and shows "Logging in…" while the promise is pending (use `mockImplementationOnce(() => new Promise(() => {}))`).
6. On `auth/invalid-credential`, shows a friendly inline error via `role="alert"` ("Invalid email or password.") and the form remains in the document and interactive.
7. On an unknown error code, falls back to "Something went wrong" — form remains interactive.
8. Renders cross-link to `/signup` (keep coverage from existing test).
9. (Optional, low value) Email input is focused on mount.

Drop the existing `console.log`-based tests.

## Verification

After implementation, in the project root:

1. `npm run test -- run` — full Vitest suite; new LoginForm tests pass and SignupForm tests still pass.
2. `npm run lint` — no new lint errors.
3. `npm run dev` — open `http://localhost:3000/login`:
   - Submit blank form → HTML5 validation blocks (no Firebase call).
   - Submit a registered user's credentials → form is replaced with "You are logged in." message; URL stays on `/login`.
   - Submit a wrong password → inline error "Invalid email or password." appears; form stays interactive; fields retain their values.
   - Submit while offline (DevTools → Network → Offline) → generic "Something went wrong." error.
4. Manually confirm the email input has focus on first page load.

## Out of scope (do not implement)

- "Forgot password?" link.
- Redirect to `/heists` after login.
- A "Sign out" or "Switch user" affordance from the success state.
- Any change to Firebase config, AuthProvider, or the login page wrapper.
