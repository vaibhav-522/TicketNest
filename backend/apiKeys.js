import crypto from 'crypto';

/**
 * Per-resource-group integration keys.
 *
 * These are for *server-to-server* callers (partner apps, scanners, internal
 * tools) and are sent as `X-API-Key`. The browser SPA never receives them and
 * keeps using cookie sessions exactly as before — a key shipped to the browser
 * would be public anyway, so it lives only in backend/.env.
 *
 * Lenient groups (shows, bookings): routes the SPA needs stay open to browsers;
 * a caller that *does* send a key must send the right one for that group, so a
 * shows key can never be replayed against bookings and any key can be rotated
 * or revoked independently.
 *
 * Strict group (tickets): an integration-only surface — no key, no service.
 */
const SCOPE_ENV = {
  shows: 'SHOWS_API_KEY',
  bookings: 'BOOKINGS_API_KEY',
  tickets: 'TICKETS_API_KEY',
};

const keyFor = (scope) => process.env[SCOPE_ENV[scope]] || '';

export const isScopeConfigured = (scope) => keyFor(scope).length > 0;

/** Constant-time comparison so a wrong key can't leak the right one by timing. */
const matches = (provided, expected) => {
  const a = Buffer.from(String(provided), 'utf8');
  const b = Buffer.from(String(expected), 'utf8');
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
};

/**
 * Express middleware validating `X-API-Key` for one scope.
 *
 *  - key absent + lenient scope → pass through (browser traffic unchanged)
 *  - key present + wrong/out-of-scope/revoked → 401 with a scope-specific message
 *  - key present + valid → `req.integration = { scope }` and pass
 *  - strict scope: absent → 401; unconfigured server → 503 (mirrors the
 *    "payments disabled" behaviour used by the Razorpay routes)
 */
export const requireApiKey = (scope, { strict = false } = {}) => (req, res, next) => {
  const provided = req.get('x-api-key');

  if (!isScopeConfigured(scope)) {
    if (strict) {
      return res.status(503).json({
        success: false,
        message: `The ${scope} API key is not configured. Set ${SCOPE_ENV[scope]}.`,
      });
    }
    if (provided) {
      return res.status(401).json({
        success: false,
        message: `API keys for ${scope} are not configured on this server.`,
      });
    }
    return next();
  }

  if (!provided) {
    if (strict) {
      return res.status(401).json({
        success: false,
        message: `X-API-Key is required for the ${scope} API.`,
      });
    }
    return next();
  }

  if (!matches(provided, keyFor(scope))) {
    return res.status(401).json({
      success: false,
      message: `Invalid API key for the ${scope} API.`,
    });
  }

  req.integration = { scope };
  return next();
};
