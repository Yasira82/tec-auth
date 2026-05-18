// ── Pi SDK — Hub only (Pi.init runs on hub.tecosystem.app) ─
import { PiAuthResult, TecAuthResponse } from '../types';

const ERRORS = {
  NOT_PI_BROWSER: 'Please open the app inside Pi Browser to authenticate.',
  SDK_LOAD_FAILED: 'Pi SDK failed to load. Please check your connection.',
  SDK_INIT_FAILED: 'Pi SDK initialization failed. Please try again.',
  AUTH_TIMEOUT:    'Authentication timed out. Please try again.',
  SAVE_FAILED:     'Failed to save authentication data.',
};

export const isPiBrowser = (): boolean => {
  if (typeof window === 'undefined') return false;
  return typeof window.Pi !== 'undefined' &&
         typeof window.Pi.authenticate === 'function';
};

export const waitForPiSDK = (timeout = 15000): Promise<void> =>
  new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.__TEC_PI_ERROR) {
      reject(new Error(ERRORS.SDK_LOAD_FAILED)); return;
    }
    if (typeof window !== 'undefined' && window.__TEC_PI_READY) {
      resolve(); return;
    }
    const timer = setTimeout(() => {
      window.removeEventListener('tec-pi-ready', onReady);
      window.removeEventListener('tec-pi-error', onError);
      reject(new Error(ERRORS.SDK_LOAD_FAILED));
    }, timeout);
    const onReady = () => { clearTimeout(timer); window.removeEventListener('tec-pi-error', onError); resolve(); };
    const onError = () => { clearTimeout(timer); window.removeEventListener('tec-pi-ready', onReady); reject(new Error(ERRORS.SDK_INIT_FAILED)); };
    window.addEventListener('tec-pi-ready', onReady, { once: true });
    window.addEventListener('tec-pi-error', onError, { once: true });
  });

export const loginWithPi = async (options?: {
  onIncompletePayment?: (payment: unknown) => void;
  onAfterLogin?:        (result: TecAuthResponse) => Promise<void>;
}): Promise<TecAuthResponse> => {
  if (!isPiBrowser()) throw new Error(ERRORS.NOT_PI_BROWSER);

  await waitForPiSDK();

  const timeout    = parseInt(process.env['NEXT_PUBLIC_PI_AUTH_TIMEOUT'] ?? '45000', 10);
  const piAuth     = await new Promise<PiAuthResult>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(ERRORS.AUTH_TIMEOUT)), timeout);
    window.Pi.authenticate(
      ['username', 'payments'],
      options?.onIncompletePayment ?? (() => {}),
    )
      .then(r => { clearTimeout(timer); resolve(r); })
      .catch(e => { clearTimeout(timer); reject(e);  });
  });

  const res = await fetch('/api/auth/pi-login', {
    method:      'POST',
    credentials: 'include',
    headers:     { 'Content-Type': 'application/json' },
    body:        JSON.stringify({ accessToken: piAuth.accessToken }),
  });

  if (!res.ok) throw new Error(ERRORS.SAVE_FAILED);

  const data = await res.json() as {
    success: boolean;
    isNewUser: boolean;
    user: TecAuthResponse['user'];
  };

  const result: TecAuthResponse = {
    success:   data.success,
    isNewUser: data.isNewUser,
    user:      data.user,
    tokens:    { accessToken: '', refreshToken: '' },
  };

  if (options?.onAfterLogin) {
    await options.onAfterLogin(result);
  }

  return result;
};
