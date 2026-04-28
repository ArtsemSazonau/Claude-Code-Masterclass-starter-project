# Spec for auth-forms

branch: claude/feature/auth-forms

## Summary

Add authentication forms to the `/login` and `/signup` pages under `app/(public)/`. Each form collects an email and a password, with a toggle icon inside the password field that switches the input between hidden and visible. Each form has a single submit button labeled appropriately ("Log in" or "Sign up"). On submit, the form does not call any backend yet — it only logs the captured values to the browser console.

The two pages should share the underlying form layout so the visual experience and behavior stay consistent. Each page should also surface a clear link to switch to the other form (e.g. "Don't have an account? Sign up" on `/login`, and "Already have an account? Log in" on `/signup`).

## Possible Edge Cases

- User submits with empty email, empty password, or both.
- User submits with a malformed email (e.g. missing `@`).
- User submits with a very short password.
- User toggles password visibility multiple times mid-typing — the typed value must not be lost or reset.
- User clicks the visibility toggle while the password field is empty.
- User submits the form via the Enter key rather than the button.
- User rapidly clicks the submit button multiple times in succession.
- Browser autofill populates email/password without typing — submission still works and logs the autofilled values.
- Navigating between `/login` and `/signup` via the in-page switch link does not preserve field values (each page mounts its own form state).
- The visibility toggle icon must remain accessible (keyboard focusable, with a meaningful label) and not be mistaken for the submit button.

## Acceptance Criteria

- `/login` renders a form with an email field, a password field, and a "Log in" submit button.
- `/signup` renders a form with an email field, a password field, and a "Sign up" submit button.
- The password field on both pages contains an inline icon button that toggles the input type between `password` and `text`.
- The icon reflects current state (one icon when password is hidden, a different icon when password is visible).
- Submitting either form prevents the default browser navigation and logs an object containing the email and password values to the console. The log should clearly indicate which form fired (login vs. signup).
- Each page contains a visible link/button to navigate to the other form. Clicking it routes to the other page using client-side navigation.
- Both pages reuse a common form component or shared layout so styling and behavior stay aligned — duplication of input markup across the two pages should be avoided.
- Existing page heading on `/login` (h1 "Log in to Your Account") is preserved or replaced with an equivalent heading; the `/signup` page receives a comparable heading.
- Forms render correctly on the existing `(public)` layout and use the project's Tailwind theme tokens (primary purple, dark background, muted text) for visual consistency.

## Open Questions

- Should the shared form be implemented as a single `AuthForm` component parameterized by mode (`"login" | "signup"`), or as two thin page-level components that compose smaller shared parts (`EmailField`, `PasswordField`, `SubmitButton`)? - 2 components
- Should the email and password fields have any client-side validation now (e.g. HTML5 `required`, `type="email"`, minimum password length), or is validation explicitly out of scope until the backend lands? - Light validation
- Should the signup form include any additional fields beyond email and password (e.g. confirm password, display name)? The user input does not mention any. - Confirm passord
- What should the visibility toggle icons be? Suggest using `Eye` and `EyeOff` from `lucide-react` since `lucide-react` is already a dependency. - browser default
- Where should the live region / error messages render once real validation is added? (Useful to decide layout now even if not implemented yet.) - top pop-up message
- Should the cross-link between forms live inside the form component or outside it on the page? - Inside

## Testing Guidlines

Create a test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going to heavy:

- Renders the email field, password field, and submit button with the correct label for each mode (login vs. signup).
- The password field starts as type `password`; clicking the visibility toggle switches it to type `text`; clicking again switches it back.
- Submitting the form calls `console.log` with the entered email and password values, and the log identifies the mode (login vs. signup).
- Submitting does not trigger a full page reload (default form behavior is prevented).
- The cross-link to the other form is present and points to the correct route (`/signup` from `/login` and vice versa).
- The visibility toggle is reachable via keyboard and exposes an accessible name (e.g. "Show password" / "Hide password").
