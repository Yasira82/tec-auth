# @yasser172/tec-auth — Claude Code Instructions

## What This Package Is

Shared authentication layer for the TEC Federated Platform.
Provides Pi SSO hooks, cookie parsing, middleware, and session utilities
for all TEC Next.js apps (Hub, Ecommerce, Assets, Commerce).

**Test coverage is the top priority — NEVER ship without tests.**

---

## Package vs Service Distinction

```
@yasser172/tec-auth  (THIS REPO)  = npm package
  → cookie parsing, SSO hooks, middleware helpers
  → consumed by ALL TEC frontend apps
  → tests target: ≥ 80% (SEPARATE from service)

tec-auth-service  (tec-core-backend) = backend microservice
  → Pi identity verification, JWT issuance
  → ✅ NEW-D CLOSED — 95% stmt / 92.98% branch coverage
```

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

## Kernel Spec — Auth Invariants (C-47)

### Auth-Specific Invariants
```
1. Identity always resolves to ONE principal (never ambiguous)
2. Session JWT must be verified — NEVER decoded without verification
3. No state mutation without actor context (auth ops = sensitive)
4. Every auth action (login/logout/refresh) has audit trail
5. Fail Closed (P6): missing or invalid session → deny by default
```

### Consistency Requirement
```
Identity reads = STRONG consistency (Principal must always resolve correctly)
Auth state changes = synchronous — NEVER eventual consistency
```

### Sensitive Operations (ActorContext REQUIRED)
```
login, logout, refresh, token issuance
→ Missing ActorContext on these → REJECT (P6)
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

## Required Test Coverage

| Function | Scenarios to cover |
|----------|-------------------|
| `getStoredUser()` | null cookie, malformed JSON, valid JSON, missing fields |
| `getAccessToken()` | missing cookie, expired token format, valid token |
| `ssoRedirect()` | URL construction with/without return_url |
| `usePiAuth()` | loading → authenticated → unauthenticated transitions |
| Middleware | protected route blocked, public route allowed, cookie forwarding |

**Target: ≥ 80% coverage. No PR merges without test evidence.**

---

## Development Commands

```bash
npm run build              # tsup build → dist/
npx vitest --coverage      # Run tests with coverage report
npm run type-check         # TypeScript strict check
```

---

## What NOT To Do

- Do NOT store tokens in localStorage or sessionStorage (ADR-001)
- Do NOT call `Pi.authenticate()` — this package is SSO/cookie only
- Do NOT add app-specific auth logic — keep all exports generic
- Do NOT ship any change to this package without tests
- Do NOT bypass cookie reading with direct API calls
- Do NOT rename cookie names (`tec_access_token`, `tec_csrf`, `tec_user`) — LOCKED
- Do NOT decode JWT without verification (`jwt.decode()` is FORBIDDEN — Policy CI blocks it)
- Do NOT call `getStoredUser()` or `getAccessToken()` in Server Components or API Routes — client-only
- Do NOT confuse Pi token with TEC JWT — they are issued by different systems for different APIs
- Do NOT add any new exported function without tests — coverage ≥ 80% is a hard CI block

---

## Commit Convention

```
test(auth):   PRIORITY — add missing test coverage
fix(auth):    bug fix
feat(auth):   new capability (after tests exist)
refactor:     no behavior change
chore:        build/config
```

---

## Platform Orchestra — This Repo

**Role:** Auth Package (npm) — trust backbone consumed by ALL TEC frontend apps
**Consumers:** tec-app (Hub) · tec-ecommerce · tec-assets · tec-commerce
**Layer:** Platform-wide — breakage here = platform-wide incident

```
tec-app, tec-ecommerce, tec-assets, tec-commerce
  → import @yasser172/tec-auth
      → getStoredUser(), getAccessToken() → reads Hub-set cookies
      → ssoRedirect() → bounces to Hub login
      → usePiAuth() → React hook for auth state
```

---

## Commercial Targets

- Test coverage ≥ 80% before any new capability ships
- Zero silent regressions — failure scenarios must be tested
- Cookie contract with Hub: LOCKED — any change requires coordinated deploy across ALL apps
- ssoRedirect must always point to `hub.tecosystem.app/login?return_url=...`

---

## Common Debug Patterns

### "getStoredUser() returns null despite user being logged in"
```
Symptom: usePiAuth() shows isAuth=false, user=null, but Hub shows user logged in.
Cause A: tec_user cookie not set or expired on this domain (domain mismatch).
Cause B: Cookie value is malformed JSON — encoding issue during Hub login.
Cause C: getStoredUser() called server-side — document not available in Node.js.
Fix A:   Hub must set tec_user cookie on correct domain. Check in DevTools > Application > Cookies.
Fix B:   getStoredUser() wraps JSON.parse in try-catch — check raw cookie value.
Fix C:   This function is CLIENT-ONLY. Never call in Server Components or API routes.
```

### "SSO redirect loop — app keeps redirecting to Hub login"
```
Symptom: User completes Hub login, immediately redirected back to login screen.
Cause A: return_url not preserved — ssoRedirect() called without current URL.
Cause B: tec_access_token cookie not set after Hub login (CORS or domain mismatch).
Fix:     Always call: ssoRedirect(window.location.href)
         After Hub login, verify tec_access_token in DevTools > Application > Cookies.
         Cookie domain must match app's domain (tecosystem.app or subdomain).
```

### "CI coverage drops below 80% — PR blocked"
```
Symptom: PR fails: "Coverage X% — below 80% threshold. Hard block."
Cause:   New function added without tests, or existing test file removed.
Fix:     Coverage is a HARD BLOCK — pipeline fails, cannot merge.
         Run: npx vitest --coverage — look for uncovered lines.
         Priority: getStoredUser() null/malformed/missing scenarios.
         Commit order: test(auth) FIRST, then feat(auth).
```

### "Token appears valid but gateway returns 401"
```
Symptom: Authorization header has a token, but gateway or auth-service returns 401.
Cause A: Pi token used instead of TEC JWT — different formats, different issuers.
Cause B: TEC JWT expired — getAccessToken() returns stale cookie value.
Cause C: jwt.decode() used somewhere — FORBIDDEN, Policy CI should block it.
Fix:     TEC JWT = tec_access_token cookie (issued by tec-auth-service).
         Pi token = from Pi.authenticate() — NEVER use for TEC internal APIs.
         On 401: trigger SSO refresh via /api/auth/refresh endpoint.
```

---

## Risk Register

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| R1 | Silent regression in `getStoredUser()` | P0 | Test: null, malformed, missing fields — ALL edge cases |
| R2 | `ssoRedirect` wrong URL format | P1 | Test with/without return_url — exact URL assertion |
| R3 | `usePiAuth` state leak between renders | P1 | Test loading → auth → unauth transitions |
| R4 | Ship without tests | P0 | BLOCKED — CI must show coverage before merge |
| R5 | Cookie name renamed (breaks all apps) | P0 | LOCKED — coordinate across all 4 apps |

---

## Platform Governance

### SHARED — Platform defines, this package implements
- Cookie names: `tec_access_token`, `tec_csrf`, `tec_user` — LOCKED, never rename
- SSO redirect target: Hub ONLY — `hub.tecosystem.app/login?return_url=...`
- Auth storage: HttpOnly cookies ONLY — never localStorage (ADR-001)
- Token validation: NEVER in this package — always via tec-auth-service

### SOVEREIGN — This package owns
- Hook API surface (`usePiAuth`, `useSession`)
- Cookie parsing implementation
- TypeScript types (`User`, `Session`, `AuthState`, `TecClaims`)
- Middleware helper implementation

---

## Release Gate Protocol

```bash
npx vitest --coverage   # ≥ 80% — HARD BLOCK if below
npm run type-check      # 0 errors
npm run build           # clean dist/ output
git status              # clean
git fetch origin claude/ecommerce-engineering-review-EuiQO
git rebase origin/claude/ecommerce-engineering-review-EuiQO
```

**Non-negotiable:** Zero coverage = zero ship.

---

## Platform Context

Full platform context, ADR system, and engineering roadmap:
→ `TEC_MODELS_PAT.prompt.yml` in yasira82/tec-app (branch: claude/ecommerce-engineering-review-EuiQO)
→ `TEC_Ecosystem_AI_Key.prompt.yml` in yasira82/tec-app
→ C-47 Kernel Spec — P6 Fail Closed, Auth Invariants
