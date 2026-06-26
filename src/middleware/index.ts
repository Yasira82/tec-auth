import { NextRequest, NextResponse } from 'next/server';

const CSRF_SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const DEFAULT_PROTECTED_ROUTES = [
  '/hub', '/dashboard', '/profile', '/settings',
];

const DEFAULT_CSRF_PROTECTED = [
  '/api/auth/logout', '/api/auth/refresh',
  '/api/wallet',      '/api/payment',
  '/api/payments',    '/api/kyc',
  '/api/notifications', '/api/assets',
  '/api/marketplace', '/api/commerce',
  '/api/subscriptions',
];

export interface AuthMiddlewareConfig {
  protectedRoutes?:    string[];
  csrfProtectedPaths?: string[];
  publicRoutes?:       string[];
  loginRedirectUrl?:   string;
  /** First-party origin suffix trusted for CSRF (default '.tecosystem.app'). Set '' to disable. */
  trustedOriginSuffix?: string;
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  return diff === 0;
}

// A state-changing request is trusted if EITHER the double-submit token matches
// OR it is first-party (same-origin / a trusted origin suffix). Pure double-submit
// is unreliable across SSO domains and inside Pi Browser (sameSite=None cookies get
// dropped) → legit payment POSTs 403. Verifying the Origin is an OWASP-recommended,
// cookie-independent CSRF defence; a cross-site attacker cannot forge the Origin header.
export function isTrustedCsrf(req: NextRequest, trustedOriginSuffix = '.tecosystem.app'): boolean {
  const cookie = req.cookies.get('tec_csrf')?.value ?? '';
  const header = req.headers.get('x-csrf-token') ?? '';
  if (cookie && header && timingSafeStringEqual(cookie, header)) return true;

  const host   = req.headers.get('host') ?? '';
  const origin = req.headers.get('origin');
  if (origin) {
    try {
      const oh = new URL(origin).host;
      if (oh === host || (trustedOriginSuffix !== '' && oh.endsWith(trustedOriginSuffix))) return true;
    } catch { /* malformed Origin → not trusted */ }
  }
  return false;
}

export function createAuthMiddleware(config: AuthMiddlewareConfig = {}) {
  const protectedRoutes    = config.protectedRoutes    ?? DEFAULT_PROTECTED_ROUTES;
  const csrfProtectedPaths = config.csrfProtectedPaths ?? DEFAULT_CSRF_PROTECTED;
  const publicRoutes       = config.publicRoutes        ?? [];
  const loginRedirectUrl   = config.loginRedirectUrl    ?? '/';
  const trustedOriginSuffix = config.trustedOriginSuffix ?? '.tecosystem.app';

  return function middleware(req: NextRequest): NextResponse {
    const { pathname } = req.nextUrl;
    const method       = req.method.toUpperCase();

    // ── Page protection ──────────────────────────────────
    const isPublic    = publicRoutes.some(r => pathname.startsWith(r));
    const isProtected = !isPublic && protectedRoutes.some(r => pathname.startsWith(r));

    if (isProtected) {
      const token = req.cookies.get('tec_access_token')?.value;
      if (!token || token.trim() === '') {
        const loginUrl = new URL(loginRedirectUrl, req.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    // ── CSRF verification (double-submit OR first-party Origin) ──────────
    if (!CSRF_SAFE_METHODS.has(method)) {
      const isCsrfProtected = csrfProtectedPaths.some(r => pathname.startsWith(r));
      if (isCsrfProtected && !isTrustedCsrf(req, trustedOriginSuffix)) {
        return NextResponse.json(
          { error: 'Invalid CSRF token', code: 'CSRF_INVALID' },
          { status: 403 },
        );
      }
    }

    return NextResponse.next();
  };
}
