# Operation TRON — Remove the application from EC2

**If you only want newer code and the repo is still on the server, use Operation CLU** (`OPERATION_CLU.md`) — `git pull` + PM2 restarts — **not** TRON.

**Before you SSH in:** read **Operation ARES — §0 (PEM key and SSH)**. In short, on **your laptop only**:

1. `chmod 400 "/path/to/HBC-Server-Key.pem"` (use your real path; **quote** paths with spaces).
2. `ssh -i "/path/to/HBC-Server-Key.pem" ec2-user@<Elastic-IP>` — **no `:3000`** on the SSH line (`:3000` is only for the browser: `http://<IP>:3000/`).
3. Do **not** run `chmod` for `/Users/...` while logged into EC2 — that path exists only on your Mac.

The steps below run **on the EC2 instance** after you connect.

When you want the app **back** on this instance after a fresh clone, follow **Operation ARES** → **“Redeploy after Operation TRON”** and **§2c** (copy the **`.pem`** from your laptop to EC2 with **`scp`**, set **`SSH_PKEY`**, **`chmod 400`**). Before **`rm -rf`** the repo, copy **`Back-End/.env`** and **`Back-End/(Python)/backend_access.env`** somewhere safe (they are not in Git). Optionally keep a copy of **`~/hbc-config/*.pem`** if you do not want to **`scp`** again.

---

## 1. Stop and remove the app from PM2

So nothing points at files you are about to delete. If you followed **Operation ARES**, stop **both** the Node app and the Flask waiver API:

```bash
pm2 stop waiver-api
pm2 delete waiver-api
pm2 stop reservation-app
pm2 delete reservation-app
pm2 save
```

If **`waiver-api`** is not in your list (older deploy), skip those two lines. If PM2 app names differ, use **`pm2 list`** then **`pm2 delete <app-name>`**.

**If you accidentally started duplicate processes** (e.g. two `waiver-api` rows) or want a clean PM2 slate:

```bash
pm2 delete all
pm2 save
```

**If you did not use PM2** (only foreground `node server.js` / `python3 flask_server.py`):

```bash
ps aux | grep "node server.js"
ps aux | grep "flask_server.py"
kill <PID>
```

Use `kill -9 <PID>` only if it will not stop.

---

## 2. Remove the application directory

```bash
cd ~
rm -rf CIS-4375-Project
```

If you used a different folder name (e.g. an old **`Demo-Test-CIS-4375`** clone), remove that instead:

```bash
rm -rf Demo-Test-CIS-4375
```

---

## 3. (Optional) Clear PM2 completely

Only if you want an empty PM2 process list (no resurrect on next boot from old dump):

```bash
pm2 kill
pm2 save
```

---

## 4. systemd / boot hook (usually leave as-is)

On this instance you likely already ran **`pm2 startup`** once. You **do not** need to remove it when deleting the app folder. The **`pm2-ec2-user`** service can stay enabled; when you redeploy, you register **`waiver-api`** and **`reservation-app`** again and run **`pm2 save`**.

Only run **`pm2 unstartup systemd`** if you intentionally want PM2 to **not** start on reboot anymore (rare).

---

**Result:** The app is stopped and the code is removed from the instance. The EC2 instance and RDS can stay running. To **clone from GitHub and run the app again**, use **Operation ARES** → **Redeploy after Operation TRON** (including **§0** PEM/SSH on your laptop, then **`npm install`** in **Back-End** before **`pm2 start server.js`**).

**Ongoing updates without removing the repo:** **Operation CLU** (`OPERATION_CLU.md`).
