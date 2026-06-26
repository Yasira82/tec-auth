# Changelog

All notable changes to `@yasser172/tec-auth` are documented here.
This package follows semantic versioning.

## [1.1.1] — 2026-06-26

### Added
- Proper README (was empty on npm); LICENSE (MIT) file; CHANGELOG in published files.
- `engines` (node ≥20), `sideEffects: false` metadata.
- npm publish provenance (`--provenance` + `id-token: write`).
- Dependabot config (npm + github-actions, weekly).

### Changed
- `tsconfig`: enabled `noUncheckedIndexedAccess`; guarded `timingSafeStringEqual`
  index access (behavior-identical).

## [1.1.0] — 2026-06-22

### Fixed (platform CSRF correctness — the headline change)
- **Middleware CSRF now trusts a request if the double-submit token matches *OR*
  the request is first-party** (Origin host === Host, or ends with the trusted
  origin suffix). v1.0.0 enforced **pure double-submit only**, which **403'd
  legitimate Mode-2 Pi-Browser payments** — Pi Browser drops the `sameSite=None`
  CSRF cookie, so the double-submit check could never pass. This is the
  package-level fix of the platform's CSRF regression (KB C-12 §11).
  - `csrfCookie !== csrfHeader` as the *sole* gate is gone.
  - A route may still *forward* `x-csrf-token` downstream; it must never *validate* it.

### Added
- `isTrustedCsrf(req, trustedOriginSuffix = '.tecosystem.app')` — exported helper
  implementing the "double-submit OR first-party Origin" rule.
- `trustedOriginSuffix?` config option on `createAuthMiddleware` (default
  `.tecosystem.app`; set `''` to require same-origin / token only).
- Real CI (`ci.yml`: typecheck + test + build) + CodeQL; `publish.yml` publishes
  to npm on GitHub Release.

### Quality
- Coverage gate raised to **80%**; current: 95% statements / 93.5% branch / 100% lines.
- 25 middleware/cookie/sso/refresh tests.

### Migration (consumers) — AFTER this version is published
1. Bump to `@yasser172/tec-auth@^1.1.0` in the 4 apps + `tec-template-base`.
2. Apps that ship an *inline* `isTrustedCsrf` middleware may migrate to the
   package middleware (DRY). **Do not migrate before publish** — pulling the old
   `1.0.0` re-introduces the payment-breaking pure double-submit check.

### Cookie contract (unchanged — LOCKED)
`tec_access_token` · `tec_csrf` · `tec_user` — names are locked; any change is a
coordinated platform-wide deploy.

## [1.0.0] — 2026-06

- Initial: Pi SSO hooks (`usePiAuth`), cookie helpers (`getStoredUser`,
  `getAccessToken`, `ssoRedirect`), and Next.js auth middleware.
- Known issue (fixed in 1.1.0): pure double-submit CSRF rejected Mode-2 Pi-Browser payments.
