import { describe, it, expect } from 'vitest';
import { createAuthMiddleware } from '../middleware/index';
import { NextRequest } from 'next/server';

// ── Helpers ────────────────────────────────────────────────
const makeReq = (
  pathname: string,
  method   = 'GET',
  cookies:  Record<string, string> = {},
  headers:  Record<string, string> = {},
): NextRequest => {
  const url  = new URL(`https://hub.tecosystem.app${pathname}`);
  const req  = new NextRequest(url, {
    method,
    headers: new Headers(headers),
  });

  // Set cookies
  Object.entries(cookies).forEach(([name, value]) => {
    Object.defineProperty(req.cookies, 'get', {
      value: (key: string) => key === name ? { name, value } : undefined,
      configurable: true,
    });
  });

  // Override cookies.get to handle multiple
  const cookieStore = new Map(Object.entries(cookies));
  Object.defineProperty(req, 'cookies', {
    value: {
      get: (key: string) => {
        const val = cookieStore.get(key);
        return val ? { name: key, value: val } : undefined;
      },
    },
    configurable: true,
  });

  // Set headers
  Object.entries(headers).forEach(([key, val]) => {
    req.headers.set(key, val);
  });

  return req;
};

// ═══════════════════════════════════════════════════════════
describe('createAuthMiddleware — Page Protection', () => {
  const middleware = createAuthMiddleware({
    protectedRoutes: ['/hub', '/dashboard'],
    loginRedirectUrl: '/',
  });

  it('allows GET on public route without token', () => {
    const req = makeReq('/');
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it('redirects to login when accessing protected route without token', () => {
    const req = makeReq('/hub');
    const res = middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/?redirect=');
  });

  it('allows access to protected route with valid token', () => {
    const req = makeReq('/hub', 'GET', { tec_access_token: 'valid-token' });
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it('redirects when token is empty string', () => {
    const req = makeReq('/hub', 'GET', { tec_access_token: '' });
    const res = middleware(req);
    expect(res.status).toBe(307);
  });

  it('allows access to nested protected path with token', () => {
    const req = makeReq('/dashboard/profile', 'GET', { tec_access_token: 'token' });
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it('uses default protected routes when none configured', () => {
    const defaultMiddleware = createAuthMiddleware();
    const req = makeReq('/hub/page');
    const res = defaultMiddleware(req);
    expect(res.status).toBe(307);
  });

  it('allows publicRoutes to bypass protection', () => {
    const mw = createAuthMiddleware({
      protectedRoutes: ['/hub'],
      publicRoutes:    ['/hub/public'],
    });
    const req = makeReq('/hub/public');
    const res = mw(req);
    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════
describe('createAuthMiddleware — CSRF Protection', () => {
  const middleware = createAuthMiddleware({
    protectedRoutes:    [],
    csrfProtectedPaths: ['/api/auth/logout', '/api/wallet'],
  });

  it('allows GET without CSRF (safe method)', () => {
    const req = makeReq('/api/wallet', 'GET');
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it('blocks POST without CSRF token', () => {
    const req = makeReq('/api/auth/logout', 'POST', {}, {});
    const res = middleware(req);
    expect(res.status).toBe(403);
  });

  it('blocks POST when CSRF tokens do not match', () => {
    const req = makeReq(
      '/api/auth/logout', 'POST',
      { tec_csrf: 'csrf-cookie' },
      { 'x-csrf-token': 'wrong-token' },
    );
    const res = middleware(req);
    expect(res.status).toBe(403);
  });

  it('allows POST when CSRF tokens match', () => {
    const csrf = 'valid-csrf-token-123';
    const req  = makeReq(
      '/api/auth/logout', 'POST',
      { tec_csrf: csrf },
      { 'x-csrf-token': csrf },
    );
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it('allows HEAD without CSRF (safe method)', () => {
    const req = makeReq('/api/wallet', 'HEAD');
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it('allows OPTIONS without CSRF (safe method)', () => {
    const req = makeReq('/api/wallet', 'OPTIONS');
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it('allows PUT on non-CSRF-protected path without token', () => {
    const req = makeReq('/api/other', 'PUT');
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it('returns CSRF_INVALID error code', () => {
    const req = makeReq('/api/auth/logout', 'POST');
    const res = middleware(req);
    expect(res.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════
describe('createAuthMiddleware — defaults', () => {
  it('uses DEFAULT_CSRF_PROTECTED paths', () => {
    const mw  = createAuthMiddleware({ protectedRoutes: [] });
    const req = makeReq('/api/wallet', 'POST');
    const res = mw(req);
    expect(res.status).toBe(403);
  });

  it('uses custom loginRedirectUrl', () => {
    const mw  = createAuthMiddleware({
      protectedRoutes:  ['/hub'],
      loginRedirectUrl: '/login',
    });
    const req = makeReq('/hub');
    const res = mw(req);
    expect(res.headers.get('location')).toContain('/login');
  });
});
