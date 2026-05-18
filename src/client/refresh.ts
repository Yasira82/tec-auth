import { getCsrfToken } from './cookies';

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

export const refreshAccessToken = async (
  logoutFn?: () => Promise<void>
): Promise<string | null> => {
  if (isRefreshing) {
    return new Promise(resolve => { refreshQueue.push(resolve); });
  }
  isRefreshing = true;
  try {
    const res = await fetch('/api/auth/refresh', {
      method:      'POST',
      credentials: 'include',
    });
    if (!res.ok) {
      if (logoutFn) await logoutFn();
      refreshQueue.forEach(cb => cb(null));
      refreshQueue = [];
      return null;
    }
    const data = await res.json();
    const token = (data as { token?: string }).token ?? null;
    refreshQueue.forEach(cb => cb(token));
    refreshQueue = [];
    return token;
  } catch {
    if (logoutFn) await logoutFn();
    refreshQueue.forEach(cb => cb(null));
    refreshQueue = [];
    return null;
  } finally {
    isRefreshing = false;
  }
};

export const fetchWithAuth = async (
  url:     string,
  options: RequestInit = {},
  logoutFn?: () => Promise<void>
): Promise<Response> => {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> ?? {}),
    },
  });
  if (res.status === 401) {
    const newToken = await refreshAccessToken(logoutFn);
    if (!newToken) return res;
    return fetch(url, { ...options, credentials: 'include' });
  }
  return res;
};

export const logout = async (): Promise<void> => {
  try {
    await fetch('/api/auth/logout', {
      method:  'POST',
      credentials: 'include',
      headers: { 'x-csrf-token': getCsrfToken() },
    });
  } catch (err) {
    console.error('[TEC Auth] Logout failed:', err);
  }
};
