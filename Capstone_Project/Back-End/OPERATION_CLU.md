# Operation CLU — Refresh application code from GitHub (no teardown)

Use **Operation CLU** when the app is **already running on EC2** under PM2 and you only need the **latest code** from GitHub. You **do not** remove the repo, **do not** re-clone, and **do not** repeat full **Operation ARES** unless something is broken or missing.

**Canonical repo for production pulls on EC2:** [`IPochynyukCoding/CIS-4375-Project`](https://github.com/IPochynyukCoding/CIS-4375-Project) — after `git clone`, **`origin`** should point here; routine updates use **`git pull origin main`**. (Some developers also push to a personal fork / `demo-test` remote for mirrors; on the server, still prefer **`origin`** = org unless you intentionally cloned only the fork.)

**Related playbooks (keep all three):**

| Operation | Use when |
|-----------|----------|
| **Operation CLU** (this doc) | Normal updates: `git pull` + restarts. |
| **Operation ARES** | First-time setup, fresh clone after TRON, missing `.env` / `backend_access.env`, new instance, or PM2 not set up yet. |
| **Operation TRON** | You intentionally want to **remove** the app folder and stop processes from the instance. |

---

## What stays untouched during CLU

- **`Back-End/.env`** and **`(Python)/backend_access.env`** (not in Git — they remain on disk).
- **`~/hbc-config/`** and any SSH key path referenced by **`SSH_PKEY`**.
- PM2 **process names** (`reservation-app`, `waiver-api`) — you only **restart** them unless you renamed something on purpose.

---

## CLU quick steps (on EC2)

Run these **after** you have pushed from your laptop to **GitHub** (typically **`origin`** on the org repo, branch **`main`**).

1. **Go to the repo root** (default folder name from cloning the org repo is **`CIS-4375-Project`**):

   ```bash
   cd ~/CIS-4375-Project
   ```

2. **Pull latest code** from the org repo:

   ```bash
   git fetch origin
   git pull origin main
   ```

   If your default branch is not `main`, substitute it. Only if this EC2 clone was set up to track another remote (e.g. a fork), use that remote name instead — otherwise stay on **`origin`** = **`IPochynyukCoding/CIS-4375-Project`**.

3. **Node dependencies** — only when **`package.json`** / lockfile changed:

   ```bash
   cd Capstone_Project/Back-End
   npm install
   ```

4. **Python dependencies** — only when you added or upgraded packages for the waiver API:

   ```bash
   cd "$HOME/CIS-4375-Project/Capstone_Project/Back-End/(Python)"
   pip3 install waitress flask python-dotenv mysql-connector-python sshtunnel python-dateutil
   ```

   Adjust the `cd` path if your clone lives somewhere other than `~/CIS-4375-Project`.

5. **Restart PM2** (typical order: Flask first, then Node — matches **Operation ARES**):

   ```bash
   pm2 restart waiver-api
   pm2 restart reservation-app
   pm2 save
   ```

6. **Verify:**

   ```bash
   pm2 list
   pm2 logs reservation-app --lines 30 --nostream
   pm2 logs waiver-api --lines 30 --nostream
   ```

   Both should be **online**. If the error log shows only **old** tracebacks, you can clear log noise (optional):

   ```bash
   pm2 flush
   pm2 restart waiver-api
   pm2 restart reservation-app
   ```

7. **Browser:** `http://<Elastic-IP>:3000/`

---

## When CLU is *not* enough (use ARES pieces instead)

- **`git pull` conflicts** — resolve on a dev machine or fix merge on EC2, then pull again.
- **Missing modules** after pull — run **`npm install`** in **Back-End** and/or **`pip3 install …`** for Python.
- **`waiver-api` errors** about SSH key / tunnel — see **Operation ARES §2c** (key on EC2, **`SSH_PKEY`**, **`chmod 400`**). CLU does not replace that.
- **You deleted the repo or ran TRON** — use **Operation ARES** → **Redeploy after Operation TRON**, not CLU alone.

---

## Result

The EC2 instance keeps its configuration and secrets; only the tracked application files update from GitHub, and PM2 serves the new build after restart. Use **Operation TRON** to tear down and **Operation ARES** to stand the stack back up from scratch.
