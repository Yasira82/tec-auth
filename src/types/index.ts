// ── Pi SDK Types ──────────────────────────────────────────
export interface PiPaymentData {
  amount: number;
  memo:   string;
  metadata: Record<string, unknown>;
}

export interface PiPaymentCallbacks {
  onReadyForServerApproval:    (paymentId: string) => void;
  onReadyForServerCompletion:  (paymentId: string, txid: string) => void;
  onCancel:                    (paymentId: string) => void;
  onError:                     (error: Error, payment?: unknown) => void;
}

export interface PiAuthResult {
  accessToken: string;
  user: {
    uid:      string;
    username: string;
  };
}

// ── TEC User ──────────────────────────────────────────────
export interface TecUser {
  id:               string;
  piId:             string;
  piUsername:       string;
  role:             string;
  subscriptionPlan: string;
  createdAt:        string;
}

// ── Auth State ────────────────────────────────────────────
export type AuthErrorType =
  | 'not_pi_browser'
  | 'auth_failed'
  | 'timeout'
  | 'storage'
  | null;

export interface AuthState {
  user:            TecUser | null;
  isLoading:       boolean;
  isAuthenticated: boolean;
  isNewUser:       boolean;
  error:           string | null;
  errorType:       AuthErrorType;
}

// ── Auth Response ─────────────────────────────────────────
export interface TecAuthResponse {
  success:   boolean;
  isNewUser: boolean;
  user:      TecUser;
  tokens: {
    accessToken:  string;
    refreshToken: string;
  };
}

// ── Window augmentation ───────────────────────────────────
declare global {
  interface Window {
    Pi: {
      authenticate: (
        scopes:             string[],
        onIncompletePayment: (payment: unknown) => void
      ) => Promise<PiAuthResult>;
      createPayment: (data: PiPaymentData, callbacks: PiPaymentCallbacks) => void;
      init: (config: { version: string; sandbox: boolean; appId?: string }) => void;
    };
    __TEC_PI_READY?: boolean;
    __TEC_PI_ERROR?: boolean;
  }
}
