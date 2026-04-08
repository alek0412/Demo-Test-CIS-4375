# Operation TRON — Remove the application from EC2

Run these commands **on the EC2 instance** (SSH in first: `ssh -i path/to/HBC-Server-Key.pem ec2-user@<Elastic-IP>`).

When you want the app **back** on this instance after a fresh clone, follow **Operation ARES** → **“Redeploy after Operation TRON.”**

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
rm -rf Demo-Test-CIS-4375
```

If you used a different folder name (e.g. `CIS-4375-Project`), remove that instead:

```bash
rm -rf CIS-4375-Project
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

**Result:** The app is stopped and the code is removed from the instance. The EC2 instance and RDS can stay running. To **clone from GitHub and run the app again**, use **Operation ARES** → **Redeploy after Operation TRON**.
