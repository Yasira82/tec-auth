import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock module dependencies before importing the hook
vi.mock('../client/cookies', () => ({
  getStoredUser: vi.fn(),
}));

vi.mock('../client/pi', () => ({
  loginWithPi: vi.fn(),
  isPiBrowser: vi.fn(),
}));

vi.mock('../client/refresh', () => ({
  logout: vi.fn(),
}));

import { getStoredUser }         from '../client/cookies';
import { loginWithPi, isPiBrowser } from '../client/pi';
import { logout }                from '../client/refresh';

const mockGetStoredUser  = vi.mocked(getStoredUser);
const mockLoginWithPi   = vi.mocked(loginWithPi);
const mockIsPiBrowser   = vi.mocked(isPiBrowser);
const mockLogout        = vi.mocked(logout);

const fakeUser = { id: 'u-1', piId: 'pi-1', piUsername: 'alice', role: 'user' as const, subscriptionPlan: 'FREE' as const, createdAt: '' };
const fakeResult = { success: true, isNewUser: false, user: fakeUser, tokens: { accessToken: '', refreshToken: '' } };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetStoredUser.mockReturnValue(null);
  mockIsPiBrowser.mockReturnValue(false);
  mockLogout.mockResolvedValue(undefined);
});

describe('usePiAuth', () => {
  it('starts with isLoading=true then settles', async () => {
    const { usePiAuth } = await import('../hooks/usePiAuth');
    const { result } = renderHook(() => usePiAuth());
    await act(async () => {});
    expect(result.current.isLoading).toBe(false);
  });

  it('sets user from stored cookie on mount', async () => {
    mockGetStoredUser.mockReturnValue(fakeUser);
    const { usePiAuth } = await import('../hooks/usePiAuth');
    const { result } = renderHook(() => usePiAuth());
    await act(async () => {});
    expect(result.current.user).toEqual(fakeUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('isAuthenticated=false when no stored user', async () => {
    mockGetStoredUser.mockReturnValue(null);
    const { usePiAuth } = await import('../hooks/usePiAuth');
    const { result } = renderHook(() => usePiAuth());
    await act(async () => {});
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('login() success → updates state with user', async () => {
    mockLoginWithPi.mockResolvedValue(fakeResult);
    const { usePiAuth } = await import('../hooks/usePiAuth');
    const { result } = renderHook(() => usePiAuth());
    await act(async () => {});
    await act(async () => { await result.current.login(); });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(fakeUser);
    expect(result.current.error).toBeNull();
  });

  it('login() sets isNewUser from result', async () => {
    mockLoginWithPi.mockResolvedValue({ ...fakeResult, isNewUser: true });
    const { usePiAuth } = await import('../hooks/usePiAuth');
    const { result } = renderHook(() => usePiAuth());
    await act(async () => {});
    await act(async () => { await result.current.login(); });
    expect(result.current.isNewUser).toBe(true);
  });

  it('login() error containing "Pi Browser" → errorType=not_pi_browser', async () => {
    mockLoginWithPi.mockRejectedValue(new Error('Please open the app inside Pi Browser to authenticate.'));
    const { usePiAuth } = await import('../hooks/usePiAuth');
    const { result } = renderHook(() => usePiAuth());
    await act(async () => {});
    await act(async () => {
      try { await result.current.login(); } catch {}
    });
    expect(result.current.errorType).toBe('not_pi_browser');
    expect(result.current.isLoading).toBe(false);
  });

  it('login() error containing "timed out" → errorType=timeout', async () => {
    mockLoginWithPi.mockRejectedValue(new Error('Authentication timed out. Please try again.'));
    const { usePiAuth } = await import('../hooks/usePiAuth');
    const { result } = renderHook(() => usePiAuth());
    await act(async () => {});
    await act(async () => {
      try { await result.current.login(); } catch {}
    });
    expect(result.current.errorType).toBe('timeout');
  });

  it('login() other error → errorType=auth_failed', async () => {
    mockLoginWithPi.mockRejectedValue(new Error('Network error'));
    const { usePiAuth } = await import('../hooks/usePiAuth');
    const { result } = renderHook(() => usePiAuth());
    await act(async () => {});
    await act(async () => {
      try { await result.current.login(); } catch {}
    });
    expect(result.current.errorType).toBe('auth_failed');
    expect(result.current.error).toBe('Network error');
  });

  it('logout() clears state', async () => {
    mockLoginWithPi.mockResolvedValue(fakeResult);
    const { usePiAuth } = await import('../hooks/usePiAuth');
    const { result } = renderHook(() => usePiAuth());
    await act(async () => {});
    await act(async () => { await result.current.login(); });
    expect(result.current.isAuthenticated).toBe(true);
    await act(async () => { await result.current.logout(); });
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(mockLogout).toHaveBeenCalledOnce();
  });

  it('exposes isPiBrowser function', async () => {
    const { usePiAuth } = await import('../hooks/usePiAuth');
    const { result } = renderHook(() => usePiAuth());
    await act(async () => {});
    expect(typeof result.current.isPiBrowser).toBe('function');
  });
});
