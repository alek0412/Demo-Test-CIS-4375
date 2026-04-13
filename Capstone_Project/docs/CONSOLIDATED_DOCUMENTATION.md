# CIS-4375 — Project essentials

Single Markdown reference for this repo. **Implementation details** live in `Capstone_Project/Back-End/`, `Capstone_Project/Front-End/`, and the **Outline for Sponsor** folder (CloudFormation + env templates).

---

## Team

Capstone (CIS 4375) — Team 16:

- Nam Vu  
- Alek Espinosa  
- Ivan Pochynyuk
- Ken Vuong
- Joshua Sajan
- Dylan Hayward

**Canonical GitHub (production pulls on EC2):** [IPochynyukCoding/CIS-4375-Project](https://github.com/IPochynyukCoding/CIS-4375-Project)

---

## What lives where

| Area | Location |
|------|----------|
| Node API | `Capstone_Project/Back-End/` — `server.js`, `routes/` |
| Flask (waiver / proxied APIs) | `Capstone_Project/Back-End/(Python)/` — `flask_server.py`, `routes/` |
| Front-end pages | `Capstone_Project/Front-End/` |
| This doc | `Capstone_Project/docs/CONSOLIDATED_DOCUMENTATION.md` |
| **Sponsor CloudFormation (handout with repo)** | `Capstone_Project/docs/cloudformation-reservation-capstone-sanitized.yaml` — **same stack** as the canonical file in **Outline for Sponsor** (edit Outline first, then sync this copy) |
| **Sponsor env templates** | **`Outline for Sponsor/`** — `back-end.env.template`, `backend_access.env.template` |

---

## Run locally (quick)

```bash
cd Capstone_Project/Back-End
node server.js
```

Open **http://localhost:3000**. Configure `.env` / Python env as needed for DB (see templates).

---

## Environment files (never commit real secrets)

Create these on each machine from the **templates**; they are gitignored.

| Deployed file | Use this template |
|---------------|-------------------|
| **`Capstone_Project/Back-End/.env`** | **`Capstone_Project/Back-End/.env.example`** (repo), **or** **`Outline for Sponsor/back-end.env.template`** (generic RDS placeholders + optional SMTP, `CUSTOMER_SESSION_SECRET`, `APP_BASE_URL`, etc.) |
| **`Capstone_Project/Back-End/(Python)/backend_access.env`** | **`Outline for Sponsor/backend_access.env.template`** |

**Minimum meaning:**

- **Node `.env`:** `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`; point Flask proxy at Python (e.g. `http://127.0.0.1:3001`) per comments in `.env.example`.
- **`backend_access.env`:** `SECRET_KEY`; `SSH_HOST`, `SSH_USER`, **`SSH_PKEY`** = **Linux path on the EC2 box** to the private key (e.g. `/home/ec2-user/hbc-config/YourKey.pem`), not a Mac path; same DB settings as Node (Flask uses an SSH tunnel to RDS — see `ssh_connection.py`).

Copy your `.pem` to the server once: `scp` from your laptop, then `chmod 400` on EC2.

Full variable lists are **only** in the template files above (kept in sync there).

**Outline for Sponsor** absolute path (example):  
`/Users/alekespinosa/Documents/CIS_Courses/CIS 4375/Outline for Sponsor/`

---

## AWS — sponsor CloudFormation

**Give the sponsor this file from the repo** (greenfield stack — ALB, two EC2s, Multi-AZ RDS):

`Capstone_Project/docs/cloudformation-reservation-capstone-sanitized.yaml`

**Canonical copy (edit first, then overwrite the repo file so they stay identical):**

`Outline for Sponsor/cloudformation-reservation-capstone-sanitized.yaml`

Deploy: AWS Console → CloudFormation → upload template, or `aws cloudformation create-stack` after creating a **key pair** in the region.

**What it provisions:** VPC + public/private subnets (2 AZs), **internet-facing ALB on port 80** → two **EC2** instances (app on **3000**, open **only** from the ALB SG), **Multi-AZ RDS MySQL** in private subnets, master password in **Secrets Manager**. **No app install in UserData** — you still clone the repo and run Node/Flask on **both** instances. Use stack **Outputs** (**ALB DNS** for the site URL).

**Legacy course stacks** may still be **one EC2 + Elastic IP + `:3000`**; that path differs from the ALB template (use **instance IP:3000** and SG rules that match).

### After the stack runs — key pair, RDS, Secrets Manager, EC2 Connect

When someone **creates the stack** from the template:

1. **EC2 key pair** — In **EC2 → Key Pairs** (same **region** as the stack), create or choose a key pair **before** or while filling stack parameters. The template’s **KeyName** parameter attaches that key to **both** web instances so you can SSH (or use the `.pem` path in `backend_access.env` for the tunnel). Download and store the `.pem` safely.

2. **RDS database** — Open the **RDS** console (RDS and Aurora databases are listed here). Select the **MySQL** instance the stack created. Note the **endpoint**, **port**, and **master username** (defaults come from the template parameters, e.g. `DbMasterUsername`; you can **modify** the instance later).

3. **Username changes** — If you **rename** or **change** the master DB username in RDS, update **`DB_USER`** (and any matching fields) in **both** **`Back-End/.env`** and **`Back-End/(Python)/backend_access.env`**. Those files are not “wired” to AWS automatically — they must match whatever you configured in RDS.

4. **Password / Secrets Manager** — The template uses **managed master credentials** (`ManageMasterUserPassword`), so the master password is stored in **AWS Secrets Manager** (see stack **Outputs** such as **`DbMasterSecretArn`**, and the RDS console links to the secret). You can **read** the current password from that secret when filling `.env`, **or** use **RDS → Modify** to rotate/set a master password you choose; if you change it in RDS, update **`DB_PASSWORD`** in **both** env files to match. Do not leave the app pointing at stale placeholder values from a pre-filled template.

5. **Starting the app on the server** — Use **EC2 → Instances → Connect** (**EC2 Instance Connect** or **Session Manager**, depending on what your account allows) to open a shell on each web instance without needing a local SSH client for the first steps. From that session, do the **clone / npm / pip / `.env` / PM2** steps in **[EC2 deploy](#ec2-deploy-condensed)** on **both** instances behind the ALB.

---

## EC2 deploy (condensed)

Assumes Amazon Linux–style host and repo at `~/CIS-4375-Project` (adjust paths).

1. **Clone** (from GitHub link above), **`cd` into `Capstone_Project/Back-End`**.
2. **`npm install`**. Python: e.g. `pip3 install waitress flask python-dotenv mysql-connector-python sshtunnel python-dateutil` (from `(Python)` dir as needed).
3. **`cp .env.example .env`** (or copy from sponsor **`back-end.env.template`**), fill RDS and secrets. Create **`backend_access.env`** from **`backend_access.env.template`**; place **`.pem`** on EC2 and set **`SSH_PKEY`**.
4. **PM2** (from correct working dirs — Flask needs **`(Python)`** so `backend_access.env` loads):

   ```bash
   cd ~/CIS-4375-Project/Capstone_Project/Back-End/(Python)
   pm2 start flask_server.py --name waiver-api --interpreter python3

   cd ~/CIS-4375-Project/Capstone_Project/Back-End
   pm2 start server.js --name reservation-app
   pm2 save
   pm2 startup    # run the command it prints, then pm2 save again
   ```

5. **URL:** **ALB DNS on port 80** if you used the new stack; **`http://<EIP>:3000`** if legacy single instance.

**Routine updates:** `git pull` → `npm install` if dependencies changed → `pm2 restart waiver-api` (if Python/env changed) → `pm2 restart reservation-app`.

**Teardown:** back up `.env` files → `pm2 delete` / stop apps → remove clone if desired (`pm2 kill` affects all PM2 apps — use carefully).

---

## Sponsor (non-technical)

Day-to-day use is the **website in a browser**. Direct MySQL access is optional and needs credentials + a safe network path. AWS account ownership and credential handoff are agreed with the team.

---

## What this file does *not* replace

| Topic | Source of truth |
|--------|-------------------|
| API behavior & validation | Code under `Back-End/` |
| UI copy & pages | `Front-End/` + templates |
| DB tables | RDS + application usage (no single schema dump required here) |
| Env variable **full** text | **`Back-End/.env.example`**, **`Outline for Sponsor/back-end.env.template`**, **`backend_access.env.template`** |
| Infrastructure YAML | **`Capstone_Project/docs/cloudformation-reservation-capstone-sanitized.yaml`** (handout) — edits in **`Outline for Sponsor/cloudformation-reservation-capstone-sanitized.yaml`** first, then sync |

---

*Earlier long-form notes (site map draft, extended OPERATION\_\* prose) were folded into this shorter summary; extend this file if the team adds new stable procedures.*
