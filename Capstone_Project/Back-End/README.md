# Houston Badminton Center — Back-End

Node.js server that serves the front-end and provides API routes (login, DB view, etc.).

## Run the server

**First time (or after cloning):**

```bash
cd Capstone_Project/Back-End
npm install
```

If you don’t have a `.env` file yet, copy the example and edit if needed:

```bash
cp .env.example .env
```

Then start the server:

```bash
npm start
```

Or:

```bash
node server.js
```

**Next times:** from `Capstone_Project/Back-End` run:

```bash
npm start
```

- Server runs at **http://localhost:3000/** (or the `PORT` in `.env`).
- Root redirects to the client dashboard.
- Admin login: **admin@example.com** / **Admin123!** (override with `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`).

## Optional: database (Admin “Customers” view)

The Admin **Customers** page uses `/api/db`, which needs a MySQL database. In `.env` set:

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`

If `.env` is missing or DB vars are not set, the server still starts; only the Customers “View data” feature will show an error until the DB is configured.
