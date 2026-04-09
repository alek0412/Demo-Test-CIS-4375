# Operation ARES — Set up the application on EC2 (grab code from GitHub)

**Code source:** CLU (public repo) — `https://github.com/alek0412/Demo-Test-CIS-4375`

**Related operations (all kept in this repo):** **Operation CLU** — routine `git pull` + PM2 restart when the app is already deployed (`OPERATION_CLU.md`). **Operation TRON** — remove app from EC2 (`OPERATION_TRON.md`). **Operation ARES** (this file) — full setup or redeploy after TRON.

---

## ARES quick checklist (use this on every fresh deploy / after TRON)

Follow **in order**. The sections below (**§0–§7**, **Redeploy after TRON**) expand each step.

| Step | What | Where |
|------|------|--------|
| 1 | **`chmod 400`** your **`.pem`** on your **laptop** (quoted path if it has spaces). | **§0a** |
| 2 | **`git clone`** (or **`git pull`** if the repo already exists). | **§1**, **Redeploy** |
| 3 | **`cp .env.example .env`** in **`Back-End`**, fill **`DB_*`** and secrets. | **§2** |
| 4 | Create **`(Python)/backend_access.env`** with **`SECRET_KEY`**, **`SSH_HOST`**, **`SSH_USER`**, **`DB_*`**, and **`SSH_PKEY=/home/ec2-user/hbc-config/HBC-Server-Key.pem`** (Linux path). | **§2b** |
| 5 | **Copy the `.pem` to EC2** with **`scp`** from your **laptop** (not from inside SSH). Then on EC2: **`chmod 400 ~/hbc-config/HBC-Server-Key.pem`**. | **§2c** |
| 6 | **`npm install`** in **`Capstone_Project/Back-End`** — **required** or Node errors with **`Cannot find module 'dotenv'`**. | **§3**, **Redeploy** |
| 7 | **`pip3 install`** Python packages (waitress, flask, …). | **§3** |
| 8 | **`pm2 start`** **Flask first** (`waiver-api` from **`(Python)`**), then **Node** (`reservation-app` from **`Back-End`**). Only **one** of each. **`pm2 save`**. | **§4**, **Redeploy** |
| 9 | **`pm2 startup`** once on a **new** server (skip if already done on this instance). | **§4e** |
| 10 | **Verify:** **`pm2 list`** (both **online**). Optional: **`pm2 flush`** then **`pm2 restart waiver-api`** and check logs — error log should **not** show **`No password or public key available!`**. | **§2c-3**, **§6** |
| 11 | **Browser:** **`http://<Elastic-IP>:3000/`** (not on the **`ssh`** command — **no `:3000`** there). | **§0b–c**, **§5** |

**AWS security group:** TCP **22** (SSH) and **3000** (site). **§0d**

**Backups (not in Git):** save copies of **`Back-End/.env`**, **`(Python)/backend_access.env`**, and optionally **`~/hbc-config/*.pem`** before **`rm -rf`** the repo (TRON).

**SSH vs browser:** **`ssh … ec2-user@x.x.x.x`** has **no port**; **`http://x.x.x.x:3000/`** is the app. **§0b**

---

## 0. On your laptop: PEM key and SSH (do this before the EC2 steps)

Everything in **§0** runs on **your Mac or PC** — not on the server. Skipping this causes “could not resolve hostname”, “Permission denied (publickey)”, or wasted time running `chmod` in the wrong place.

### 0a. Find your `.pem` file and lock permissions

1. Locate the key (example path): `~/Documents/CIS_Courses/CIS 4375/HBC-Server-Key.pem`
2. If the path has **spaces**, always use **quotes** around the path.
3. **On your laptop**, run (use your real path):

   ```bash
   chmod 400 "/full/path/to/HBC-Server-Key.pem"
   ```

4. **Do not** run `chmod` for `/Users/...` paths **after you have SSH’d into EC2** — that path only exists on your laptop. If the Flask/Python app on EC2 needs its **own** key file for `SSH_PKEY`, that file must live **on the server** (e.g. under `~/hbc-config/`) and you `chmod` **that** path on EC2 — it is a different file/path than your laptop’s `.pem` for logging in.

### 0b. Connect with SSH (no `:3000` on the command)

- **Port 3000** is for the **website** in a browser, not for SSH.
- SSH uses the instance **IP or DNS** and default port **22**.

```bash
ssh -i "/full/path/to/HBC-Server-Key.pem" ec2-user@<Elastic-IP>
```

**Wrong (will fail):** `ec2-user@3.x.x.x:3000` — OpenSSH treats `:3000` as part of the hostname.

**Right:** `ec2-user@3.x.x.x` only.

### 0c. Open the app in a browser (after the server is running on EC2)

Use **HTTP** and **port 3000**:

`http://<Elastic-IP>:3000/`

### 0d. AWS security group (once)

Inbound **TCP 22** (SSH) and **TCP 3000** (Node app) from where you need access.

---

After you see a prompt like `ec2-user@ip-... ~]$`, you are **on EC2** — continue with **Order of operations** below, then **§1–§4** (clone, `.env`, install, PM2). Those steps all run **on the EC2 instance** unless stated otherwise. For **`waiver-api`**, also follow **§2c** (SSH key file on EC2 + **`SSH_PKEY`**); skipping it causes **`No password or public key available!`** in **`pm2 logs waiver-api`**.

**Important:** Use **PM2** below so the app **keeps running after you close SSH** and can **restart on reboot**. Running only `node server.js` in a terminal ties the process to that session; when you disconnect, the app often stops.

### Order of operations (read this — avoids “port 3000 already in use”)

The public site is **Node** on **port 3000**. **Waiver registration** (`/api/waiver-register`) is handled by **Flask (Python)** on **port 3001**; Node **proxies** to Flask. On a single EC2 instance you normally run **both** under PM2. Only **3000** needs to be open in the security group for browsers; **3001** can stay **localhost-only**.

Do these **in order**. **Do not** start the servers until installs finish.

1. `git clone` → set up **Node** in **`Capstone_Project/Back-End`** and **Python** in **`Capstone_Project/Back-End/(Python)`** (folder name has parentheses — use quotes: `cd "$HOME/.../Back-End/(Python)"`).
2. **`cp .env.example .env`** in **Back-End** → edit **`.env`** (RDS and secrets). Set **`FLASK_WAIVER_URL=http://127.0.0.1:3001`** unless Flask runs elsewhere (default matches local Flask).
3. Create **`backend_access.env`** in **`Back-End/(Python)/`** (not in git) with **`SECRET_KEY`**, SSH tunnel vars (**`SSH_HOST`**, **`SSH_PKEY`**, **`SSH_USER`**), and DB vars (**`DB_HOST`**, **`DB_PORT`**, **`DB_USER`**, **`DB_PASSWORD`**, **`DB_NAME`**) — same database as RDS; Python uses the tunnel in `ssh_connection.py`.
4. **`npm install`** in **Back-End**.
5. **Python deps** (once per instance / after new venv): e.g. `pip3 install waitress flask python-dotenv mysql-connector-python sshtunnel python-dateutil`.
6. **Only then** start **Flask** then **Node** with PM2 (**or** test with foreground commands) — **do not** run two listeners on the same port.

**If port 3000 is already in use:** something is already listening (usually a **previous** `pm2 start` or a leftover `node server.js`). Check:

```bash
pm2 list
```

- If **`reservation-app`** is already **online**, you **do not** run `pm2 start` again. After `git pull` / `npm install`, use **`pm2 restart reservation-app`** only. If you run **Flask** under PM2 as **`waiver-api`**, restart it after Python changes: **`pm2 restart waiver-api`**.
- If you need a **clean** start: `pm2 stop reservation-app` → `pm2 delete reservation-app`, **then** `pm2 start server.js --name reservation-app`. Same idea for **`waiver-api`** if you need to reset Flask.
- **Do not** run **`node server.js`** in the shell while PM2 is already running the same app — that tries to open port 3000 twice and triggers **EADDRINUSE**.
- **Port 3001** is for **Flask only**. If **`EADDRINUSE`** on 3001, check **`pm2 list`** for a duplicate **`waiver-api`** or a stray **`python … flask_server.py`**.

**Routine code updates** (repo already cloned, PM2 already managing the app): same flow as **Operation CLU** — see **`OPERATION_CLU.md`**. In short: `git pull` → **`npm install`** (if Node deps changed) → **`pip3 install …`** (if you added Python packages) → **`pm2 restart waiver-api`** (if Python changed) → **`pm2 restart reservation-app`**. You should **not** need to kill processes or fight port 3000 unless something was started twice.

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

   Set **`DB_PASSWORD`**, **`DB_HOST`**, **`DB_USER`**, **`DB_NAME`**, **`FLASK_WAIVER_URL`** (if needed), and any other values (same as before — keep a private copy outside the repo). Recreate **`(Python)/backend_access.env`** the same way as in **§2b**, and follow **§2c** to place the **`.pem`** on EC2 and set **`SSH_PKEY`** (required for **`waiver-api`**).

3. **Install dependencies, then start under PM2** (install **before** `pm2 start` — see **Order of operations** above)

   ```bash
   npm install
   pip3 install waitress flask python-dotenv mysql-connector-python sshtunnel python-dateutil
   ```

   If **`git clone` fails** with “destination path already exists”, either use the existing folder or remove it (`rm -rf ~/Demo-Test-CIS-4375`) and clone again — **save copies of `.env` and `backend_access.env` first** (they are not in Git).

   **Always run `npm install` in `Back-End` before `pm2 start server.js`** — otherwise Node may crash with **`Cannot find module 'dotenv'`**.

   Start **Flask** first (port **3001**), then **Node** (port **3000**). Only **one** of each process (if you see **two** `waiver-api` rows in `pm2 list`, delete extras: **`pm2 delete <id>`**).

   ```bash
   cd "$HOME/Demo-Test-CIS-4375/Capstone_Project/Back-End/(Python)"
   pm2 start flask_server.py --name waiver-api --interpreter python3
   cd "$HOME/Demo-Test-CIS-4375/Capstone_Project/Back-End"
   pm2 start server.js --name reservation-app
   pm2 save
   ```

   Ensure **`backend_access.env`** exists in **`(Python)`** before starting **`waiver-api`** (see **§ Python / Flask waiver service** below).

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

**Waiver proxy (Node → Flask):** set **`FLASK_WAIVER_URL=http://127.0.0.1:3001`** in **`.env`** when Flask runs on the same EC2 instance (this is the default in code if unset). Change it only if the waiver API is on another host/port.

- **Save and exit in nano:** Ctrl+O, Enter, Ctrl+X.

**After updates from Git:** your `.env` stays on the server; only run `git pull`. Re-copy `.env.example` only if new variables were added and you need to merge them by hand.

---

## 2b. Python / Flask waiver service (`backend_access.env`)

The **General Waiver** form posts to Node; Node proxies to **Flask** (`routes/customer.py` → **`POST /api/waiver-register`**). Flask loads **`backend_access.env`** from the **`(Python)`** working directory (not the same file as **Back-End `.env`**).

```bash
cd "$HOME/Demo-Test-CIS-4375/Capstone_Project/Back-End/(Python)"
nano backend_access.env
```

You need at least:

- **`SECRET_KEY`** — Flask session secret (any long random string).
- **`SSH_HOST`**, **`SSH_USER`**, **`SSH_PKEY`** — bastion/jump host and path to the **private key file on the EC2 instance** (see **`§2c`** — required or Flask crashes with `No password or public key available!`).
- **`DB_HOST`**, **`DB_PORT`**, **`DB_USER`**, **`DB_PASSWORD`**, **`DB_NAME`** — RDS endpoint and credentials (MySQL is reached **through** the tunnel).

**Do not commit** `backend_access.env`. Keep a backup off the server.

---

## 2c. Put the SSH private key on EC2 (`SSH_PKEY`) — required for `waiver-api`

Flask uses **`sshtunnel`** with **`SSH_PKEY`** as the path to a **private key file that exists on the EC2 filesystem** (`ssh_connection.py`). A **Mac path** like **`/Users/you/.../HBC-Server-Key.pem`** is **wrong** in `backend_access.env` — that path does not exist on Linux.

**Do this once per fresh EC2 setup** (or after TRON if you did not keep `~/hbc-config`).

### 2c-1. On your laptop only — copy the `.pem` up to EC2

Use a **Mac/Linux terminal** where the prompt is **your laptop user** (not `ec2-user@...`). If you are SSH’d into EC2, type **`exit`** first.

1. Create the folder on the server:

   ```bash
   ssh -i "/full/path/to/HBC-Server-Key.pem" ec2-user@<Elastic-IP> "mkdir -p ~/hbc-config"
   ```

2. Copy the **same** key you use for SSH (quotes if the path has spaces):

   ```bash
   scp -i "/full/path/to/HBC-Server-Key.pem" \
     "/full/path/to/HBC-Server-Key.pem" \
     ec2-user@<Elastic-IP>:~/hbc-config/HBC-Server-Key.pem
   ```

You should see **`100%`** and the byte size when `scp` succeeds.

**Do not** run `scp` with `/Users/...` paths **from inside an EC2 shell** — those paths only exist on your laptop.

### 2c-2. On EC2 — permissions and `backend_access.env`

SSH in, then:

```bash
chmod 400 ~/hbc-config/HBC-Server-Key.pem
ls -la ~/hbc-config/HBC-Server-Key.pem
```

In **`backend_access.env`** (in **`(Python)`**), set **`SSH_PKEY`** to the **Linux** path, for example:

```text
SSH_PKEY=/home/ec2-user/hbc-config/HBC-Server-Key.pem
```

Keep **`SSH_HOST`**, **`SSH_USER`**, and DB variables aligned with your bastion/RDS setup.

### 2c-3. After editing env — restart Flask

```bash
pm2 restart waiver-api
pm2 logs waiver-api --lines 40 --nostream
```

Confirm **`waiver-api`** stays **online** (restart count ↺ not climbing) and the error log does **not** repeat `No password or public key available!`.

---

## 3. Install dependencies

```bash
cd ~/Demo-Test-CIS-4375/Capstone_Project/Back-End
npm install
```

**Python (waiver API):**

```bash
cd "$HOME/Demo-Test-CIS-4375/Capstone_Project/Back-End/(Python)"
pip3 install waitress flask python-dotenv mysql-connector-python sshtunnel python-dateutil
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

**4c. Start Flask (waiver API) under PM2 — port 3001**

Flask must be running **before** users submit the waiver (or Node will return 503 when proxying). PM2’s working directory must be **`(Python)`** so **`backend_access.env`** loads.

```bash
cd "$HOME/Demo-Test-CIS-4375/Capstone_Project/Back-End/(Python)"
pm2 start flask_server.py --name waiver-api --interpreter python3
```

Check logs:

```bash
pm2 logs waiver-api --lines 50
```

You should see the tunnel/DB connection messages from your Python stack when the app starts.

**4d. Start Node under PM2 — port 3000**

```bash
cd ~/Demo-Test-CIS-4375/Capstone_Project/Back-End
pm2 start server.js --name reservation-app
pm2 save
```

You should see PM2 list both apps as **online**. Check Node logs:

```bash
pm2 logs reservation-app --lines 50
```

Look for: `Server running at http://localhost:3000/`

**4e. Start PM2 on EC2 reboot (strongly recommended)**

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
| `pm2 logs reservation-app` | Stream Node logs (Ctrl+C to exit) |
| `pm2 logs waiver-api` | Stream Flask / waiver API logs |
| `pm2 restart reservation-app` | Restart Node after `git pull` or code changes |
| `pm2 restart waiver-api` | Restart Flask after Python or `backend_access.env` changes |
| `pm2 stop reservation-app` | Stop the Node app |
| `pm2 delete reservation-app` | Remove Node from PM2 (then you can `pm2 start` again) |
| `pm2 stop waiver-api` / `pm2 delete waiver-api` | Same for Flask |

**After `git pull` on the server:** `npm install` (if `package.json` changed), **`pm2 restart waiver-api`** (if Python changed), then **`pm2 restart reservation-app`**. Do **not** run a second `pm2 start` if the app is already listed in `pm2 list`.

---

## 7. Optional: quick test without PM2 (development only)

Only for a short sanity check. **Do not** rely on this for production — closing SSH will often stop the process. For waiver tests, run **Flask in one SSH session** and **Node in another** (Flask **3001** first).

```bash
cd "$HOME/Demo-Test-CIS-4375/Capstone_Project/Back-End/(Python)"
python3 flask_server.py
```

```bash
cd "$HOME/Demo-Test-CIS-4375/Capstone_Project/Back-End"
node server.js
```

---

## Checklist

Use the **ARES quick checklist** table at the top as the master order; the bullets below are the same checks in prose.

- EC2 security group allows **inbound TCP port 3000** (and 22 for SSH). **Port 3001** does **not** need to be public if Node and Flask are on the same instance.
- **`Back-End/.env` exists** (created from **`cp .env.example .env`**) with correct **`DB_PASSWORD`**, **`DB_USER`**, **`DB_NAME`**, **`DB_HOST`**, and **`FLASK_WAIVER_URL`** if Flask is not at **`http://127.0.0.1:3001`**.
- **`Back-End/(Python)/backend_access.env`** exists with **`SECRET_KEY`** and SSH/DB variables for the Python tunnel and RDS.
- **`SSH_PKEY`** points to a **private key file on EC2** (e.g. **`/home/ec2-user/hbc-config/HBC-Server-Key.pem`**) — see **§2c** (`scp` from your laptop, then **`chmod 400`** on EC2). Not a **`/Users/...`** Mac path.
- **Both** processes are running under **PM2**: **`waiver-api`** (Flask, **3001**) and **`reservation-app`** (Node, **3000**), not only foreground terminals.

**Result:** The app is running on EC2 and pulling code from GitHub (CLU). Waiver registration works when **waiver-api** is online and can reach RDS through your tunnel. Use **Operation TRON** when you want to remove it; use **Redeploy after Operation TRON** (above) when you clone again on the same instance.
