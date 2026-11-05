/**
 * Post-login return destinations arrive as router state, shaped either as a
 * plain path string or as a Location object ({ pathname, search }). Only
 * same-origin absolute paths are accepted: a value like `//evil.com` would be
 * treated as protocol-relative by the browser and bounce users off-site.
 */
const isSafePath = (path: string) =>
  path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\');

export const safeReturnPath = (state: unknown, fallback = '/shows'): string => {
  if (!state || typeof state !== 'object') return fallback;

  const from = (state as { from?: unknown }).from;

  if (typeof from === 'string') {
    return isSafePath(from) ? from : fallback;
  }

  if (from && typeof from === 'object') {
    const { pathname, search, hash } = from as {
      pathname?: unknown;
      search?: unknown;
      hash?: unknown;
    };
    if (typeof pathname === 'string' && isSafePath(pathname)) {
      return `${pathname}${typeof search === 'string' ? search : ''}${
        typeof hash === 'string' ? hash : ''
      }`;
    }
  }

  return fallback;
};
