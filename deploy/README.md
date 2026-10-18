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
git checkout main          # or the branch being released, e.g. mobile-redesign
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

## 8. Set up email and payments

No email is sent until SMTP details are filled in. Until then the Contact Us form tells visitors their message could not be sent, and order and "forgot password" emails are not delivered.

1. On your laptop, copy `deploy/prod-values.env.example` to a file **outside** the repository, e.g. `firqui-prod.env`, and fill it in:
   - `SPRING_MAIL_USERNAME`: the mailbox that sends, e.g. `info@firquijewels.com`.
   - `SPRING_MAIL_PASSWORD`: a Google **App Password** for that mailbox (Google Account → Security → 2-Step Verification → App passwords), not the normal password.
   - `CONTACT_EMAIL`: where Contact Us messages and new-order emails arrive. Replying to them replies straight to the customer.
   - `UPI_ID`: the UPI ID shown in the payment QR.
2. Copy it to the server and apply it. The script updates only those settings, keeps the generated secrets, deletes the uploaded file and restarts the backend:

```bash
scp -i your-key.pem firqui-prod.env ubuntu@YOUR_ELASTIC_IP:~/
ssh -i your-key.pem ubuntu@YOUR_ELASTIC_IP
cd firqui_jewel && sudo bash deploy/set-env.sh ~/firqui-prod.env
```

To check it works, send a message from the Contact Us page and watch the log: `sudo journalctl -u firqui -f` shows `Contact form email sent via SMTP` on success, or the SMTP error.

## Automatic deployment (every push to `main`)

`.github/workflows/deploy.yml` deploys the site whenever `main` changes. It runs on GitHub's machines, free for public repositories. Each run:

1. runs the backend unit tests and stops if any fail;
2. logs in to AWS through OIDC. No AWS keys are stored in GitHub: the IAM role `firqui-github-deploy` trusts only this repository's `main` branch and may only open and close SSH in the `firqui-web` security group;
3. opens SSH for that runner's address only and runs `deploy/release.sh`, which builds the jar from the committed code, ships it with the website and runs `deploy.sh` on the server;
4. checks that https://firquijewels.com answers, then closes SSH again (also when something failed).

Watch a deployment in the repository's **Actions** tab. To deploy again without a code change, open **Actions → Deploy to AWS → Run workflow**.

**One-time setup:** add the repository secret `DEPLOY_SSH_KEY` (Settings → Secrets and variables → Actions → New repository secret). Its value is the private deploy key whose public half is in the server's `~/.ssh/authorized_keys`.

### Deploying by hand

From a laptop whose SSH key is on the server and whose IP is allowed in the `firqui-web` security group:

```bash
bash deploy/release.sh ubuntu@13.233.12.191 ~/.ssh/firqui_admin
```

It ships the **committed** code (uncommitted local changes are left out), so commit first.

If SSH is refused because your IP changed, allow the new one:

```bash
aws ec2 authorize-security-group-ingress --region ap-south-1 --group-id sg-0d177a0e2b789d953 --ip-permissions "IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges=[{CidrIp=$(curl -s https://checkip.amazonaws.com)/32}]"
```

Without a key file you can still get in with EC2 Instance Connect (`aws ec2-instance-connect send-ssh-public-key ...`), which is how a new key can be installed.

## Updating the site later

```bash
cd ~/firqui_jewel
git pull
sudo bash deploy/deploy.sh
```

Uploaded images, orders and settings are kept. The shop starts with no products, no customer accounts and only the Pearls Gone Rogue collection; add listings in the admin panel.

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
