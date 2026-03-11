# AWS Setup Reference (CIS 4375 Capstone)

This file keeps the backend aligned with the AWS infrastructure (VPC, RDS, EC2) and with MySQL Workbench setup.

## Database (RDS MySQL)

- **Engine:** MySQL (Sandbox / Free Tier), not Aurora — lab policy blocks Aurora in AWS Academy.
- **Endpoint:** `reservation-capstone-db.czltypivanye.us-east-1.rds.amazonaws.com`
- **Port:** 3306
- **Master username:** `HBC_DB_Admin`
- **Placement:** Private subnets in `Reservation_Capstone-vpc`, **no public IP** (access only via EC2 or SSH tunnel).
- **Security:** `Private-DB-SG` allows inbound 3306 from the **EC2 security group** (e.g. sg-0ac08fa48b00c4d2a). **Only EC2 can connect to RDS** — the app on your laptop cannot reach the database; run the app on EC2 to use the Admin “Clients” (reservations) view and any DB features.

### Database names (important)

- **`reservation_db`** — Initial database created with RDS. This is what the **Back-End app** uses (see `.env` → `DB_NAME=reservation_db`).
- **`HBC_Reservation_System`** — Schema created in MySQL Workbench (Courts, Customers, Reservations, etc.).

To have the app use the same data as Workbench, either:
- Set **`DB_NAME=HBC_Reservation_System`** in `.env` and use that DB in the app, or
- Create the same tables (Courts, Customers, Reservations) inside **`reservation_db`** and keep `DB_NAME=reservation_db`.

## EC2 (bridge for Workbench / app host)

- **Elastic IP:** 3.211.8.41 (use this in Workbench SSH hostname so it doesn’t change when instance restarts).
- **SSH:** `ec2-user@3.211.8.41`, key: `HBC-Server-Key.pem`.
- **Security group:** SSH (22) from “My IP”; HTTP/HTTPS as needed. EC2’s SG is the **source** allowed in Private-DB-SG for port 3306.
- **Lab behavior:** When the AWS Academy lab stops, the EC2 (and RDS) stop. Someone with lab access must “Start Lab” and start the instance again. No 24/7 in Learner Lab.

## Connecting from your laptop (MySQL Workbench)

Because the DB is in a **private subnet**, use **Standard TCP/IP over SSH** (SSH tunnel via EC2):

| Field | Value |
|-------|--------|
| Connection Method | Standard TCP/IP over SSH |
| SSH Hostname | 3.211.8.41 |
| SSH Username | ec2-user |
| SSH Key File | HBC-Server-Key.pem (run `chmod 400 path/to/HBC-Server-Key.pem` on Mac/Linux) |
| MySQL Hostname | reservation-capstone-db.czltypivanye.us-east-1.rds.amazonaws.com |
| Port | 3306 |
| Username | HBC_DB_Admin |
| Password | (use the one set in RDS; store in keychain if desired) |

**Team:** Share the `.pem` securely (e.g. private Drive/DM), not over plain email. They use the same Workbench settings; EC2 must be running (lab started).

## VPC & networking

- **VPC:** `Reservation_Capstone-vpc`
- **Subnets:** 2 public (EC2), 2 private (RDS). No NAT Gateway (budget).
- **DB subnet group:** `private-sb_subnet-group` (private subnets only). RDS in a **public** subnet would allow direct TCP/IP from the internet, but current setup is private-by-design.

## This repo

- **Back-End** uses `config.js` and `db/connection.js` (MySQL via `mysql2`).
- **`.env`** has `DB_HOST`, `DB_PORT=3306`, `DB_NAME=reservation_db`, `DB_USER`, `DB_PASSWORD`.
- On EC2: copy repo + `.env` (or set same vars), `npm install`, `node server.js`. App reaches RDS over the private VPC.

---

## Deploying the app on EC2 (when you’re ready)

When you’re done editing and want the live site to run on EC2 and connect to the database, follow this. No code changes are required — the app already uses `.env` and will connect to RDS when run on EC2.

### 1. EC2 security group

- In AWS: EC2 → Security Groups → select the security group attached to your instance.
- Add **inbound rule**: Type **Custom TCP**, Port **3000** (or whatever `PORT` is in `.env`), Source **0.0.0.0/0** (or restrict to your IP if you prefer). This lets browsers reach your app.

### 2. Get your code onto EC2

- **Option A:** From your laptop: `scp -i path/to/HBC-Server-Key.pem -r Capstone_Project ec2-user@3.211.8.41:~/`
- **Option B:** On EC2: `git clone https://github.com/IPochynyukCoding/CIS-4375-Project.git` then move or copy the `Capstone_Project` folder into place. (You still need to add `.env` on EC2 — see below.)

### 3. Add `.env` on EC2

- Create `Capstone_Project/Back-End/.env` **on the EC2 instance** (do not commit this file). Use the same values you use locally or in Workbench, for example:

```env
PORT=3000
DB_HOST=reservation-capstone-db.czltypivanye.us-east-1.rds.amazonaws.com
DB_PORT=3306
DB_NAME=reservation_db
DB_USER=HBC_DB_Admin
DB_PASSWORD=your_rds_password
```

- Use `DB_NAME=HBC_Reservation_System` if your tables (e.g. `reservations`) live in that database.

### 4. Install and run on EC2

SSH in, then:

```bash
cd ~/Capstone_Project/Back-End
npm install
node server.js
```

- The server will listen on port 3000. Because the app is running on EC2 (inside the VPC), it **will** be able to connect to RDS; no extra config is needed.

### 5. Open the app

- In a browser: **http://3.211.8.41:3000** (or your EC2 Elastic IP and port). You should see the client dashboard; log in to admin to use the Clients (reservations) view and DB features.

### 6. (Optional) Keep the app running

- `node server.js` stops when you close the SSH session. To keep it running: use `nohup node server.js &`, or a process manager like **pm2** (see below).

---

## REMINDER: Next time you upload to EC2 (PM2 already installed)

If you already ran `sudo npm install -g pm2` on the instance, you **don’t need to install anything else**. Just:

1. **Clone** (or upload) the repo so you have `Capstone_Project/Back-End` and `Front-End` on the instance.
2. **On EC2:**
   ```bash
   cd ~/Demo-Test-CIS-4375/Capstone_Project/Back-End   # or CIS-4375-Project/Capstone_Project/Back-End
   cp .env.example .env
   nano .env   # set DB_USER, DB_PASSWORD, etc.
   npm install
   pm2 start server.js --name "reservation-app"
   ```
3. **(Optional)** Start on reboot: run `pm2 startup`, run the command it prints, then `pm2 save`.

Useful: `pm2 list` | `pm2 logs reservation-app` | `pm2 restart reservation-app` | `pm2 stop reservation-app`

---

**Summary:** Upload your front-end and back-end code to EC2, add `.env` with the same DB settings, run `npm install` and `node server.js`. The EC2 instance already has network access to RDS, so the app will connect to the database when you run it there.
