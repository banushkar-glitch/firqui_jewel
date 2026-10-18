# Running FIRQUI JEWELS on your laptop

This guide takes you from a fresh laptop to the full site running locally: the website, the admin panel, and the backend API with its database.

**Time needed:** about 30–45 minutes the first time (mostly downloads). After that, starting the app takes under a minute ([Daily start](#daily-start)).

## What you will end up with

| Part | What it is | Address |
|---|---|---|
| Database | PostgreSQL, holds products, orders and users | `localhost:5432` |
| Backend | Spring Boot API (Java) | http://127.0.0.1:8080 |
| Website + admin | Static HTML/CSS/JS pages | http://127.0.0.1:5500 |

The backend creates the database tables, the categories, the Pearls Gone Rogue collection and an admin account automatically the first time it starts. You do not run any SQL scripts. The shop starts with **no products**; you add them in the admin panel.

---

## 1. Install the tools (once)

You need four tools. Pick the commands for your operating system.

| Tool | Version | Why |
|---|---|---|
| Git | any recent | get the code |
| Java JDK | **17 or newer** (21 recommended) | run the backend. Java 8 will **not** work |
| PostgreSQL | 15, 16 or 17 | the database |
| Python | 3.x | serve the website pages (any static server works) |

Maven is **not** needed: the project includes the Maven Wrapper (`mvnw`), which downloads it for you.

### Windows (PowerShell)

```powershell
winget install --id Git.Git -e
winget install --id EclipseAdoptium.Temurin.21.JDK -e
winget install --id PostgreSQL.PostgreSQL.17 -e --interactive
winget install --id Python.Python.3.12 -e
```

- The PostgreSQL installer asks you to **choose a password for the `postgres` user**. Write it down; you need it in step 4. Keep the default port `5432`.
- When the installs finish, **close and reopen PowerShell** (and VS Code) so the new commands are found.

### macOS (Homebrew)

```bash
brew install git python
brew install --cask temurin@21
brew install postgresql@17
brew services start postgresql@17
```

Homebrew's PostgreSQL uses your macOS user name with no password, which matters in step 4.

### Check the installs

Run these in a **new** terminal. Each should print a version:

```powershell
git --version
java -version      # must say 17 or higher, e.g. "openjdk version 21..."
python --version   # on macOS: python3 --version
```

If `java -version` still shows `1.8`, see [Troubleshooting](#troubleshooting).

---

## 2. Get the code

```powershell
cd D:\Projects            # any folder you like; on macOS e.g. cd ~/Projects
git clone https://github.com/banushkar-glitch/firqui_jewel.git
cd firqui_jewel
git checkout mobile-redesign
```

`mobile-redesign` has the current work. Once it is merged, use `main` instead.

---

## 3. Create the database (once)

The backend expects an empty database called `firqui_jewels`.

### Windows

`psql` is not on the PATH by default, so use its full path. Adjust `17` if you installed another version.

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h localhost -c "CREATE DATABASE firqui_jewels;"
```

Type the `postgres` password from step 1 when asked. If you prefer a GUI, open **pgAdmin**, connect to the local server, then right-click **Databases → Create → Database…** and name it `firqui_jewels`.

### macOS

```bash
createdb firqui_jewels
```

It is fine if it says the database already exists.

---

## 4. Set your environment variables

No passwords are stored in the code. The backend reads them from environment variables in the terminal you start it from.

**Do not put your passwords into `application.properties`.** That file is committed to Git, and whatever you put there ends up on GitHub.

### Required

| Variable | Value |
|---|---|
| `DB_PASSWORD` | your PostgreSQL password from step 1 (leave empty on macOS Homebrew) |
| `DB_USERNAME` | only needed on macOS Homebrew: your macOS user name. Defaults to `postgres` |

### Optional

| Variable | What it does | If not set |
|---|---|---|
| `SPRING_MAIL_USERNAME` / `SPRING_MAIL_PASSWORD` | send real emails (contact form, order emails, password reset) through Gmail. The password must be a Google **App Password** | emails are not sent; the contact form says "Unable to send message" |
| `CONTACT_EMAIL` | where Contact Us and order notifications go | `info@firquijewels.com` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | the admin account created on first start | `admin@firqui.com` / `Admin@123` |

You almost never need email locally. Leave the mail variables unset unless you are working on emails, so test messages don't go to the real shop inbox.

### Set them (Windows PowerShell)

These last until you close the terminal:

```powershell
$env:DB_PASSWORD = "your-postgres-password"
```

To set it permanently for your user, so you don't repeat it each time, run this once and then open a new terminal:

```powershell
[Environment]::SetEnvironmentVariable("DB_PASSWORD", "your-postgres-password", "User")
```

### Set them (macOS)

```bash
export DB_USERNAME="$(whoami)"
export DB_PASSWORD=""
```

To keep them, add those two lines to `~/.zshrc` and run `source ~/.zshrc`.

---

## 5. Start the backend

Open a terminal in the project folder:

### Windows

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

### macOS

```bash
cd backend
chmod +x mvnw          # only needed once
./mvnw spring-boot:run
```

**The first run takes several minutes** while Maven downloads its dependencies. It is ready when you see a line like:

```
Started FirquiApplication in 5.2 seconds
```

**Leave this terminal open.** Closing it stops the backend. To stop it yourself, press `Ctrl + C`.

On first start the backend automatically:

- creates all database tables
- creates the **admin account** `admin@firqui.com` / `Admin@123` (or your `ADMIN_EMAIL` / `ADMIN_PASSWORD`)
- adds the 5 categories and the **Pearls Gone Rogue** collection
- adds **no products** and **no customer accounts**. Add products in the admin panel, and create a customer account through **Create Account** on the site if you want to test as a customer

**Quick check:** open http://127.0.0.1:8080/api/categories in your browser. You should see a list in JSON.

---

## 6. Start the website

Open a **second** terminal in the project folder:

```powershell
cd frontend
python -m http.server 5500 --bind 127.0.0.1
```

On macOS use `python3` instead of `python`.

Then open **http://127.0.0.1:5500/index.html**.

Leave this terminal open too.

**Alternative:** the VS Code **Live Server** extension also works. Right-click `frontend/index.html` and choose **Open with Live Server**.

> **Important:** always open the site through `http://127.0.0.1:5500/...` (or `http://localhost:5500/...`). Do **not** double-click the HTML files to open them as `file:///...`, because logging in will not work that way.

---

## 7. Check that everything works

| Try this | Expected result |
|---|---|
| Open the homepage | Hero slider and categories load |
| Log in as `admin@firqui.com` / `Admin@123` | You land on the **Admin Dashboard** |
| Admin → **Products → Add Product**: add a title, a photo, a price and stock, choose **Rings**, then **Publish** | The product is saved and shows as Published |
| Open the shop's **Rings** page | Your product card appears |
| Log out, add the product to the cart → **Proceed to Checkout** | Checkout opens without logging in and says "Checking out as a guest" |
| Click the account icon → **Create Account**, then log in | You return to the page you were on, and the account icon shows a green dot |

If any of these fail, see [Troubleshooting](#troubleshooting).

---

## 8. Run the tests

The unit tests don't need the database:

**Windows:**

```powershell
cd backend
.\mvnw.cmd test "-Dtest=*UnitTests"
```

**macOS:**

```bash
cd backend
./mvnw test -Dtest='*UnitTests'
```

The full test suite (`.\mvnw.cmd test`) also runs integration tests against your local PostgreSQL. It needs `DB_PASSWORD` set, and it writes test data into your local database.

---

## Daily start

After the first setup, starting the app each day is:

1. **Terminal 1, backend.** On Windows, skip the `$env:` line if you set the variable permanently:
   ```powershell
   cd firqui_jewel\backend
   $env:DB_PASSWORD = "your-postgres-password"
   .\mvnw.cmd spring-boot:run
   ```
2. **Terminal 2, website:**
   ```powershell
   cd firqui_jewel\frontend
   python -m http.server 5500 --bind 127.0.0.1
   ```
3. Open http://127.0.0.1:5500/index.html

**After pulling new code** (`git pull`):

- **Java changes:** stop the backend (`Ctrl + C`) and start it again.
- **HTML/CSS/JS changes:** just refresh the browser with `Ctrl + F5` (macOS: `Cmd + Shift + R`), which forces it to load the newest files.

---

## Troubleshooting

### `java -version` shows 1.8, or the build fails with "release version 17 not supported"

An old Java comes first on your PATH. Point this terminal at the new JDK. The folder name may differ slightly; check `C:\Program Files\Eclipse Adoptium\`.

**Windows:**

```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
java -version
```

**macOS:**

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
```

### `password authentication failed for user "postgres"`

`DB_PASSWORD` is missing or wrong in the terminal where you started the backend.

1. Check it: `echo $env:DB_PASSWORD` (macOS: `echo $DB_PASSWORD`).
2. Set it again and restart the backend.

### `database "firqui_jewels" does not exist`

Do [step 3](#3-create-the-database-once).

### `Connection refused` to `localhost:5432`

PostgreSQL isn't running.

- **Windows:** open **Services**, find `postgresql-x64-17`, and click **Start**. Or in an administrator PowerShell: `Start-Service postgresql-x64-17`.
- **macOS:** `brew services start postgresql@17`.

### `Port 8080 was already in use`

A backend is already running, maybe in another terminal. Close it, or find what's using the port:

**Windows:**

```powershell
Get-NetTCPConnection -LocalPort 8080 -State Listen | Select-Object OwningProcess
Stop-Process -Id <the number shown>
```

**macOS:**

```bash
lsof -i :8080
kill <PID>
```

### The site loads but products are missing, or login fails with "Failed to fetch"

- Check the backend terminal shows `Started FirquiApplication` and has no errors.
- Make sure you opened the site at `http://127.0.0.1:5500` or `http://localhost:5500`, not `file:///`.

### "Too many failed attempts" on login

After 5 wrong passwords, that account is blocked for 15 minutes from your computer. Wait, or restart the backend, which clears the counter.

### I changed CSS or JS but don't see it

Press `Ctrl + F5`. If you edited `frontend/js/*.js` or `frontend/css/site.css`, also raise the `?v=...` number on the `<script>` / `<link>` tags. That is what makes other people's browsers fetch the new file.

### `./mvnw: Permission denied` (macOS/Linux)

Run `chmod +x mvnw` once inside the `backend` folder.

### The contact form says "Unable to send message"

Expected when the mail variables aren't set (see [step 4](#4-set-your-environment-variables)). Everything else works without email.

---

## Good to know

- **Never commit secrets.** If `git status` shows `application.properties` as modified because you added a password, undo that line before committing: `git restore backend/src/main/resources/application.properties`.
- **Admin pages** are at http://127.0.0.1:5500/admin/dashboard.html and need the admin login.
- **Uploaded product photos** are saved in the `uploads/` folder at the project root.
- **Customer payment screenshots** are saved in `backend/private_storage/`. Both folders are local only.
- **Deploying to the live server** is a different process, documented in [`deploy/README.md`](deploy/README.md).
