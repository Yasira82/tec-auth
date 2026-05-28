import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  vi.resetModules();
  mockFetch.mockReset();
  // Reset cookie
  Object.defineProperty(document, 'cookie', {
    get: () => 'tec_csrf=csrf-test',
    configurable: true,
  });
});

afterEach(() => vi.clearAllMocks());

describe('refreshAccessToken', () => {
  it('returns new token on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok:   true,
      json: async () => ({ token: 'new-access-token' }),
    });
    const { refreshAccessToken } = await import('../client/refresh');
    const token = await refreshAccessToken();
    expect(token).toBe('new-access-token');
  });

  it('returns null on refresh failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    const { refreshAccessToken } = await import('../client/refresh');
    const token = await refreshAccessToken();
    expect(token).toBeNull();
  });

  it('calls logoutFn on refresh failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    const logoutFn = vi.fn().mockResolvedValue(undefined);
    const { refreshAccessToken } = await import('../client/refresh');
    await refreshAccessToken(logoutFn);
    expect(logoutFn).toHaveBeenCalledTimes(1);
  });

  it('returns null on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const { refreshAccessToken } = await import('../client/refresh');
    const token = await refreshAccessToken();
    expect(token).toBeNull();
  });

  it('calls logoutFn on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network'));
    const logoutFn = vi.fn().mockResolvedValue(undefined);
    const { refreshAccessToken } = await import('../client/refresh');
    await refreshAccessToken(logoutFn);
    expect(logoutFn).toHaveBeenCalledTimes(1);
  });
});

describe('fetchWithAuth', () => {
  it('returns response directly on success', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    const { fetchWithAuth } = await import('../client/refresh');
    const res = await fetchWithAuth('/api/data');
    expect(res.status).toBe(200);
  });

  it('retries with refresh on 401', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 401 })                     // first call → 401
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'tok' }) }) // refresh
      .mockResolvedValueOnce({ ok: true, status: 200 });                     // retry
    const { fetchWithAuth } = await import('../client/refresh');
    const res = await fetchWithAuth('/api/data');
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(res.status).toBe(200);
  });

  it('returns 401 response when refresh fails', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    const { fetchWithAuth } = await import('../client/refresh');
    const res = await fetchWithAuth('/api/data');
    expect(res.status).toBe(401);
  });
});

describe('logout', () => {
  it('calls logout endpoint', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    const { logout } = await import('../client/refresh');
    await logout();
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/logout',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('handles logout network error gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network'));
    const { logout } = await import('../client/refresh');
    await expect(logout()).resolves.toBeUndefined();
  });
});
