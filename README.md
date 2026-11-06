# TicketNest

TicketNest is a React/Vite frontend with an Express API, MongoDB persistence, JWT-cookie authentication, Socket.IO, and optional Razorpay payments.

## Project structure

```text
TicketNest/
├── backend/
│   ├── index.js          # Express and Socket.IO server
│   ├── routes.js         # API endpoints
│   ├── models.js         # Mongoose models
│   ├── seed.js           # Optional demo data seeder
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── index.html        # Vite HTML entry point
    ├── vite.config.ts    # React plugin and /api development proxy
    ├── package.json
    └── src/
```

## Requirements

- Node.js 18 or newer and npm 9 or newer
- MongoDB running locally, or a MongoDB Atlas connection string
- Razorpay account with test API keys only if payments are needed

## Run locally (Windows PowerShell)

In the first terminal, configure and start the backend:

```powershell
cd .\backend
Copy-Item .env.example .env
# Edit .env and set JWT_SECRET and MONGODB_URI.
# Optional: SHOWS_API_KEY / BOOKINGS_API_KEY / TICKETS_API_KEY for integrations
# (see "Integration API keys" below; the SPA works without them).
npm install
npm run seed
npm run dev
```

The backend listens at `http://localhost:5000`. Seeding is optional; it adds demo shows and creates these accounts if they do not already exist:

- Admin: `admin@ticketnest.local` / `admin123`
- User: `user@ticketnest.local` / `user123`

In a second terminal, start the frontend:

```powershell
cd .\frontend
npm install
npm run dev
```

Open the URL Vite prints, usually `http://localhost:5173`. Vite proxies `/api` requests to the backend. `frontend/.env` contains the optional `VITE_API_URL` proxy target; leave it as `http://localhost:5000` for local development.

To enable real payments, set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `backend/.env` to your Razorpay test keys (`rzp_test_...`). Bookings then open **Razorpay Checkout** (UPI, cards, netbanking): the backend creates an order, Razorpay collects the payment, and the backend verifies the payment signature server-side before reserving seats. If a seat is taken while paying, the payment is refunded automatically. Without Razorpay keys, bookings complete without payment (handy for local development).

## Dependencies

Backend runtime dependencies: Express, Mongoose, CORS, cookie-parser, dotenv, bcryptjs, jsonwebtoken, express-rate-limit, and Socket.IO. Nodemon is used for backend development.

Frontend runtime dependencies: React, React DOM, React Router, React Hook Form, Zod, socket.io-client, Bootstrap, and Bootstrap Icons. Vite, its React plugin, TypeScript, and React type definitions are development dependencies.

## API routes

- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/shows` (shows key optional, see below)
- `GET /api/shows/:id` (shows key optional)
- `POST /api/bookings` (authenticated; bookings key optional)
- `GET /api/bookings/user` (authenticated; bookings key optional)
- `GET /api/bookings/:id` (authenticated; receipt for a single booking; bookings key optional)
- `POST /api/payment/checkout` (authenticated; creates a Razorpay order; bookings key optional)
- `POST /api/payment/confirm` (authenticated; verifies the payment signature and creates the booking; bookings key optional)
- `GET /api/tickets` (**tickets key required**; authenticated; e-tickets for the signed-in user)
- `GET /api/tickets/:id` (**tickets key required**; single e-ticket — key-only access allowed for scanners, owner-only when a session is sent)

## Integration API keys

Server-to-server callers (partner apps, door scanners, internal tools) authenticate with
three separate keys, one per resource group, sent as an `X-API-Key` header:

| Env var | Scope | Rule |
|---|---|---|
| `SHOWS_API_KEY` | `GET /api/shows`, `GET /api/shows/:id` | Optional — browsers work without it; a *supplied* key must match |
| `BOOKINGS_API_KEY` | bookings + payment routes | Optional — same rule |
| `TICKETS_API_KEY` | `GET /api/tickets`, `GET /api/tickets/:id` | **Required** (401 without, 503 if unset) |

Key properties:

- **The SPA never sends them.** The browser keeps using the JWT cookie as before; keys
  live only in `backend/.env`, so they stay secret (anything shipped to a browser is
  public). Cookie/session auth rules are unchanged and still apply on top.
- **Scope is enforced.** A shows key replayed against `/api/bookings` returns `401`,
  so each integration only touches its own group and each key can be rotated or
  revoked independently.
- **Timing-safe comparison** — wrong keys can't leak the right one by response timing.
- **Generate** one value per key:

  ```powershell
  node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
  ```

  Put each result in `backend/.env` (rotate by replacing the value and restarting;
  old keys stop working immediately).

Example:

```powershell
# catalog for a partner site
curl.exe -H "X-API-Key: $env:SHOWS_API_KEY" http://localhost:5000/api/shows

# door scanner validating a ticket (key alone is enough, no login needed)
curl.exe -H "X-API-Key: $env:TICKETS_API_KEY" http://localhost:5000/api/tickets/<bookingId>
```

The tickets responses include a boolean `valid` plus seats, show and venue — everything
a scanner needs to answer "may this person enter?".

## Deploy on Vercel (frontend + backend together)

This repository ships a `vercel.json` that uses [Vercel Services](https://vercel.com/docs/services) to build the `frontend/` (Vite) and `backend/` (Express) services under one domain. `/api/*` is routed to the backend and everything else to the frontend, so the frontend's relative `/api` calls work in production without extra configuration.

1. Import the repository at [vercel.com/new](https://vercel.com/new).
2. In the project's **Build and Deployment** settings, set **Framework Preset** to **Services**. A project only builds as services when the framework is `Services` and `services` is present in `vercel.json`.
3. Add these environment variables for the whole project (they are consumed by the backend service):
   - `MONGODB_URI` – your MongoDB Atlas connection string.
   - `JWT_SECRET` – a long random string.
   - `CLIENT_URL` – your production URL, for example `https://your-app.vercel.app`.
   - `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` – optional; enable real payments.
4. Deploy. The backend is reachable at `/api` and the frontend at `/`.

## Deploy the backend on Railway instead

If you prefer to host the backend separately (for example on [Railway](https://railway.app)):

1. Create a project from the repository and set the root directory to `backend`.
2. Add the same environment variables as above, plus `PORT` (Railway provides one automatically).
3. Once Railway gives you a public URL, point the frontend at it by adding a rewrite in `vercel.json` that sends `/api/(.*)` to `https://your-backend.up.railway.app/api/$1`, or set `VITE_API_URL` and call the backend with an absolute URL.

> **Cookie caveat:** the session cookie is set with `SameSite=Lax`, which the browser
> only sends on *same-site* requests. With the frontend on Vercel and the backend on
> Railway, the two are different sites, so login and booking requests arrive
> **without** the cookie and fail with a silent `401`. That is why the single-domain
> Vercel `Services` layout above is the recommended deployment. To run the split
> layout anyway, put both behind one custom domain (proxies/rewrites) or change the
> cookie policy deliberately — do not discover it in production.

## Real-time seat availability

Standalone backends (local dev, Railway, any classic Node host) attach Socket.IO:
clients join a room per show and receive `booking-confirmed` the moment anyone
books, so the seat map drops taken seats immediately. Serverless (Vercel) has no
socket server, so `GET /api/shows/:id` reports `realtime: false` and the frontend
skips the socket entirely — availability then refreshes on submit and after any
booking conflict. Booking attempts are always authoritative server-side either way.

## Rate limiting

`POST /api/auth/login` allows 10 failed attempts per 15 minutes per IP and
`POST /api/auth/register` 20 per hour (successful requests do not consume the
budget). Behind a proxy the app sets `trust proxy` when `VERCEL` or `RAILWAY` is
set, so limits key on the real client IP. When deploying behind any other proxy,
set the `trust proxy` hop count yourself or every client shares one budget.
