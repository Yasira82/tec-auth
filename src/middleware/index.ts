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
}

export function createAuthMiddleware(config: AuthMiddlewareConfig = {}) {
  const protectedRoutes    = config.protectedRoutes    ?? DEFAULT_PROTECTED_ROUTES;
  const csrfProtectedPaths = config.csrfProtectedPaths ?? DEFAULT_CSRF_PROTECTED;
  const publicRoutes       = config.publicRoutes        ?? [];
  const loginRedirectUrl   = config.loginRedirectUrl    ?? '/';

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

    // ── CSRF verification ────────────────────────────────
    if (!CSRF_SAFE_METHODS.has(method)) {
      const isCsrfProtected = csrfProtectedPaths.some(r => pathname.startsWith(r));
      if (isCsrfProtected) {
        const csrfCookie = req.cookies.get('tec_csrf')?.value;
        const csrfHeader = req.headers.get('x-csrf-token');
        if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
          return NextResponse.json(
            { error: 'Invalid CSRF token', code: 'CSRF_INVALID' },
            { status: 403 },
          );
        }
      }
    }

    return NextResponse.next();
  };
}
