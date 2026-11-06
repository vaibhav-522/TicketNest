# TicketNest — Full-Stack Review

**Date:** 2026-10-17
**Scope:** `Default Project/TicketNest/` (git repo, HEAD `07b9b67` — Razorpay migration). Reviewed as a single path: UI action → API → Mongo → response → UI state.
**Environment:** Node v24.20.0, npm 11.19.0, local MongoDB on `127.0.0.1:27017`.

## 1. Path reviewed by layer

| Layer | Files |
|---|---|
| Backend entry | `backend/index.js` (CORS, lazy Mongo connect, error/404 handlers, Socket.IO boot, Vercel export) |
| API contract | `backend/routes.js` (auth, shows, bookings, payment checkout/confirm) |
| Domain | `backend/models.js`, `backend/seedData.js` |
| Frontend shell | `frontend/src/App.tsx`, `hooks/useAuth.tsx`, `components/Navbar.tsx` |
| UI flows | `pages/Booking.tsx` (seat map + Razorpay + 503 fallback), `Shows.tsx`, `PaymentSuccess.tsx`, `Login.tsx`, `Register.tsx` |
| Seam | `frontend/vite.config.ts` (`/api` + `/socket.io` proxy), `vercel.json` (services routing) |

No code was changed — this is a review only.

## 2. Contract & state assumptions verified

- **Auth:** JWT in httpOnly `SameSite=Lax` cookie; frontend always sends `credentials: 'include'`; backend also accepts `Bearer`. `useAuth` bootstraps from `GET /api/auth/me` and treats only 401 as "no session".
- **Payments:** `POST /payment/checkout` returns **503 when Razorpay keys are absent**, and `Booking.tsx` uses exactly that to fall back to the payment-less `POST /api/bookings`. Seats/show for a paid booking are read back from Razorpay order notes ("never trust the client"), signature checked with `timingSafeEqual`, confirm is idempotent via `paymentOrderId`, and a seat conflict triggers auto-refund.
- **Seat reservation:** atomic `findOneAndUpdate` with `availableSeats: { $all: seats }` + `$pull`; `/api/bookings` rolls back the pull if `Booking.create` fails.
- **Two different shapes for `availableSeats`:** number (count) in `GET /api/shows`, `string[]` in `GET /api/shows/:id` — the frontend knowingly uses two separate interfaces.
- **Socket:** standalone mode only; `setSocketServer` is never called on Vercel, so `socketServer?.emit` no-ops safely.

## 3. End-to-end validation performed

Ran against local MongoDB, backend + Vite dev server up:

- **API E2E: 20/20 PASS** — success path: register → `/auth/me` → catalog → checkout 503 → booking 201 → receipt (populated show) → `/bookings/user`; failure paths: duplicate email 409, empty seats 400, double-book same seats **409**, unauthenticated **401**, tampered JWT **401**, cross-user receipt **404 (no IDOR)**, seat count shrinks 60 → 58 after booking.
- **Integration seam: 5/5 PASS** through the Vite proxy — SPA shell, `/api` proxied, `/socket.io` polling handshake proxied, login issues httpOnly cookie cross-port, 401 body carries `.message` (the shape the UI reads).
- **Frontend:** `npx tsc --noEmit` → 0 errors; `npm run build` → clean.
- **Cleanup:** test users/bookings deleted, pulled seats restored, temp scripts removed, repo clean (`git status` empty).

## 4. Findings (prioritized)

### High

1. **The real-time layer is dead on the frontend.** Backend emits `booking-confirmed` (`routes.js:186,432`), handles `join-show`/`leave-show` (`index.js:108-109`), and Vite proxies `/socket.io` — but there is **no `socket.io-client` dependency and zero socket code** anywhere in `frontend/src`. Consequence: the seat map is fetched once on mount and never updates; "Live seat availability" on `Home.tsx:15` is not true. Data stays correct (server rejects at booking time — verified 409), but users pick seats that go stale until reload and get a late 409. Fix by subscribing to `booking-confirmed` and refreshing seats for that `showId`, or delete the socket layer + proxy entry + the Home claim.
2. **`GET /api/shows/:id` returns 500 on a malformed id.** Confirmed live: `CastError` at `routes.js:132` → `"Internal server error"`. `/api/bookings/:id` already guards with `mongoose.isValidObjectId` (`routes.js:211`) — the shows route needs the same one-line guard to return 404.
3. **`/payment/confirm` has no compensation between seat pull and `Booking.create`** (`routes.js:399-430`). If `Booking.create` throws after the `$pull`, seats stay consumed while the payment was captured — no seat restore, no refund. The payment-less path *does* roll back (`routes.js:179-185`); mirror that or use a transaction.

### Medium

4. **`Shows.tsx:18-67` fabricates inventory.** On any API error *or* a legitimately empty catalog, it renders 4 fake movies with ids `'1'..'4'`; clicking Book Now goes to `/api/shows/1` → 404/500 dead end. It also masks real backend outages. Prefer an explicit empty/error state.
5. **Zod schemas in `Login.tsx` / `Register.tsx` are never `safeParse`ed** — only used for `z.infer` types, so their messages never render; real validation is `required` attrs + backend. Wire it up or drop it (it looks like working validation today).
6. **Register race → wrong status:** `User.exists()` then `create()`; a concurrent duplicate throws E11000 → generic 500 instead of 409. Catch `code === 11000`.
7. **No rate limiting on `/api/auth/login`** — combined with bcrypt cost 12, that's an easy CPU-exhaustion/brute-force surface.

### Low / cleanup

8. `GET /api/bookings/user` has **no consumer** — there's no "My bookings" route in `App.tsx`, so after payment success a user can never see past bookings (feature gap, not a bug).
9. `build` script is `vite build` only — **CI won't typecheck**. Suggest `"build": "tsc --noEmit && vite build"`.
10. Stray `Documents/Default Project/index.js` (outside the repo) is an unrunnable older copy of the server entry (missing `./routes.js`, no DB connect). Delete to avoid confusion with `TicketNest/backend/index.js`.
11. `backend/.env` still has a stale commented `STRIPE_SECRET_KEY` block (value empty — no leak); `.env.example` is correctly Razorpay-only.
12. **Deployment risk:** `sameSite: 'lax'` cookie means the README's Railway+Vercel split-deployment variant fails silently (cross-site POSTs won't carry the cookie → 401 on login/booking). The same-domain `vercel.json` Services layout is fine — document the constraint.

### Confirmed solid

Atomic seat reservation with rollback, no IDOR, httpOnly cookie auth, timing-safe Razorpay signature + server-side order notes + idempotent confirm + auto-refund, `express.json` 10kb limit, single-origin CORS, lazy Mongo connect with failure retry, auto-seed on empty DB.

## 5. Residual risk & follow-up checks

- Payment path was verified only up to the **503 fallback**; the live Razorpay order/signature/refund cycle needs a `rzp_test_...` key run — the refund-on-conflict branch in particular has no automated coverage.
- Socket behavior verified at the transport layer (handshake proxied) but no client exists yet; once added, re-test two browsers booking the same show.
- Nothing was run against the Vercel `Services` routing (`/api/*` → backend) — worth one post-deploy smoke test of `/health` and `/api/shows` under the production domain, since that's where cookie `Secure` + CORS `CLIENT_URL` settings actually take effect.

## Suggested next step

Fix the top three: socket client subscription, `isValidObjectId` guard on `GET /api/shows/:id`, and seat-restore/refund compensation in `/payment/confirm` — each is a small, bounded change.

---

# Part 2 — UI/UX Review (ui-ux-pro-max)

**Date:** 2026-10-17
**Method:** stack detected = **React 18 + Vite + Bootstrap 5** (`frontend/package.json`); all UI source read (`index.css`, `App.tsx`, `Navbar`, all 6 pages); skill database queried with `--domain ux`, `--color`, `--icons`, `--product`; exact contrast ratios and viewport math computed from the real CSS values. One query ("redirect after login return destination") returned **0 DB results** — retried once, still no match, so finding #13 below is **general guidance fallback**, not a database match.

## 🔴 Priority 1 — Accessibility (CRITICAL)

**1. Seat states rely on color alone AND fail contrast** (`index.css:131-160`, computed):

| State | Pair | Ratio | Verdict |
|---|---|---|---|
| Selected seat | `#fff` on `#ff5a5f` (11px text) | **3.05:1** | fails AA 4.5:1 |
| Taken seat | `#f4f6f9` on `#aab3bd` | **1.96:1** | fails badly |
| Available seat | `#333` on `#e6e9ee` | 10.38:1 | ✅ |
| Legend | 3 colored squares, no text-state link | — | color-only (WCAG 1.4.1) |

The skill's ticketing palette guidance is explicit: *"available green + sold-out red + seat map neutral"* — the neutral `available` vs gray `taken` differ only in lightness, and the legend repeats that color-only encoding. **Fix:** darken the coral for seat fills (or use dark text on it), give taken seats a non-color cue (cross/strikethrough icon + `aria-disabled`), and add text labels to the legend.

**2. Zero live regions in the entire app.** Grep confirms **no `aria-live`, `role="alert"`, `aria-pressed`, `aria-describedby`, `autocomplete`, or `tabIndex` anywhere** in `frontend/src`. Skill rules hit: *Error Messages* (High), *Contextual Live Badge Updates* (High), *Focusable Error Summary* (High). Nothing is announced when: seats are selected, the count/total changes, seats get taken, or a form fails. **Fix:** `role="status"` on the "Your selection" summary, `role="alert"` on error alerts.

**3. Form errors are misplaced and mostly unreachable** (`Login.tsx:50-51`, `Register.tsx:68-70`). Errors render as `<p>` blocks *above* the form, never linked to inputs (`aria-describedby` absent) — and since `<form>` lacks `noValidate`, the browser's native `required` bubbles fire first, so RHF's error paragraphs rarely appear at all. The Zod schemas (Part 1, finding #5) are never parsed. Skill *Error Placement* (High): *"error below the input, referenced with aria-describedby"*. **Fix:** `noValidate` + `onBlur` validation + per-field errors directly under each input.

**4. WCAG 1.3.5 Identify Input Purpose:** no `autocomplete` tokens on any auth field → autofill/password managers degrade. Add `autocomplete="username" | "current-password" | "new-password" | "name"`.

**5. Stateful controls without ARIA state:** the Shows category filter buttons show active state via `btn-primary` class only (needs `aria-pressed`); seats need `aria-pressed`/`aria-disabled`; decorative icons in `Home.tsx` feature cards and `Navbar` lack `aria-hidden="true"` (skill `icon-context-accessibility`: *"if decorative beside visible text, set aria-hidden"*).

## 🟠 Priority 2 — Touch & Interaction (CRITICAL)

**6. Mobile seat targets are undersized and tightly packed.** `.seat` is 38px desktop, **28px at ≤768px**, with a **6px gap** (skill: *Touch Spacing* requires **8px minimum**; native guidance 44pt/48dp; WCAG 2.2 AA floor 24px + spacing). 28px + 6px gap is borderline at best. **Fix:** ≥40px targets and 8px gaps, or shrink the grid instead of the targets.

**7. Four native `alert()` calls** (`Booking.tsx:102,172,186,204`) — blocking OS dialogs, no focus management, kill the seat-selection flow (max-8-seats alert fires *mid-click*). Replace with an inline `role="alert"` message near the seat map / summary.

**8. Login & Register submit buttons never disable or show a spinner** — skill *Loading Buttons* (High): *"Disable button and show loading state"*. Double-click = duplicate POST `/auth/register`. (`Booking.tsx` does this correctly with `submitting` ✅ — reuse that pattern.)

## 🟡 Priority 3 — Performance

**9. `checkout.razorpay.com/v1/checkout.js` is loaded synchronously in `<head>`** (`index.html:8`) — render-blocking on every page (Home, Shows, auth) even though only Booking-with-payments needs it. Add `defer`, or inject on demand.

**10.** Show images have no `loading="lazy"` / dimensions (the 200px placeholder already reserves space, so CLS is controlled ✅ — just add lazy).

## 🟠 Priority 5 — Layout & Responsive

**11. Horizontal scroll on small phones.** Computed from the real CSS: seat row = `10×28px + 9×6px + 24px label ≈ 364px`, but `.seat-map` is `inline-flex` with **no wrap and no overflow container** → **320px and 360px viewports scroll horizontally** (the skill's *Layout* anti-pattern). **Fix:** `overflow-x: auto` on a wrapper *plus* a layout that reflows (smaller gaps first).

**12. Fixed navbar can obscure keyboard focus.** Content offset with `padding-top: 72px` is correct (skill *Sticky Navigation* ✅) but there's no `scroll-padding-top` on `html` → tabbing can land focused elements *under* the fixed navbar (WCAG 2.2 *Focus Not Obscured*, High). One line: `html { scroll-padding-top: 72px; }`.

## 🔵 Priority 8–9 — Forms & Navigation

**13. Login redirect destroys the booking context (fallback guidance — no DB match found).** `Booking.tsx:186` sends unauthenticated users to `/auth/login` with no `state`; `Login.tsx:27` then always navigates to `/shows` — the user loses their show **and seat selection**, with no way back. **Fix:** `navigate('/auth/login', { state: { from: location } })`, return there after login, and consider persisting `selected` seats (sessionStorage) so the seat map survives the round-trip.

**14. No password visibility toggle** (skill icons: `eye-slash` is flagged as the canonical case) and no up-front helper text for the 6-char rule — users only learn it after failing.

**15. "Payment successful / Total paid" is shown even when nothing was paid.** `PaymentSuccess.tsx:75-96` hardcodes paid copy, but the 503-fallback flow books **without payment** (verified in the API review). State mismatch between layers: `booking.paymentId` exists → make the copy conditional ("Booking confirmed" vs "Payment successful", "Total" vs "Total paid").

**16. Dead-end navigation:** after payment success there's no "My bookings" destination anywhere in `App.tsx`/`Navbar` — and the backend's `GET /api/bookings/user` has no consumer (ties to Part 1, finding #8).

## ✅ What's already right (verified)

Viewport meta ✓ · `nav`/`main`/`article` semantics ✓ · real `<label htmlFor>` on every field ✓ · `role="status"` spinners ✓ · `alt` text on show images ✓ · breadcrumb `aria-label`/`aria-current` ✓ · Bootstrap JS bundle imported (so collapse + `data-bs-dismiss` work) ✓ · fixed-nav padding compensation ✓ · `navigate(..., {replace:true})` on payment success preserves correct Back behavior ✓ · tab order matches visual order ✓ · focus outlines on seats not removed ✓ · brand palette (purple `#4b2e83` / coral `#ff5a5f`, 10.4:1 on buttons) consistent ✓.

## Suggested UI/UX fix order

1. **Contrast + color-only seat states & legend** (WCAG 1.4.1/1.4.3, ~30 min)
2. **Live regions + inline errors + `noValidate` forms** (announcements start working)
3. **Replace `alert()` + disable submit buttons during flight**
4. **Seat touch targets/gaps + `scroll-padding-top` + mobile row reflow**
5. **Login return-path + conditional payment copy + `autocomplete` tokens**

---

# Part 3 — Review sweep: implemented & re-verified

**Date:** 2026-11-05
**Method:** every open finding from Parts 1 and 2 implemented, then re-verified against a local backend (Node v24, MongoDB `127.0.0.1:27017`) plus the Vite dev proxy.

## Changes

### Backend (`backend/routes.js`, `backend/index.js`)

- **#7 Rate limiting** — `express-rate-limit` on `POST /api/auth/login` (10 failed attempts / 15 min per IP) and `/auth/register` (20 / hour), both with `skipSuccessfulRequests` so one unlucky user never locks out a shared NAT, JSON `429` body matching the API shape. `trust proxy = 1` only under `VERCEL`/`RAILWAY` so the key is the real client IP (documented in the README for any other proxy).
- **#6 Register race** — `User.exists()` kept for the friendly path, but `E11000` from `User.create` now returns `409` instead of a generic 500.
- **#1 Real-time (server side)** — `booking-confirmed` is now emitted to the **show's room** (`io.to(showId)`), making the existing `join-show`/`leave-show` handlers meaningful; `GET /api/shows/:id` reports a `realtime` capability flag so the client knows a socket can exist *before* attempting a handshake (none exists on Vercel).
- `GET /api/bookings/user` population extended with `location`/`price` for the new list page.
- **#11** stale commented `STRIPE_SECRET_KEY` removed from `backend/.env`; **#10** stray unrunnable `Documents/Default Project/index.js` deleted; `npm audit fix` cleared the high body-parser advisory (2 moderates left are nodemon's `minimatch`, dev-only, breaking upgrade).

### Frontend

- **#1 Socket client (High)** — `socket.io-client` added. `Booking.tsx` joins the show's room, drops seats taken by other guests **live**, prunes them from the current selection, announces it (`aria-live`), shows a Live/refresh badge, and re-syncs availability after any failed booking attempt. No socket is created at all when `realtime: false`.
- **#13 Login return path** — booking → login now carries `state.from`; Login, Register **and** the already-authenticated redirect all honor it via a shared `safeReturnPath` (rejects `//host` etc.). The seat selection survives the round-trip in `sessionStorage` and is pruned against live availability on return.
- **#8 / #16 My bookings** — new `/bookings` list and `/bookings/:id` detail (auth-gated, with empty/error/loading states, status pill, seat tokens, receipt link) + Navbar entry shown only when signed in. The receipt markup was extracted into `components/BookingReceipt.tsx`, shared with `/payment/success`, so the two views can't drift. Consumes the previously dead `GET /api/bookings/user`.
- **#15** receipt copy is now conditional: "Total paid" only when `paymentId` exists — the keyless fallback flow shows "Total".
- **#4 (Medium)** fabricated `fallbackShows` deleted: an API failure now shows a real error state with retry, and an empty catalog shows its own state instead of inventing four movies with dead links.
- **#5 (Medium)** Login/Register now actually `safeParse` their Zod schemas on submit; schema messages render inline under the field.
- **#9 (UI perf)** `checkout.js` removed from `<head>` — injected on demand only when a paid checkout is really starting (also covers rapid double-clicks via a shared loader promise).
- **#12 (UI)** `html { scroll-padding-top: calc(var(--tn-nav-h) + .75rem) }` so keyboard focus clears the fixed navbar.
- **#9 (P1)** `build` is now `tsc --noEmit && vite build` — CI typechecks.
- **#14 (UI)** Login gained the password helper text (Register already had it).

Already fixed before this sweep (verified, no change needed): P1 #1–#5 except as noted (seat contrast, live regions, inline errors + `noValidate`, `autocomplete`, `aria-pressed`), P2 #6–#8 (42px/8px seats, no `alert()`, loading submit buttons), P3 #10 (lazy images), P5 #11 (`overflow-x` seat map), P1 #2/#3 (ObjectId guard, confirm compensation).

## Verification

- `npx tsc --noEmit` → 0 errors · `npm run build` → clean · `node --check` on both backend entry files → clean.
- **API E2E: 28/28 PASS** — health, catalog, malformed **and** unknown id → 404, register 201, duplicate 409, `/auth/me`, logout → 401, login + cookie, wrong password 401, unauthenticated booking 401, seat list, `realtime: true`, empty seats 400, >8 seats 400, booking 201, **`booking-confirmed` delivered to the show's room**, **room scoping — a viewer on another show hears nothing**, inventory 60 → 58, double-book 409, `bookings/user` populated, own receipt 200, cross-user receipt 404 (no IDOR), checkout 503, **rate limit 429 on the 10th failed login**, register unaffected, **concurrent duplicate registration → 201 + 409 (never 500)**.
- **Dev-proxy E2E: 10/10 PASS** — SPA shell, deep link `/bookings`, checkout.js absent from `<head>`, proxied API, cookie round-trip, **socket.io handshake + room join + `booking-confirmed` through the Vite proxy**, `bookings/user` data for the new page. All test users/bookings removed and seats restored; temp scripts deleted.

## Follow-up: per-resource integration API keys (2026-11-05)

Three separate server-to-server keys in `backend/.env`, validated by `backend/apiKeys.js`
(constant-time `crypto.timingSafeEqual`, `X-API-Key` header):

- `SHOWS_API_KEY` → `GET /api/shows`, `GET /api/shows/:id`; `BOOKINGS_API_KEY` → bookings
  and payment routes — both **lenient**: the SPA sends no key and behaves exactly as
  before, but a *supplied* key must match the route's scope (401 otherwise), so keys are
  scoped, independently rotatable, and can't be replayed across groups.
- `TICKETS_API_KEY` → new `GET /api/tickets` (e-tickets for the signed-in user) and
  `GET /api/tickets/:id` — **strict**: 401 without a key, 503 when unset (mirrors the
  Razorpay disabled pattern). The single-ticket route allows key-only reads for door
  scanners (unguessable id + shared secret); when session/Bearer credentials are present
  it enforces owner-only (404 otherwise — no IDOR).
- Verified: **18/18 E2E** — SPA routes keyless, wrong-scope keys 401 on every group,
  valid keys pass, tickets 401 without/wrong key, key-only scanner read 200 with
  `valid: true`, list route still needs a session, cross-user + valid key → 404,
  malformed id → 404. Vite-proxy smoke: `/api/shows` 200 keyless, `/api/tickets` 401.
  Test data cleaned, temp scripts deleted.

## Still open (needs live access, cannot be tested locally)

1. **Live Razorpay cycle** — order → signature → booking, and the refund-on-seat-conflict branch, still need a real `rzp_test_...` key run (unchanged from Part 1).
2. **Post-deploy smoke test on Vercel Services** — `/health`, `/api/shows`, cookie `Secure` + `CLIENT_URL` behavior under the production domain.
3. **Vercel (`realtime: false`) degradation** — code path verified only by construction: no socket is opened, seat map refreshes on submit/conflict. Worth one manual look after deploying there.
