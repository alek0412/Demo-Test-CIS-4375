# Operation TRON — Remove the application from EC2

Run these commands **on the EC2 instance** (SSH in first: `ssh -i path/to/HBC-Server-Key.pem ec2-user@<Elastic-IP>`).

---

## 1. Stop the Node application

**If you used PM2 to run the app:**
```bash
pm2 list
pm2 stop reservation-app
pm2 delete reservation-app
# Or delete by name if different: pm2 delete <app-name>
```

**If you ran `node server.js` or `nohup node server.js &` (no PM2):**
```bash
# Find the node process
ps aux | grep "node server.js"

# Kill it (use the PID from the second column)
kill <PID>
# If it doesn't stop:
kill -9 <PID>
```

---

## 2. Remove the application directory

```bash
cd ~
rm -rf Demo-Test-CIS-4375
```

If you cloned or used a different folder name (e.g. `CIS-4375-Project`), remove that instead:
```bash
rm -rf CIS-4375-Project
```

---

## 3. (Optional) Clean up PM2

If you used PM2 and have no other apps, you can save the empty list:
```bash
pm2 save
```

---

**Result:** The app is stopped and the code is removed from the instance. The EC2 instance and RDS can stay running; you’ve only removed this application.
