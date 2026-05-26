# Spec for login-form-auth

branch: claude/feature/login-form-auth
figma_component (if used): n/a

## Summary

Wire the existing login form in `app/(public)/login/` to Firebase Authentication so that submitting the form with valid credentials signs the user in via Firebase Email/Password auth. After a successful sign-in, the form shows an inline success message in place of (or alongside) the form. No redirect is performed for now — the user remains on `/login`. Invalid credentials and other Firebase errors are surfaced as inline error messages, following the same pattern already used by the signup form.

## Figma Design Reference (only if referenced)

Not applicable — no Figma reference was provided. Visual styling reuses the existing `LoginForm` markup, the shared `form-title` heading, and the global `.btn` / form styles defined in `app/globals.css` and `components/LoginForm/LoginForm.module.css`.

## Possible Edge Cases

- User submits with empty email or empty password — HTML5 `required` validation should prevent submission; no Firebase call is made.
- User submits with a malformed email — HTML5 `type="email"` validation blocks submit.
- User submits with a password shorter than 8 characters — HTML5 `minLength` validation blocks submit.
- Email is not registered in Firebase (`auth/user-not-found` / `auth/invalid-credential`) — show a friendly inline error, keep the form interactive.
- Password is wrong for an existing account (`auth/wrong-password` / `auth/invalid-credential`) — show a friendly inline error, keep the form interactive.
- Account has been disabled (`auth/user-disabled`) — show a friendly inline error.
- Too many failed attempts (`auth/too-many-requests`) — show a friendly inline error telling the user to wait and try again.
- Network failure or unknown Firebase error — show a generic fallback error message.
- User clicks "Log in" twice in quick succession — submit button is disabled while the request is in flight to prevent duplicate calls.
- User who is already signed in lands on `/login` and submits — sign-in still completes successfully; behaviour is the same (success message is shown).
- After a successful login, user changes the email or password input — the success message should remain unaffected for this iteration (we are not adding "sign out" or "sign in as different user" controls here).
- Firebase emulator vs. production — the form should not care which environment `lib/firebase.ts` connects to.

## Acceptance Criteria

- Submitting the login form with a registered email and matching password calls Firebase `signInWithEmailAndPassword` using the shared `auth` instance from `lib/firebase.ts`.
- On a successful sign-in, the form displays a clearly visible success message (e.g. "You are logged in.") in place of the form, or directly below it, using a styling treatment consistent with existing form messages.
- The success message must be accessible — exposed to assistive tech via an appropriate live region or `role` (mirroring how the signup form exposes its error).
- The page does NOT navigate or redirect after a successful login. The user remains on `/login`.
- The submit button is disabled and shows a loading label (e.g. "Logging in…") while the Firebase call is pending.
- On any Firebase error, an inline error message is shown using the same visual treatment as the signup form's error (`role="alert"`, styled error text), and the form remains interactive so the user can try again.
- Firebase error codes are mapped to friendly messages at a minimum for: invalid credentials (wrong email or password), disabled account, and too-many-requests. All other errors fall back to a generic "Something went wrong" message.
- The page-level heading ("Log in to Your Account") and the existing input fields, labels, and "Sign up" cross-link continue to render unchanged.
- No new dependencies are added; the feature uses the already-installed `firebase` package and existing `lib/firebase.ts` helpers.
- The existing `app/(public)/login/page.tsx` continues to render `<LoginForm />` — no structural change to the route is required.

## Open Questions

- Should the success message replace the entire form, or appear underneath the form with the inputs cleared/disabled? (Default assumption: replace the form with the success message so the user has a single clear confirmation.) - replace the form with the success message so the user has a single clear confirmation.
- Exact success copy — "You are logged in." vs. "Welcome back!" vs. something else? (Default assumption: "You are logged in.") - You are logged in.
- Should the form clear the password field after a failed login? (Default assumption: leave fields untouched so the user can correct typos.) - leave fields untouched so the user can correct typos.
- Do we want a "Forgot password?" link in this iteration? (Default assumption: no — out of scope.) no — out of scope.
- Should the form auto-focus the email input on mount? (Default assumption: no change from current behaviour.) yes

## Testing Guidlines

Create a test file in the `./tests/components/` folder named `LoginForm.test.tsx` (or extend it if it already exists), and create meaningful tests for the following cases, without going too heavy. Mock the Firebase `signInWithEmailAndPassword` function (and the `auth` import) so tests do not hit the network.

- Renders the email input, password input, and submit button.
- Submitting with valid credentials calls `signInWithEmailAndPassword` once with the entered email and password.
- After a successful sign-in, a success message is visible to the user and is exposed to assistive tech.
- After a successful sign-in, no navigation/redirect occurs (i.e. `useRouter().replace` / `push` is not called).
- While the Firebase call is pending, the submit button is disabled and shows the loading label.
- A Firebase `auth/invalid-credential` (or equivalent wrong-password / user-not-found) error renders a friendly inline error message and leaves the form interactive.
- A generic / unknown Firebase error falls back to the generic "Something went wrong" message.
- The submit handler does not call Firebase if HTML5 validation would block submission (e.g. empty email) — covered implicitly by relying on native validation; an explicit test is optional.
