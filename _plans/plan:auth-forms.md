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
  - Error surfaces via the native HTML5 popup when the user clicks Sign up.
- `handleSubmit(e)`: `e.preventDefault()` then `console.log("signup", { email, password })`.
- JSX: same shape as LoginForm, but
  - Password `autoComplete="new-password"` + `minLength={8}`.
  - Adds confirm-password input with `id="signup-confirm-password"`, `type="password"`, `required`, `minLength={8}`, `autoComplete="new-password"`, `ref={confirmRef}`.
  - Submit label "Sign up".
  - Cross-link: `Already have an account? <Link href="/login">Log in</Link>`.

### New: `components/SignupForm/SignupForm.module.css`
Identical content to `LoginForm.module.css`.

### New: `components/SignupForm/index.ts`
`export { default } from "./SignupForm"`.

### Modified: `app/(public)/login/page.tsx`
- Add `import LoginForm from "@/components/LoginForm"`.
- Keep existing `center-content` / `page-content` wrapper and the h1 "Log in to Your Account".
- Render `<LoginForm />` under the heading.
- Rename the function from `SignupPage` to `LoginPage` (copy-paste fix).

### Modified: `app/(public)/signup/page.tsx`
- Add `import SignupForm from "@/components/SignupForm"`.
- Replace `<h2 className="form-title">Signup for an Account</h2>` with `<h1 className="form-title">Sign up for an Account</h1>`.
- Render `<SignupForm />`.

### New: `tests/components/LoginForm.test.tsx`
- Renders email input, password input, submit button.
- Submit logs to console with correct shape `("login", { email, password })`.
- Submit is blocked when fields are empty (`console.log` not called).
- Cross-link to `/signup` has correct `href`.

### New: `tests/components/SignupForm.test.tsx`
- Renders confirm-password field.
- Mismatched confirm: `validationMessage` equals `"Passwords do not match"`, `console.log` not called.
- Matching confirm: submit logs `("signup", { email, password })`.
- Cross-link to `/login`.

## Sub-component decision: duplication, not extraction

Two self-contained ~60-line files are clearer than a shared sub-component layer that requires prop-drilling `id`, `name`, `autoComplete`, `value`/`onChange`, and `ref`.

## Conventions reused

- Global classes: `.btn`, `.form-title`, `.center-content`, `.page-content`
- Theme tokens: `bg-light`, `bg-lighter`, `text-heading`, `text-body`, `text-primary`, `text-secondary`, `text-error`
- Component folder pattern: `Name.tsx` + `Name.module.css` + `index.ts` — mirrors `Avatar/` and `Navbar/`
- `next/link` for cross-links (Navbar precedent)

## Verification

1. `npm run lint` — passes.
2. `npx vitest run tests/components/LoginForm.test.tsx tests/components/SignupForm.test.tsx` — all tests pass.
3. `npm run build` — type-checks and builds cleanly.
4. `npm run dev`, then manually:
   - `/login`: leave blank → native validation popup; fill valid email + 8-char password → `console.log("login", {...})`.
   - Cross-link → `/signup` with no full page reload.
   - `/signup`: mismatched passwords → "Passwords do not match" popup; matching → `console.log("signup", {...})`.
