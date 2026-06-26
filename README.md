# @yasser172/tec-auth

Shared authentication layer for the **TEC Federated Platform**. Provides Pi SSO
hooks, cookie parsing, refresh/logout helpers, and Next.js middleware for all TEC
apps (Hub, Ecommerce, Assets, Commerce).

> SSO is **cookie-based** — the Hub sets HttpOnly cookies and every app reads them.
> This package never stores tokens in `localStorage`/`sessionStorage` (ADR-001).

---

## Install

```bash
npm install @yasser172/tec-auth
```

**Peer dependencies:** `next >=15`, `react >=18`, `react-dom >=18`.

---

## Quick start

```tsx
'use client';
import { usePiAuth } from '@yasser172/tec-auth';

export function Profile() {
  const { user, token, isAuth, loading } = usePiAuth();
  if (loading) return <p>Loading…</p>;
  if (!isAuth) return <a href="/login">Sign in</a>;
  return <p>Welcome, {user?.piUsername}</p>;
}
```

### Reading the session (anywhere)

```ts
import { getStoredUser, getAccessToken, hasValidSession } from '@yasser172/tec-auth';

const user  = getStoredUser();    // parses the tec_user cookie
const token = getAccessToken();   // tec_access_token cookie
const ok    = hasValidSession();  // both present
```

### SSO redirect (non-Hub apps)

```ts
import { ssoRedirect } from '@yasser172/tec-auth';

// Bounces to hub.tecosystem.app/login?return_url=<current> when unauthenticated.
ssoRedirect();
```

### Authenticated fetch + refresh

```ts
import { fetchWithAuth, refreshAccessToken, logout } from '@yasser172/tec-auth';

const res = await fetchWithAuth('/api/bff/wallet/balance'); // auto-refreshes on 401
```

### Middleware (protected routes)

The `./middleware` subpath exports Next.js middleware helpers for guarding routes
and forwarding session cookies:

```ts
import { /* middleware helpers */ } from '@yasser172/tec-auth/middleware';
```

---

## API

| Export | Description |
|--------|-------------|
| `usePiAuth()` | React hook → `{ user, token, isAuth, loading }` |
| `getStoredUser()` | Parses the `tec_user` cookie → `TecUser \| null` |
| `getAccessToken()` / `getCsrfToken()` | Read auth/CSRF cookies |
| `hasValidSession()` | `true` when user + access token present |
| `ssoRedirect()` / `buildSsoUrl()` | Redirect to Hub login with `return_url` |
| `refreshAccessToken()` / `fetchWithAuth()` / `logout()` | Token lifecycle |
| `isPiBrowser()` / `waitForPiSDK()` / `loginWithPi()` | Pi Browser helpers (Hub) |
| `@yasser172/tec-auth/middleware` | Next.js middleware for protected routes |

**Cookie contract (LOCKED):** `tec_access_token`, `tec_csrf`, `tec_user`.

---

## Rules

- HttpOnly cookies only — **never** `localStorage` (ADR-001).
- Token **verification** happens in `tec-auth-service`, never in this package.
- Cookie names are LOCKED — renaming requires a coordinated deploy across all apps.

---

## Development

```bash
npm run build              # tsup → dist/ (ESM + CJS + .d.ts)
npm run test               # vitest
npx vitest run --coverage  # coverage (floor: 80%)
npm run typecheck          # tsc --noEmit
```

## License

[MIT](./LICENSE) © TEC
