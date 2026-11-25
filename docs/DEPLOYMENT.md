# Put Honor online for free (Vercel + Neon)

| Piece | Service | Free plan |
|---|---|---|
| Website + API | **Vercel** (Hobby plan) | Free for personal, non-commercial use. No sleeping server: the API runs as a Vercel Function and the website is served from Vercel's CDN. |
| Database | **Neon** Postgres | Free with no time limit, no card needed: 1 GB storage, 100 compute-hours a month (the database pauses itself when nobody uses it, so a family board uses very little). |

Every push to `main` on GitHub redeploys automatically. Database tables are created and updated
automatically when the app starts.

The button labels on Vercel and Neon change from time to time. If a label differs slightly, look for the closest match.

---

## Step 1. Import the repository into Vercel

1. Go to **vercel.com** → **Sign Up** → **Continue with GitHub** (choose the free **Hobby** plan).
2. **Add New… → Project** → find **faastaiv2/Honor** → **Import**.
   (If it is not listed, click **Adjust GitHub App Permissions** and allow the Honor repository.)
3. Vercel detects **FastAPI** by itself. Leave the settings as they are (`vercel.json` already builds the website).
4. **Don't click Deploy yet.** First add the database and settings (Steps 2–3). If you already deployed, that's fine; you will redeploy at the end.

## Step 2. Create the free Neon database

Easiest way, from inside Vercel:

1. Open the project → **Storage** tab → **Create Database** → **Neon** (Serverless Postgres) → **Continue**.
2. Pick the **Free** plan and a region near you, name it `honor`, **Create**.
3. **Connect** it to the Honor project (all environments). Vercel adds `DATABASE_URL` to the project automatically.

(Alternatively, create a project at **neon.tech**, copy its connection string, and add it in Vercel as
`DATABASE_URL` under **Settings → Environment Variables**.)

## Step 3. Add the settings

Project → **Settings → Environment Variables**, add for **Production** (and Preview):

| Name | Value |
|---|---|
| `ENV` | `production` |
| `SECRET_KEY` | a long random text, at least 32 characters (see below) |
| `ADMIN_EMAIL` | your email (the first parent account) |
| `ADMIN_PASSWORD` | a long, unique password |

To make a `SECRET_KEY` in PowerShell:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

## Step 4. Deploy

**Deployments → … → Redeploy** (or **Deploy** if you have not deployed yet). After a minute you get an
address like `https://honor-xxxx.vercel.app`.

Check `https://honor-xxxx.vercel.app/api/health` shows `{"status":"ok","env":"production"}`.

## Step 5. First sign-in and settings

1. Open the address, choose **Parent sign-in**, sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
2. **Admin → Settings → Time zone**: set the family's time zone (for example `Asia/Riyadh`, `Asia/Karachi`,
   `Europe/London`). Days change at midnight there, and a day is only scored once it is over.
3. **Admin → Your password**: change the password. You can then delete `ADMIN_PASSWORD` from Vercel
   (it is only used when no parent account exists yet).

## Step 6. Add the members and import the sheet

1. **Admin → Members**: add each person with the **initials used in the sheet**, their **Base** (their level
   from the sheet on the day before scoring starts) and a 4–8 digit **PIN**. Set **Scoring starts** in Settings
   to the day after those levels were recorded. (The family's names and levels are deliberately not kept in
   this public repository.)
2. **Admin → Import from the spreadsheet**: copy the sheet's rows, paste, choose the dates, **Import**.

## Step 7. Share it

Members open the address on their phone, tap their name and type their PIN.
"Add to Home Screen" in the phone's browser makes it feel like an app.

### Optional: your own address

To use `honor.quranic.education`: Vercel project → **Settings → Domains** → add it, then in Cloudflare DNS
add the **CNAME** record Vercel shows (name `honor`), **DNS only** (grey cloud).

---

## Backups

Neon keeps a short restore window on the free plan. For your own copy, open the Neon console →
**Connect** → copy the connection string and run `pg_dump "<connection string>" > honor-backup.sql`.

## Updating

Push to `main`. GitHub runs the tests; Vercel rebuilds and redeploys; the database is migrated on start.
