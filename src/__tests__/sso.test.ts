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
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value:        { href: '' },
      writable:     true,
      configurable: true,
    });
  });

  it('redirects to correct SSO URL', () => {
    ssoRedirect(HUB_URL, TARGET_URL);
    expect(window.location.href).toBe(
      `${HUB_URL}/api/auth/sso?target=${encodeURIComponent(TARGET_URL)}`
    );
  });
});
