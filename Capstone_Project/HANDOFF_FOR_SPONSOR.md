# Handoff Guide — For the Sponsor (Houston Badminton Center)

This document is for the business sponsor. It explains how to use the reservation system and what (if anything) you need to install.

---

## Using the reservation website

**You do not need to install anything to use the website.**

- Once the system is deployed, you open a **web browser** (Chrome, Safari, Edge, etc.) and go to the website URL you’re given.
- You can make reservations, view bookings, and use admin features through the browser. No extra software is required on your computer.

---

## Accessing the database directly (optional)

The reservation data is stored in an **AWS MySQL database**. Most of the time you will only use the website; the database runs in the background.

If you ever need to **access the database directly** (for example, to run reports, export data, or inspect records in a tool like Excel or a database viewer), then someone with technical access would need:

1. **Connection details** (host, database name, username, password) — the project team can provide these securely.
2. **A way to reach the database:**
   - **Option A:** Use a **web-based** report or admin page that the project builds into the site (no install on your computer).
   - **Option B:** Use a **MySQL client** (e.g. MySQL Workbench, DBeaver, or a similar program) on a computer that is allowed to connect (e.g. via a secure tunnel or VPN). In that case, that person would need to install one of those programs.

So: **normal use = no installs.** Only if you need “direct database access” would the person doing that need the right tools and credentials.

---

## What the sponsor is *not* required to install

- No database software (MySQL, etc.) on your own computer for everyday use.
- No coding tools, no Node.js, no special apps — just a modern web browser.

---

## Who manages the technical side

- **AWS (hosting, database, server):** The project team sets this up. After handoff, your organization may take over the AWS account or keep the same setup; that can be decided with the team.
- **Credentials (database, admin login):** The team should give you a secure way to receive and store the website URL, any admin login, and (if applicable) database connection details. Do not share these in email or unsecured chat; use a password manager or secure handoff method.
- **Updates and support:** Discuss with the team how long they will support the system after the capstone and how you’ll get help or future updates.

---

## Quick summary

| What you want to do              | Do you need to install anything? |
|----------------------------------|----------------------------------|
| Use the reservation website     | **No** — just a web browser.     |
| View bookings, manage the site  | **No** — use the website.        |
| Run custom reports / raw DB access | **Maybe** — only if the team sets up direct DB access; then the person doing it may need a MySQL client or a built-in admin page. |

If anything here is unclear, ask the project team to clarify for your situation.
