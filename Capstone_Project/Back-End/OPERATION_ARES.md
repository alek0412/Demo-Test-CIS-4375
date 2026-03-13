# Operation ARES — Set up the application on EC2 (grab code from GitHub)

Run these commands **on the EC2 instance** (SSH in first: `ssh -i path/to/HBC-Server-Key.pem ec2-user@<Elastic-IP>`).

**Code source:** CLU (public repo) — `https://github.com/alek0412/Demo-Test-CIS-4375`

---

## 1. Clone the repo

```bash
cd ~
git clone https://github.com/alek0412/Demo-Test-CIS-4375.git
cd Demo-Test-CIS-4375
```

---

## 2. Create `.env` in the Back-End folder

```bash
cd ~/Demo-Test-CIS-4375/Capstone_Project/Back-End
nano .env
```

Paste the following and **replace `your_actual_rds_password`** with your real RDS password:

```env
PORT=3000
DB_HOST=reservation-capstone-db.czltypivanye.us-east-1.rds.amazonaws.com
DB_PORT=3306
DB_NAME=reservation_db
DB_USER=HBC_DB_Admin
DB_PASSWORD=your_actual_rds_password
```

- **Save and exit:** Ctrl+O, Enter, Ctrl+X.
- Use `DB_NAME=HBC_Reservation_System` if your Customer table lives in that database.

---

## 3. Install dependencies and start the server

```bash
cd ~/Demo-Test-CIS-4375/Capstone_Project/Back-End
npm install
node server.js
```

You should see: `Server running at http://localhost:3000/`

---

## 4. Open the app

In your browser: **http://<your-EC2-Elastic-IP>:3000**  
Example: `http://3.211.8.41:3000`

Log in as admin and use the Customers tab.

---

## 5. Keep the app running (recommended: PM2)

Using **PM2** keeps the site running after you close SSH and restarts it if it crashes.

**5a. Install PM2 once (if not already installed)**  
```bash
sudo npm install -g pm2
```

**5b. Start the app with PM2**  
```bash
cd ~/Demo-Test-CIS-4375/Capstone_Project/Back-End
pm2 start server.js --name reservation-app
pm2 save
```

**5c. (Optional) Start the app on EC2 reboot**  
```bash
pm2 startup
```
Run the command it prints (it will look like `sudo env PATH=...`). Then:
```bash
pm2 save
```

**Useful PM2 commands**
| Command | What it does |
|---------|----------------|
| `pm2 list` | Show running apps |
| `pm2 logs reservation-app` | View logs |
| `pm2 restart reservation-app` | Restart the app |
| `pm2 stop reservation-app` | Stop the app |

---

## Checklist

- EC2 security group allows **inbound TCP port 3000** (and 22 for SSH).
- `.env` exists and has the correct `DB_USER` and `DB_PASSWORD` (and `DB_NAME` if different).

**Result:** The app is running on EC2 and pulling code from GitHub (CLU). Use **Operation TRON** when you want to remove it.
