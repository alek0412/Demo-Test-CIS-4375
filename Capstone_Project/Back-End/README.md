# Back-End

## Running the app

From this folder (`Back-End`):

```bash
node server.js
```

Then open **http://localhost:3000** in your browser. The server serves the Front-End files (HTML, CSS, images) so you get correct paths and one place to run everything.

- **server.js** — Main entry point. Serves static files from `../Front-End` and mounts API routes.
- **config.js** — App config (port, DB URL, env).
- **routes/** — API route definitions (auth, bookings, classes, clients, appointments, rooms, membership, staff, services, marketing, insights). Wire these in `server.js` under `/api/...`.
- **controllers/** — Business logic for each route area; called from the route handlers.
- **middleware/** — `auth.js` (protect admin routes, sessions), `errorHandler.js` (central error handling).
- **db/connection.js** — Database connection (e.g. MongoDB, PostgreSQL, or SQLite) when you add persistence.

Client-side script for the Alternate Services form (`Client_Alternative.js`, mailto behavior) lives in `../Front-End/client/` and is loaded by `Client_AlternateServices.html`.

## Payments

**This website does not process payments.** No payment provider integration (Stripe, Square, PayPal, etc.) is in scope; payments are handled outside the site.
