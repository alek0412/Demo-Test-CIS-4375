# AWS Setup Reference (CIS 4375 Capstone)

This file keeps the backend aligned with the AWS infrastructure (VPC, RDS, EC2) and with MySQL Workbench setup.

## Database (RDS MySQL)

- **Engine:** MySQL (Sandbox / Free Tier), not Aurora — lab policy blocks Aurora in AWS Academy.
- **Endpoint:** `reservation-capstone-db.czltypivanye.us-east-1.rds.amazonaws.com`
- **Port:** 3306
- **Master username:** `HBC_DB_Admin`
- **Placement:** Private subnets in `Reservation_Capstone-vpc`, **no public IP** (access only via EC2 or SSH tunnel).
- **Security:** `Private-DB-SG` allows inbound 3306 from the **EC2 security group** (e.g. sg-0ac08fa48b00c4d2a).

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
