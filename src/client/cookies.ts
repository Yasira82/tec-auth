// ── Cookie utilities — shared across all TEC apps ─────────

export const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const match = document.cookie
      .split('; ')
      .find(row => row.startsWith('tec_access_token='));
    if (!match) return null;
    return match.substring(match.indexOf('=') + 1);
  } catch { return null; }
};

export const getCsrfToken = (): string => {
  if (typeof document === 'undefined') return '';
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('tec_csrf='))
    ?.split('=')?.[1] ?? '';
};

export const getStoredUser = <T = unknown>(): T | null => {
  if (typeof window === 'undefined') return null;
  try {
    const match = document.cookie
      .split('; ')
      .find(row => row.startsWith('tec_user='));
    if (!match) return null;
    const value = match.substring(match.indexOf('=') + 1);
    return JSON.parse(decodeURIComponent(value)) as T;
  } catch { return null; }
};

export const hasValidSession = (): boolean => {
  const token = getAccessToken();
  return !!token && token.trim() !== '';
};
