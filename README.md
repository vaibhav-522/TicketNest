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

Backend runtime dependencies: Express, Mongoose, CORS, cookie-parser, dotenv, bcryptjs, jsonwebtoken, and Socket.IO. Nodemon is used for backend development.

Frontend runtime dependencies: React, React DOM, React Router, React Hook Form, Zod, Bootstrap, and Bootstrap Icons. Vite, its React plugin, TypeScript, and React type definitions are development dependencies.

## API routes

- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/shows`
- `GET /api/shows/:id`
- `POST /api/bookings` (authenticated)
- `GET /api/bookings/user` (authenticated)
- `GET /api/bookings/:id` (authenticated; receipt for a single booking)
- `POST /api/payment/checkout` (authenticated; creates a Razorpay order)
- `POST /api/payment/confirm` (authenticated; verifies the payment signature and creates the booking)

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
