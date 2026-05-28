import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Setup DOM environment ──────────────────────────────────
const setupCookies = (cookies: string) => {
  Object.defineProperty(document, 'cookie', {
    get:        () => cookies,
    configurable: true,
  });
};

beforeEach(() => {
  setupCookies('');
  vi.restoreAllMocks();
});

describe('getAccessToken', () => {
  it('returns null when no cookie', async () => {
    const { getAccessToken } = await import('../client/cookies');
    setupCookies('');
    expect(getAccessToken()).toBeNull();
  });

  it('returns token when cookie exists', async () => {
    const { getAccessToken } = await import('../client/cookies');
    setupCookies('tec_access_token=my-token-123');
    expect(getAccessToken()).toBe('my-token-123');
  });

  it('returns correct token among multiple cookies', async () => {
    const { getAccessToken } = await import('../client/cookies');
    setupCookies('other=abc; tec_access_token=token-xyz; another=def');
    expect(getAccessToken()).toBe('token-xyz');
  });
});

describe('getCsrfToken', () => {
  it('returns empty string when no csrf cookie', async () => {
    const { getCsrfToken } = await import('../client/cookies');
    setupCookies('');
    expect(getCsrfToken()).toBe('');
  });

  it('returns csrf token when present', async () => {
    const { getCsrfToken } = await import('../client/cookies');
    setupCookies('tec_csrf=csrf-token-abc');
    expect(getCsrfToken()).toBe('csrf-token-abc');
  });
});

describe('getStoredUser', () => {
  it('returns null when no user cookie', async () => {
    const { getStoredUser } = await import('../client/cookies');
    setupCookies('');
    expect(getStoredUser()).toBeNull();
  });

  it('returns parsed user object', async () => {
    const { getStoredUser } = await import('../client/cookies');
    const user = { id: 'user-1', piUsername: 'testuser' };
    setupCookies(`tec_user=${encodeURIComponent(JSON.stringify(user))}`);
    expect(getStoredUser()).toEqual(user);
  });

  it('returns null on invalid JSON', async () => {
    const { getStoredUser } = await import('../client/cookies');
    setupCookies('tec_user=invalid-json');
    expect(getStoredUser()).toBeNull();
  });
});

describe('hasValidSession', () => {
  it('returns false when no token', async () => {
    const { hasValidSession } = await import('../client/cookies');
    setupCookies('');
    expect(hasValidSession()).toBe(false);
  });

  it('returns true when token exists', async () => {
    const { hasValidSession } = await import('../client/cookies');
    setupCookies('tec_access_token=valid-token');
    expect(hasValidSession()).toBe(true);
  });

  it('returns false when token is whitespace', async () => {
    const { hasValidSession } = await import('../client/cookies');
    setupCookies('tec_access_token=   ');
    expect(hasValidSession()).toBe(false);
  });
});
