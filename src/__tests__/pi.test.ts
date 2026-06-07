import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const setupPi = (hasAuthenticate = true) => {
  (window as any).__TEC_PI_READY  = undefined;
  (window as any).__TEC_PI_ERROR  = undefined;
  (window as any).Pi = hasAuthenticate
    ? { authenticate: vi.fn().mockResolvedValue({ accessToken: 'pi-token', user: { uid: 'pi-uid', username: 'pi-user' } }) }
    : {};
};

const clearPi = () => {
  delete (window as any).__TEC_PI_READY;
  delete (window as any).__TEC_PI_ERROR;
  delete (window as any).Pi;
};

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  clearPi();
});

afterEach(() => {
  clearPi();
});

// ── isPiBrowser ─────────────────────────────────────────────────

describe('isPiBrowser', () => {
  it('returns false when window.Pi is undefined', async () => {
    const { isPiBrowser } = await import('../client/pi');
    expect(isPiBrowser()).toBe(false);
  });

  it('returns false when window.Pi has no authenticate method', async () => {
    (window as any).Pi = { init: vi.fn() };
    const { isPiBrowser } = await import('../client/pi');
    expect(isPiBrowser()).toBe(false);
  });

  it('returns true when window.Pi.authenticate is a function', async () => {
    setupPi(true);
    const { isPiBrowser } = await import('../client/pi');
    expect(isPiBrowser()).toBe(true);
  });
});

// ── waitForPiSDK ────────────────────────────────────────────────

describe('waitForPiSDK', () => {
  it('resolves immediately when __TEC_PI_READY is set', async () => {
    (window as any).__TEC_PI_READY = true;
    const { waitForPiSDK } = await import('../client/pi');
    await expect(waitForPiSDK()).resolves.toBeUndefined();
  });

  it('rejects immediately when __TEC_PI_ERROR is set', async () => {
    (window as any).__TEC_PI_ERROR = true;
    const { waitForPiSDK } = await import('../client/pi');
    await expect(waitForPiSDK()).rejects.toThrow('Pi SDK failed to load');
  });

  it('resolves when tec-pi-ready event fires', async () => {
    const { waitForPiSDK } = await import('../client/pi');
    const p = waitForPiSDK();
    window.dispatchEvent(new Event('tec-pi-ready'));
    await expect(p).resolves.toBeUndefined();
  });

  it('rejects when tec-pi-error event fires', async () => {
    const { waitForPiSDK } = await import('../client/pi');
    const p = waitForPiSDK();
    window.dispatchEvent(new Event('tec-pi-error'));
    await expect(p).rejects.toThrow('Pi SDK initialization failed');
  });

  it('rejects on timeout', async () => {
    vi.useFakeTimers();
    const { waitForPiSDK } = await import('../client/pi');
    const p = waitForPiSDK(100);
    vi.advanceTimersByTime(200);
    await expect(p).rejects.toThrow('Pi SDK failed to load');
    vi.useRealTimers();
  });
});

// ── loginWithPi ─────────────────────────────────────────────────

describe('loginWithPi', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok:   true,
      json: async () => ({ success: true, isNewUser: false, user: { id: 'user-1' } }),
    } as Response);
  });

  it('throws when not in Pi Browser', async () => {
    const { loginWithPi } = await import('../client/pi');
    await expect(loginWithPi()).rejects.toThrow('Please open the app inside Pi Browser');
  });

  it('returns TecAuthResponse on success', async () => {
    setupPi(true);
    (window as any).__TEC_PI_READY = true;
    const { loginWithPi } = await import('../client/pi');
    const result = await loginWithPi();
    expect(result.success).toBe(true);
    expect(result.isNewUser).toBe(false);
  });

  it('throws SAVE_FAILED when fetch returns not ok', async () => {
    setupPi(true);
    (window as any).__TEC_PI_READY = true;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as Response);
    const { loginWithPi } = await import('../client/pi');
    await expect(loginWithPi()).rejects.toThrow('Failed to save authentication data');
  });

  it('throws when Pi.authenticate rejects', async () => {
    setupPi(true);
    (window as any).__TEC_PI_READY = true;
    (window as any).Pi.authenticate = vi.fn().mockRejectedValue(new Error('scope denied'));
    const { loginWithPi } = await import('../client/pi');
    await expect(loginWithPi()).rejects.toThrow('scope denied');
  });

  it('calls onAfterLogin when provided', async () => {
    setupPi(true);
    (window as any).__TEC_PI_READY = true;
    const onAfterLogin = vi.fn().mockResolvedValue(undefined);
    const { loginWithPi } = await import('../client/pi');
    await loginWithPi({ onAfterLogin });
    expect(onAfterLogin).toHaveBeenCalledOnce();
  });

  it('passes onIncompletePayment to Pi.authenticate', async () => {
    setupPi(true);
    (window as any).__TEC_PI_READY = true;
    const onIncompletePayment = vi.fn();
    const { loginWithPi } = await import('../client/pi');
    await loginWithPi({ onIncompletePayment });
    const [, cb] = (window as any).Pi.authenticate.mock.calls[0];
    expect(cb).toBe(onIncompletePayment);
  });

  it('rejects with AUTH_TIMEOUT when Pi.authenticate hangs', async () => {
    setupPi(true);
    (window as any).__TEC_PI_READY = true;
    process.env['NEXT_PUBLIC_PI_AUTH_TIMEOUT'] = '50';
    (window as any).Pi.authenticate = vi.fn(() => new Promise(() => {}));
    const { loginWithPi } = await import('../client/pi');
    await expect(loginWithPi()).rejects.toThrow('Authentication timed out');
    delete process.env['NEXT_PUBLIC_PI_AUTH_TIMEOUT'];
  }, 3000);
});
