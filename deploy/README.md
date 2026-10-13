# Deploying Firqui Jewels on AWS

One EC2 server runs everything:

```
Browser ──HTTPS──> Nginx ──┬── static site      /var/www/firqui
                           └── /api, /uploads ──> Spring Boot (127.0.0.1:8080) ──> PostgreSQL
```

| What | Where on the server |
|---|---|
| Website files | `/var/www/firqui` |
| Backend jar | `/opt/firqui/app/firqui.jar` (service name `firqui`) |
| Product images, payment screenshots | `/var/lib/firqui/uploads`, `/var/lib/firqui/private_storage` |
| Secrets and settings | `/etc/firqui/firqui.env` |
| Nightly database backups | `/var/backups/firqui` (14 days) |

The examples use `firquijewels.com`. Replace it with the domain you choose as the main one.

## 1. Push the code

The server pulls the code from GitHub, so commit and push these changes first.

## 2. Create the server

In the AWS console, choose the **Mumbai (ap-south-1)** region, then EC2 → Launch instance:

- **Image:** Ubuntu Server 24.04 LTS
- **Type:** `t3.small` (2 GB RAM). `t3.micro` is too small for Java and PostgreSQL together.
- **Key pair:** create one and keep the `.pem` file safe
- **Storage:** 20 GB gp3
- **Security group:** allow SSH (22) from *My IP* only, HTTP (80) and HTTPS (443) from anywhere

Then go to EC2 → Elastic IPs → Allocate, and associate the address with the instance. Without an Elastic IP the address changes when the server restarts and the domain stops working.

## 3. Point the domain at the server

In BigRock, open the domain → DNS Management and add two **A records** with the Elastic IP:

| Host | Value |
|---|---|
| `@` | your Elastic IP |
| `www` | your Elastic IP |

This only works while the domain uses BigRock's own name servers (the default). Check that it has taken effect before step 6:

```
nslookup firquijewels.com
```

## 4. Install everything on the server

```bash
ssh -i your-key.pem ubuntu@YOUR_ELASTIC_IP

git clone https://github.com/banushkar-glitch/firqui_jewel.git
cd firqui_jewel
sudo bash deploy/setup-server.sh firquijewels.com
```

The script installs Java 17, PostgreSQL, Nginx and Certbot, creates the database, and writes `/etc/firqui/firqui.env` with random passwords. If the repository is private, GitHub asks for a username and a personal access token when cloning.

## 5. Build and start the site

```bash
sudo bash deploy/deploy.sh
```

The first build takes a few minutes. When it prints `Backend is up`, open `http://YOUR_ELASTIC_IP` in a browser.

## 6. Turn on HTTPS

Run this once the domain resolves to the server (step 3):

```bash
sudo certbot --nginx -d firquijewels.com -d www.firquijewels.com --redirect
```

Certbot renews the certificate automatically.

## 7. Log in as admin

```bash
sudo grep ADMIN_ /etc/firqui/firqui.env
```

Log in at `https://firquijewels.com/authentication/login.html` with that email and password. The admin account is created once, on first startup; changing `ADMIN_PASSWORD` in the file later does not change the existing account.

## 8. Set up password-reset email

"Forgot password" emails are not sent until SMTP details are filled in:

```bash
sudo nano /etc/firqui/firqui.env      # SPRING_MAIL_USERNAME and SPRING_MAIL_PASSWORD
sudo systemctl restart firqui
```

For Gmail, the password must be an App Password, not the normal account password.

## Updating the site later

```bash
cd ~/firqui_jewel
git pull
sudo bash deploy/deploy.sh
```

Uploaded images, orders and settings are kept.

## Useful commands

| Task | Command |
|---|---|
| Backend logs | `sudo journalctl -u firqui -n 100 --no-pager` |
| Follow logs live | `sudo journalctl -u firqui -f` |
| Restart backend | `sudo systemctl restart firqui` |
| Nginx errors | `sudo tail -n 50 /var/log/nginx/error.log` |
| Back up database now | `sudo -u postgres /usr/local/bin/firqui-backup` |
| Restore a backup | `gunzip -c FILE.sql.gz \| sudo -u postgres psql firqui_jewels` |

## Backups

The nightly database dump stays on the same server, and uploaded images are not included in it. To survive losing the server, turn on scheduled EBS snapshots for the instance volume (EC2 → Lifecycle Manager), which covers the database, the uploads and the payment screenshots together.

## Using the second domain

To make `firquijewels.in` open the same site, add the same two A records for it in BigRock, add both names to `server_name` in `/etc/nginx/sites-available/firqui`, add `https://firquijewels.in,https://www.firquijewels.in` to `CORS_ALLOWED_ORIGINS` in the env file, then run Certbot again with all four names and restart the backend.
