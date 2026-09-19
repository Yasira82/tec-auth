// ── SSO — for Commerce / Assets / any non-Hub app ─────────

/**
 * Hand the visitor to the Hub to sign in, and take the app's sign-in page OUT
 * of the history on the way.
 *
 * ── Why `replace` and not `href` ────────────────────────────────────────────
 *
 * `location.href` pushes. The sign-in landing therefore stayed on the stack
 * behind the SSO hop, and the whole chain sat between the app and wherever the
 * visitor came from:
 *
 *     /pioneers  →  app/app       (no session)
 *                →  app/          sign-in page        ← pushed
 *                →  hub/api/auth/sso                  ← pushed
 *                →  app/api/auth/sso-callback  →  app/app
 *
 * Press back from the app and you do not reach `/pioneers`. You reach
 * `hub/api/auth/sso` — which is a REDIRECT ENDPOINT, not a page. Re-entering it
 * re-runs it, the Hub finds nothing valid to resume, and forwards to its own
 * landing: a "Sign in with Pi" screen shown to somebody who is already signed
 * in. Observed on a phone during the Founding 100 campaign, in Pi Browser,
 * which has no tabs to fall back on.
 *
 * `location.replace` drops the sign-in landing instead of stacking it, so back
 * from the app returns to the page that sent the visitor here.
 *
 * ── What this does NOT break ────────────────────────────────────────────────
 *
 * The sign-in page is not a destination anybody wants to return to — it exists
 * only to start this hop, and it re-renders on its own if the SSO round trip
 * fails, because the app is still unauthenticated and its middleware sends them
 * straight back. Nothing is lost by forgetting it.
 *
 * The callback already ends with `location.replace(redirect)` for the same
 * reason (C-123). This is the other half of that decision, in the one place it
 * was missing.
 */
export const ssoRedirect = (
  hubUrl:    string,
  targetUrl: string,
): void => {
  window.location.replace(
    `${hubUrl}/api/auth/sso?target=${encodeURIComponent(targetUrl)}`,
  );
};

export const buildSsoUrl = (
  hubUrl:    string,
  targetUrl: string,
): string =>
  `${hubUrl}/api/auth/sso?target=${encodeURIComponent(targetUrl)}`;
