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
  → sets cookies: tec_access_token, tec_csrf, tec_user (readable by script by decision —
    ADR-001; tec_refresh_token is the HttpOnly one)
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
- Auth storage: cookies ONLY — never localStorage. `tec_access_token` is not HttpOnly by decision (ADR-001)
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
git fetch origin main
git rebase origin/main
```

**Non-negotiable:** Zero coverage = zero ship.

---

## Platform Context

Full platform context, ADR system, and engineering roadmap:
→ `TEC_MODELS_PAT.prompt.yml` in yasira82/tec-app (branch: main)
→ `TEC_Ecosystem_AI_Key.prompt.yml` in yasira82/tec-app
→ C-47 Kernel Spec — P6 Fail Closed, Auth Invariants


---

## Skills

Available via plugin — invoke automatically when the situation matches:

| Situation | Skill |
|-----------|-------|
| Writing new feature or fixing a bug → use TDD | `/tdd` |
| Bug, regression, or unexpected behavior | `/diagnose` |
| Writing or modifying tests | `/test-guard` |
| Writing or modifying BFF routes, payment handlers, or API contracts | `/clean-code-guard` |
| Updating docs, CLAUDE.md, or knowledge-base entries | `/docs-guard` |
| Planning a new feature or architectural decision | `/grill-with-docs` |
| Breaking down a roadmap item into GitHub Issues | `/to-issues` |
| Session is getting long or context is filling up | `/handoff` |
| Adding pre-commit hooks to this repo | `/setup-pre-commit` |
