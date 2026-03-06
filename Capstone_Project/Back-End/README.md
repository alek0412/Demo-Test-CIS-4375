# Back-End

## Running the app

From this folder (`Back-End`):

```bash
node server.js
```

Then open **http://localhost:3000** in your browser. The server serves the Front-End files (HTML, CSS, images) so you get correct paths and one place to run everything.

- **server.js** — Main entry point. Serves static files from `../Front-End` and mounts API routes.
- **config.js** — App config (port, DB URL, env).
- **routes/** — API route definitions (auth, bookings, classes, clients, appointments, rooms, membership, staff, services, marketing, insights, **payments**). Wire these in `server.js` under `/api/...`.
- **controllers/** — Business logic for each route area; called from the route handlers (includes **paymentsController** for payment flows).
- **middleware/** — `auth.js` (protect admin routes, sessions), `errorHandler.js` (central error handling).
- **db/connection.js** — Database connection (e.g. MongoDB, PostgreSQL, or SQLite) when you add persistence.
- **Client_Alternative.js** — Client-side script for the Alternate Services form (mailto behavior). Consider moving to `Front-End/` or linking from your HTML.

## Payments (how websites usually do it)

Websites **don’t store or handle raw card numbers**. They use a **payment provider** that is PCI-compliant. Your backend talks to the provider’s API; the provider processes the charge and (optionally) sends webhooks to your server.

**Common options:**

| Provider   | Good for                          | Notes                                      |
|-----------|------------------------------------|--------------------------------------------|
| **Stripe**| Online payments, subscriptions     | Strong docs, test mode, no monthly fee     |
| **Square**| In-person + online (e.g. POS)      | Fits a physical venue + admin POS          |
| **PayPal**| “Pay with PayPal”                  | Users can pay with PayPal balance          |

**Typical flow (e.g. Stripe):**

1. Front-end asks your backend for a **payment intent** or **client secret** (amount, description).
2. Your backend calls Stripe’s API, gets a secret, returns it to the front-end.
3. Front-end uses Stripe.js (or the provider’s SDK) to collect card details and confirm payment; **card data never hits your server**.
4. Provider sends a **webhook** to your backend (e.g. `POST /api/payments/webhook`) when payment succeeds; you update booking/membership in your DB.

For a **capstone**, you can either:

- **Simulate payments** — e.g. a “Pay now” button that calls your API and marks the order as paid in your DB (no real money), or  
- **Use test mode** — Stripe/Square/PayPal all have sandbox/test modes and test card numbers so you can demo a real-looking flow without real charges.

The **routes/payments.js** and **controllers/paymentsController.js** placeholders are where you’d add endpoints like “create payment intent” and “handle webhook” when you integrate a provider.
