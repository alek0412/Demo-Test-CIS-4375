# Operation ARES — Set up the application on EC2 (grab code from GitHub)

Run these commands **on the EC2 instance** (SSH in first: `ssh -i path/to/HBC-Server-Key.pem ec2-user@<Elastic-IP>`).

**Code source:** CLU (public repo) — `https://github.com/alek0412/Demo-Test-CIS-4375`

**Important:** Use **PM2** below so the app **keeps running after you close SSH** and can **restart on reboot**. Running only `node server.js` in a terminal ties the process to that session; when you disconnect, the app often stops.

### Order of operations (read this — avoids “port 3000 already in use”)

Do these **in order**. **Do not** start the server until **`npm install`** finishes.

1. `git clone` → `cd` to **`Capstone_Project/Back-End`**
2. **`cp .env.example .env`** → edit **`.env`** (RDS and any secrets)
3. **`npm install`**
4. **Only then** start the app **once** with PM2 (`pm2 start …`) **or** test with **`node server.js`** — **not both at the same time.**

**If port 3000 is already in use:** something is already listening (usually a **previous** `pm2 start` or a leftover `node server.js`). Check:

```bash
pm2 list
```

- If **`reservation-app`** is already **online**, you **do not** run `pm2 start` again. After `git pull` / `npm install`, use **`pm2 restart reservation-app`** only.
- If you need a **clean** start: `pm2 stop reservation-app` → `pm2 delete reservation-app`, **then** `pm2 start server.js --name reservation-app`.
- **Do not** run **`node server.js`** in the shell while PM2 is already running the same app — that tries to open port 3000 twice and triggers **EADDRINUSE**.

**Routine code updates** (repo already cloned, PM2 already managing the app): `git pull` → `npm install` → **`pm2 restart reservation-app`**. You should **not** need to kill processes or fight port 3000.

---

## Redeploy after Operation TRON (reattach from GitHub)

Use this when you **removed the app** with **Operation TRON** (`rm -rf` the repo) and want to **clone again** on the **same** EC2 instance.

1. **Clone**

   ```bash
   cd ~
   git clone https://github.com/alek0412/Demo-Test-CIS-4375.git
   cd Demo-Test-CIS-4375/Capstone_Project/Back-End
   ```

2. **`.env`** (required — not in git; you must recreate after every fresh clone)

   ```bash
   cp .env.example .env
   nano .env
   ```

   Set **`DB_PASSWORD`**, **`DB_HOST`**, **`DB_USER`**, **`DB_NAME`**, and any other values (same as before — keep a private copy outside the repo).

3. **Install dependencies, then start under PM2** (install **before** `pm2 start` — see **Order of operations** above)

   ```bash
   npm install
   pm2 start server.js --name reservation-app
   pm2 save
   ```

4. **`pm2 startup`** — On **this same instance**, if you already ran **`pm2 startup`** once, you **usually skip this**. Only run **`pm2 startup`** (and the **`sudo env PATH=...`** line it prints) on a **new server** or if systemd was never set up.

5. **Test:** `http://<your-EC2-Elastic-IP>:3000/`

| Situation | `pm2 startup` again? |
|-----------|----------------------|
| First EC2 / never ran startup | Yes — see **§4 Run the app with PM2** below |
| Same EC2 after TRON + fresh `git clone` | **No** (usually) — just `pm2 start` + `pm2 save` |

---

## 1. Clone the repo

```bash
cd ~
git clone https://github.com/alek0412/Demo-Test-CIS-4375.git
cd Demo-Test-CIS-4375
```

---

## 2. Create `.env` in the Back-End folder (do not skip)

The repo includes **`.env.example`** — copy it to **`.env`** and add your **real RDS password** (and any other secrets). **`.env` is gitignored** and must exist on the server after clone.

```bash
cd ~/Demo-Test-CIS-4375/Capstone_Project/Back-End
cp .env.example .env
nano .env
```

**Minimum for RDS:** set **`DB_PASSWORD=`** to your actual RDS password. Confirm **`DB_NAME`**, **`DB_USER`**, and **`DB_HOST`** match your database (use `DB_NAME=HBC_Reservation_System` if your Customer table lives in that database).

Optionally set **`ADMIN_EMAIL`**, **`ADMIN_PASSWORD`**, **`CUSTOMER_*`**, and **SMTP** variables for production (see comments inside `.env.example`).

- **Save and exit in nano:** Ctrl+O, Enter, Ctrl+X.

**After updates from Git:** your `.env` stays on the server; only run `git pull`. Re-copy `.env.example` only if new variables were added and you need to merge them by hand.

---

## 3. Install dependencies

```bash
cd ~/Demo-Test-CIS-4375/Capstone_Project/Back-End
npm install
```

---

## 4. Run the app with PM2 (production-style)

**4a. Install PM2 once (global)**

```bash
sudo npm install -g pm2
```

**4b. Stop any old `node server.js` you may have started by hand**

If you still have a terminal running `node server.js`, press **Ctrl+C** there. Or find and kill the process:

```bash
ps aux | grep "node server.js"
kill <PID>
```

**4c. Start the app under PM2**

```bash
cd ~/Demo-Test-CIS-4375/Capstone_Project/Back-End
pm2 start server.js --name reservation-app
pm2 save
```

You should see PM2 list the app as **online**. Check logs:

```bash
pm2 logs reservation-app --lines 50
```

Look for: `Server running at http://localhost:3000/`

**4d. Start PM2 on EC2 reboot (strongly recommended)**

```bash
pm2 startup
```

Copy and run the **exact** command it prints (it will look like `sudo env PATH=$PATH:... pm2 startup systemd -u ec2-user --hp /home/ec2-user`). Then:

```bash
pm2 save
```

---

## 5. Open the app in a browser

**http://\<your-EC2-Elastic-IP\>:3000**  
Example: `http://3.211.8.41:3000`

Log in as admin and use the Customers tab.

---

## 6. Useful PM2 commands

| Command | What it does |
|---------|----------------|
| `pm2 list` | Show running apps |
| `pm2 logs reservation-app` | Stream logs (Ctrl+C to exit) |
| `pm2 restart reservation-app` | Restart after `git pull` or code changes |
| `pm2 stop reservation-app` | Stop the app |
| `pm2 delete reservation-app` | Remove app from PM2 (then you can `pm2 start` again) |

**After `git pull` on the server:** `npm install` (if `package.json` changed), then **`pm2 restart reservation-app`**. Do **not** run a second `pm2 start` if the app is already listed in `pm2 list`.

---

## 7. Optional: quick test without PM2 (development only)

Only for a short sanity check. **Do not** rely on this for production — closing SSH will often stop the process.

```bash
cd ~/Demo-Test-CIS-4375/Capstone_Project/Back-End
node server.js
```

---

## Checklist

- EC2 security group allows **inbound TCP port 3000** (and 22 for SSH).
- **`Back-End/.env` exists** (created from **`cp .env.example .env`**) with correct **`DB_PASSWORD`**, **`DB_USER`**, **`DB_NAME`**, **`DB_HOST`**.
- App is running under **PM2** (`pm2 list` shows **reservation-app** online), not only a foreground `node server.js`.

**Result:** The app is running on EC2 and pulling code from GitHub (CLU). Use **Operation TRON** when you want to remove it; use **Redeploy after Operation TRON** (above) when you clone again on the same instance.
