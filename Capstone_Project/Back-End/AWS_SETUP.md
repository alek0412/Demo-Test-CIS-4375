# AWS Setup Reference (CIS 4375 Capstone)

This file keeps the backend aligned with the AWS infrastructure discussed in the capstone (VPC, RDS, EC2).

## Database (RDS MySQL)

- **Engine:** MySQL (Sandbox / Free Tier), not Aurora — lab policy blocks Aurora in AWS Academy.
- **Endpoint:** `reservation-capstone-db.czltypivanye.us-east-1.rds.amazonaws.com`
- **Port:** 3306
- **Database name:** `reservation_db`
- **Master username:** `HBC_DB_Admin`
- **Placement:** Private subnets in `Reservation_Capstone-vpc`, **no public IP** (Public access: No).
- **Security:** `Private-DB-SG` allows inbound 3306 only from the **EC2 security group** (Public-SG / Web-SG).

## VPC & Networking

- **VPC:** `Reservation_Capstone-vpc`
- **Subnets:** 2 public (web server), 2 private (database). No NAT Gateway (budget).
- **DB subnet group:** `private-sb_subnet-group` (private subnets only).

## EC2 (not launched yet)

- When launched: **Amazon Linux 2023**, **t2.micro**, in a **public subnet** of `Reservation_Capstone-vpc`.
- **Security group:** Public-SG (HTTP 80, HTTPS 443, SSH 22 from My IP).
- This app runs on EC2; it connects to the DB over the **private VPC** (no internet exposure for DB).

## Connecting to the DB

- **From this app (on EC2):** Use `.env` / `config.js` — already set. App connects via private VPC.
- **From your laptop (e.g. MySQL Workbench):** DB has no public IP. Options:
  1. **Best practice:** Launch EC2, then use **SSH tunnel** in Workbench (SSH hostname = EC2 public IP, key = .pem).
  2. **Temporary:** RDS → Modify → Public access: Yes, and add an inbound rule in `Private-DB-SG` for MySQL 3306 from **My IP** (then turn off when done).

## This repo

- **Back-End** uses `config.js` and `db/connection.js` (MySQL via `mysql2`).
- **`.env`** holds `DB_HOST`, `DB_PORT=3306`, `DB_NAME=reservation_db`, `DB_USER`, `DB_PASSWORD`.
- On EC2, copy `.env` (or set the same vars) and run `node server.js` (after `npm install`).
