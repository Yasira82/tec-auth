// ── Types ─────────────────────────────────────────────────
export type {
  TecUser, AuthState, AuthErrorType,
  TecAuthResponse, PiAuthResult,
  PiPaymentData, PiPaymentCallbacks,
} from './types';

// ── Cookies ───────────────────────────────────────────────
export {
  getAccessToken,
  getCsrfToken,
  getStoredUser,
  hasValidSession,
} from './client/cookies';

// ── Pi (Hub only) ─────────────────────────────────────────
export { isPiBrowser, waitForPiSDK, loginWithPi } from './client/pi';

// ── Refresh + Logout ──────────────────────────────────────
export { refreshAccessToken, fetchWithAuth, logout } from './client/refresh';

// ── SSO (Commerce / Assets / other apps) ─────────────────
export { ssoRedirect, buildSsoUrl } from './client/sso';

// ── Hook ──────────────────────────────────────────────────
export { usePiAuth } from './hooks/usePiAuth';
