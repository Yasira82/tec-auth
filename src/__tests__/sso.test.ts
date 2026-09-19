import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ssoRedirect, buildSsoUrl } from '../client/sso';

const HUB_URL    = 'https://hub.tecosystem.app';
const TARGET_URL = 'https://commerce.tecosystem.app/app';

describe('buildSsoUrl', () => {
  it('builds correct SSO URL', () => {
    const url = buildSsoUrl(HUB_URL, TARGET_URL);
    expect(url).toBe(
      `${HUB_URL}/api/auth/sso?target=${encodeURIComponent(TARGET_URL)}`
    );
  });

  it('encodes target URL correctly', () => {
    const target = 'https://commerce.tecosystem.app/app?foo=bar&baz=qux';
    const url    = buildSsoUrl(HUB_URL, target);
    expect(url).toContain(encodeURIComponent(target));
    expect(url).not.toContain('?foo=bar');
  });
});

describe('ssoRedirect', () => {
  let replace: ReturnType<typeof vi.fn>;
  let assign:  ReturnType<typeof vi.fn>;

  beforeEach(() => {
    replace = vi.fn();
    assign  = vi.fn();
    Object.defineProperty(window, 'location', {
      value:        { href: '', replace, assign },
      writable:     true,
      configurable: true,
    });
  });

  it('redirects to correct SSO URL', () => {
    ssoRedirect(HUB_URL, TARGET_URL);
    expect(replace).toHaveBeenCalledWith(
      `${HUB_URL}/api/auth/sso?target=${encodeURIComponent(TARGET_URL)}`
    );
  });

  it('REPLACES the sign-in page instead of stacking it', () => {
    // ── A rewritten assertion, and the reason it was wrong ──────────────────
    // This pinned `window.location.href`, which is a PUSH. So the app's sign-in
    // landing stayed on the history stack behind the SSO hop, and back from the
    // app did not reach the page the visitor came from — it reached
    // `hub/api/auth/sso`, a redirect endpoint, which re-ran and forwarded to the
    // Hub's own landing. A "Sign in with Pi" screen, shown to somebody already
    // signed in. Found on a phone during the Founding 100 campaign, in Pi
    // Browser, which has no tabs to fall back on.
    //
    // The old test was not weak about the URL — it was simply silent on WHICH
    // navigation was used, and that was the whole defect.
    ssoRedirect(HUB_URL, TARGET_URL);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(assign).not.toHaveBeenCalled();
    expect(window.location.href).toBe('');
  });

  it('encodes the target, so a query on it cannot escape the parameter', () => {
    const target = 'https://commerce.tecosystem.app/app?q=1&next=/x';
    ssoRedirect(HUB_URL, target);
    const url = replace.mock.calls[0]?.[0] as string;
    expect(url).toBe(`${HUB_URL}/api/auth/sso?target=${encodeURIComponent(target)}`);
    expect(url).not.toContain('&next=');
  });
});
