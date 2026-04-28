# Plan: Auth Forms (Login + Signup)

## Context

The `/login` and `/signup` pages under `app/(public)/` currently render only a heading inside the public layout — no actual forms. This plan implements the spec at `_specs/auth-forms.md`: two separate client-side form components that collect credentials, validate with native HTML5 constraints, and `console.log` the submission (no backend). The goal is a realistic UI scaffold that another iteration can later wire to real auth.

The spec's inline open-question answers shape the design:
- **Two separate components** (`LoginForm`, `SignupForm`) — not one parameterized component
- **Light validation** via HTML5 attributes only
- **Confirm-password** field on signup (only non-trivial JS — uses `setCustomValidity` to compare fields)
- **Browser-default** password input — no custom Eye/EyeOff toggle. This intentionally overrides the AC item that mentioned an inline icon button.
- **Native HTML5 validation tooltips** for errors — no custom toast/popup
- **Cross-link inside** the form component, below the submit button

## File-by-file changes

### New: `components/LoginForm/LoginForm.tsx`
- First file in the repo with `"use client"`.
- Imports: `useState` from `react`, `Link` from `next/link`, `styles` from `./LoginForm.module.css`.
- State: `email`, `password`.
- `handleSubmit(e)`: `e.preventDefault()` then `console.log("login", { email, password })`.
- JSX: `<form onSubmit={handleSubmit} className={styles.form}>` containing
  1. Email label + `<input id="login-email" name="email" type="email" required autoComplete="email">` (controlled).
  2. Password label + `<input id="login-password" name="password" type="password" required minLength={8} autoComplete="current-password">` (controlled). No custom toggle — browser default.
  3. `<button type="submit" className="btn">Log in</button>` — reuses the global `.btn` utility.
  4. `<p className={styles.crossLink}>Don't have an account? <Link href="/signup">Sign up</Link></p>`.

### New: `components/LoginForm/LoginForm.module.css`
- First line: `@reference "../../app/globals.css";` (mirrors `Avatar.module.css`).
- `.form` — `@apply flex flex-col gap-4 max-w-md mx-auto bg-light p-6 rounded-xl;`
- `.form label` — `@apply text-sm font-medium text-heading;`
- `.form input` — `@apply bg-lighter text-heading rounded-md px-3 py-2 border border-transparent focus:border-primary focus:outline-none invalid:border-error;`
- `.crossLink` — `@apply text-sm text-body text-center mt-2;` with nested `a { @apply text-primary hover:text-secondary underline; }`
- All tokens are confirmed present in `app/globals.css` (`@theme` block).

### New: `components/LoginForm/index.ts`
One line: `export { default } from "./LoginForm"` — matches existing barrel convention.

### New: `components/SignupForm/SignupForm.tsx`
- `"use client"`. Imports add `useRef`.
- State: `email`, `password`, `confirmPassword`. Plus `confirmRef = useRef<HTMLInputElement>(null)`.
- **Confirm-password validation** (the only non-trivial JS):
  - On confirm input change: `setConfirmPassword(v); e.target.setCustomValidity(v && v !== password ? "Passwords do not match" : "")`.
  - On password input change: also call `confirmRef.current?.setCustomValidity(...)` so editing the first password re-evaluates the confirm field.
  - Error surfaces via the native HTML5 popup when the user clicks Sign up — matches the user's "top pop-up message" answer without any custom UI.
- `handleSubmit(e)`: `e.preventDefault()` then `console.log("signup", { email, password })`. Confirm value is not logged (it's a UI-only constraint).
- JSX: same shape as LoginForm, but
  - Password `autoComplete="new-password"` + `minLength={8}`.
  - Adds confirm-password input with `id="signup-confirm-password"`, `type="password"`, `required`, `minLength={8}`, `autoComplete="new-password"`, `ref={confirmRef}`.
  - Submit label "Sign up".
  - Cross-link: `Already have an account? <Link href="/login">Log in</Link>`.

### New: `components/SignupForm/SignupForm.module.css`
Identical content to `LoginForm.module.css`. Duplication is intentional — see "Sub-component decision" below.

### New: `components/SignupForm/index.ts`
`export { default } from "./SignupForm"`.

### Modified: `app/(public)/login/page.tsx`
- Stays a server component.
- Add `import LoginForm from "@/components/LoginForm"`.
- Keep the existing `center-content` / `page-content` wrapper and the h1 "Log in to Your Account".
- Render `<LoginForm />` directly under the heading.
- Side fix: rename the function from `SignupPage` (copy-paste bug) to `LoginPage`.

### Modified: `app/(public)/signup/page.tsx`
- Stays a server component.
- Add `import SignupForm from "@/components/SignupForm"`.
- Replace `<h2 className="form-title">Signup for an Account</h2>` with `<h1 className="form-title">Sign up for an Account</h1>` — promotes to h1 to match login's heading hierarchy and fixes "Signup" (noun) → "Sign up" (verb) to parallel "Log in to Your Account".
- Render `<SignupForm />`.

### New: `tests/components/LoginForm.test.tsx`
Vitest globals + RTL + `@testing-library/user-event`. Cases:
- Renders email input, password input, submit button (`getByRole`/`getByLabelText`).
- Submit logs to console: `vi.spyOn(console, "log")`, `userEvent.type` into both fields, click submit, assert called with `("login", { email, password })`.
- Submit is blocked when fields are empty (form's required constraints prevent submission; `console.log` not called).
- Cross-link to `/signup` is present with correct `href`.

### New: `tests/components/SignupForm.test.tsx`
Mirrors the above plus:
- Renders confirm-password field (`getByLabelText(/confirm password/i)`).
- Mismatched confirm: type different values, click submit, assert `console.log` not called and the confirm input's `validationMessage` equals `"Passwords do not match"`.
- Matching confirm: type matching values, submit, assert `console.log("signup", { email, password })`.
- Cross-link to `/login`.

## Sub-component decision: duplication, not extraction

Recommend duplication. Extracting a shared `EmailField` / `PasswordField` would force prop-drilled `id`, `name`, `autoComplete`, controlled `value`/`onChange`, plus a `ref` for the signup case — more code than the markup it replaces. The user explicitly answered "2 components". Two ~60-line files are clearer than one indirection layer.

## Conventions reused (no new utilities)

- Existing `.btn`, `.form-title`, `.center-content`, `.page-content` from `app/globals.css`.
- Theme tokens from the `@theme` block: `bg-primary`, `bg-secondary`, `bg-light`, `bg-lighter`, `text-heading`, `text-body`, `text-error`.
- Component folder pattern (`Name.tsx` + `Name.module.css` + `index.ts` barrel) — mirrors `Avatar/` and `Navbar/`.
- `next/link` (Navbar precedent for client-side nav) — no `next/navigation` needed (no programmatic routing).

## Critical files

- `components/LoginForm/LoginForm.tsx` (new)
- `components/SignupForm/SignupForm.tsx` (new)
- `app/(public)/login/page.tsx` (modify)
- `app/(public)/signup/page.tsx` (modify)

## Risks & accepted trade-offs

1. **Native validity popup on submit only** — the password-mismatch message appears only when the user clicks Sign up, not while typing. The `invalid:border-error` Tailwind variant gives a visual cue after first submit attempt. Consistent with "light validation".
2. **jsdom and constraint validation** — `requestSubmit`/native popups have partial jsdom support. If the "submit blocked when invalid" test is flaky via `userEvent.click`, fall back to asserting `form.checkValidity()` directly.
3. **Browser-default reveal control** — Edge/Safari/IE render a built-in reveal button on `type=password`; Chrome/Firefox don't. The user accepted this when answering "browser default".
4. **Heading level change on `/signup`** — promoting h2→h1 changes the landmark structure. No code in the repo currently depends on the existing h2.
5. **`type="email"` is permissive** — accepts `a@b`. Acceptable under "light validation".

## Verification

1. `npm run lint` — passes.
2. `npx vitest run tests/components/LoginForm.test.tsx tests/components/SignupForm.test.tsx` — all tests pass.
3. `npm run build` — type-checks and builds cleanly.
4. `npm run dev`, then manually:
   - Visit `/login`, leave fields blank, click Log in → native validation popup. Fill in `a@b.c` + 8-char password, submit → see `["login", { email, password }]` in browser console.
   - Click the "Sign up" cross-link → routes to `/signup` with no full reload (Network tab shows no document request).
   - On `/signup`, type two different passwords and submit → "Passwords do not match" popup. Fix to match → submit logs `["signup", { email, password }]`.
   - Switch back via the "Log in" cross-link.
