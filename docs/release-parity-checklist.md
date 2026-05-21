# VEROX Release Parity Checklist

This checklist prevents regressions where logged-in users see a different app version than logged-out users.

## 1) Canonical Domain (must pass before release)

- Production host is exactly: `abj-tv-platform-n7e8.vercel.app`
- Supabase `Site URL` is exactly: `https://abj-tv-platform-n7e8.vercel.app`
- Supabase Redirect URLs include:
  - `https://abj-tv-platform-n7e8.vercel.app/auth/callback`
  - (optional local dev) `http://localhost:3000/auth/callback`
- Supabase Redirect URLs do **not** include:
  - any `*.projects.vercel.app` URL
  - wildcard `*.vercel.app` entries

## 2) CI Guards (must be green)

- `npm run guard:canonical-hosts`
- `npm run lint`
- `npm run build`
- GitHub Actions workflow `CI` passes on PR.

## 3) Runtime Smoke Test (logged-out and logged-in)

Use a fresh incognito window and run these checks on:

- `https://abj-tv-platform-n7e8.vercel.app/live`

### URL and auth checks

- After Google login, URL host remains `abj-tv-platform-n7e8.vercel.app`
- Header does not show stale "Přihlásit zdarma" when user is authenticated.

### Live page order checks

- Section order is:
  1. Main player
  2. `Reakce diváků na toto video`
  3. Timeline
  4. Remaining sections

### Shared UI parity checks

- VEROX logo links to `/live`
- Header contains `VEROX - MAINSTREAMOVÝ DETOX`
- Footer is fully visible and contains `Studio` link
- Channel section loads videos (including fallback behavior)

## 4) Release rule

Do not merge or deploy if any item above fails.
