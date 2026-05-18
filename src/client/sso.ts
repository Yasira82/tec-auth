// ── SSO — for Commerce / Assets / any non-Hub app ─────────

export const ssoRedirect = (
  hubUrl:    string,
  targetUrl: string,
): void => {
  window.location.href =
    `${hubUrl}/api/auth/sso?target=${encodeURIComponent(targetUrl)}`;
};

export const buildSsoUrl = (
  hubUrl:    string,
  targetUrl: string,
): string =>
  `${hubUrl}/api/auth/sso?target=${encodeURIComponent(targetUrl)}`;
