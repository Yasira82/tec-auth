# @yasser172/tec-auth — Claude Code Instructions

## What This Package Is

Shared authentication layer for the TEC Federated Platform.
Provides Pi SSO hooks, cookie parsing, middleware, and session utilities
for all TEC Next.js apps (Hub, Ecommerce, Assets, Commerce).

**P1 Violation NEW-D: Zero tests. Writing tests is the top priority in this repo.**

---

## Stack

- TypeScript strict (tsup build)
- Vitest for testing
- No Pi SDK direct calls — SSO is cookie-based (set by Hub)

---

## Key Exports

```
src/
  hooks/      # usePiAuth(), useSession()
  client/     # getStoredUser(), getAccessToken(), ssoRedirect()
  middleware/ # Next.js middleware helpers for protected routes
  types/      # User, Session, AuthState, TecClaims types
```

### Critical Functions
```typescript
getStoredUser()     // reads + JSON.parses tec_user cookie
getAccessToken()    // reads tec_access_token cookie
ssoRedirect(url)    // redirects to Hub login with return_url
usePiAuth()         // React hook: { user, token, isAuth, loading }
```

---

## Auth Pattern (ADR-001 + ADR-006)

```
Hub.tecosystem.app login
  → sets HttpOnly cookies: tec_access_token, tec_csrf, tec_user
  → all TEC apps read cookies (NEVER localStorage)
  → CSRF token required on all POST/PUT/DELETE BFF routes
```

---

## Active P1 Violation

| ID | Severity | Description | Priority |
|----|----------|-------------|----------|
| NEW-D | CRITICAL | Zero tests in the auth layer | **FIX FIRST** |

### Required Test Coverage
1. `getStoredUser()` — null cookie, malformed JSON, valid JSON, missing fields
2. `getAccessToken()` — missing cookie, expired token format, valid token
3. `ssoRedirect()` — redirect URL construction with/without return_url
4. `usePiAuth()` — hook states: loading → authenticated → unauthenticated
5. Middleware — protected route blocked, public route allowed, cookie forwarding

---

## Development Commands

```bash
npm run build       # tsup build → dist/
npx vitest          # Run tests (TARGET: 80%+ coverage before any new feature)
npm run type-check  # TypeScript strict check
```

---

## What NOT To Do

- Do NOT store tokens in localStorage or sessionStorage (ADR-001)
- Do NOT call `Pi.authenticate()` — this package is SSO/cookie only
- Do NOT add app-specific auth logic — keep all exports generic
- Do NOT ship any change to this package without tests
- Do NOT bypass cookie reading with direct API calls

---

## Commit Convention

```
test(auth):   PRIORITY — add missing test coverage
fix(auth):    bug fix
feat(auth):   new capability (after tests exist)
refactor:     no behavior change
chore:        build/config
```

## Platform Context

Full platform context, ADR system, and engineering roadmap:
→ `TEC_MODELS_PAT.prompt.yml` in yasira82/tec-app (branch: claude/ecommerce-engineering-review-EuiQO)
→ `TEC_Ecosystem_AI_Key.prompt.yml` in yasira82/tec-app
