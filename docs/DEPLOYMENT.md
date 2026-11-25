# Put Honor online (step by step)

Honor runs as **one Render web service** (the Docker image holds both the website and the API)
plus a **Render PostgreSQL** database. Every push to `main` redeploys automatically.

The button labels on Render change from time to time. If one differs slightly, look for the closest match.

**Cost:** the blueprint uses Render's paid `starter` web service and `basic-256mb` database,
as in Quranic Light. Free web services fall asleep (the first visit takes about a minute) and free
databases are deleted after a few weeks, so they are not suitable for the family's records.
Check Render's pricing page for current prices.

---

## Step 1. Create the service and database on Render

1. Sign in at **render.com** and connect your GitHub account (if it is not already connected for Quranic Light).
2. **New +** → **Blueprint** → choose the **faastaiv2/Honor** repository. Render reads `render.yaml` and shows
   a database (`honor-db`) and a web service (`honor`).
3. It asks for the two values marked `sync: false`:
   - `ADMIN_EMAIL`: your email (the first parent account)
   - `ADMIN_PASSWORD`: a long, unique password
4. **Apply** and wait for the first deploy (a few minutes; the Docker image builds the website and the API).
5. Open the `honor` service, copy its address (like `https://honor-xxxx.onrender.com`), and visit
   `.../api/health`. You should see `{"status":"ok","env":"production"}`.

> If Render complains about a plan name, open `render.yaml` and use a current plan name from Render's pricing page.

## Step 2. First sign-in and settings

1. Open the site's address, choose **Parent sign-in**, and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
2. **Admin → Settings → Time zone**: set the family's time zone (for example `Asia/Riyadh`, `Asia/Karachi`,
   `Europe/London`). Days change at midnight in this time zone, and a day is only scored once it is over.
3. **Admin → Your password**: change the password. You can then remove `ADMIN_PASSWORD` from Render's
   Environment tab (it is only used when no parent account exists yet).

## Step 3. Add the members

In **Admin → Members**, add each person with the **initials used in the sheet** and their **Base**
(their Honor level on the day before scoring starts), and give each a 4–8 digit **PIN**.

Use each person's **last level from the sheet** as their Base, and set **Admin → Settings → Scoring starts**
to the day after that level was recorded. (The family's names and levels are deliberately not kept in this
public repository.)

## Step 4. Import recent days from the spreadsheet

1. In the Google Sheet, select all the rows (including headers is fine) and copy.
2. **Admin → Import from the spreadsheet**: paste, choose **From 19/11/2026** to the last day filled in, and **Import**.
3. It reports how many entries it imported and any initials it did not recognize.

## Step 5 (optional). Use your own address

To use, for example, `honor.quranic.education`:

1. Render → `honor` → **Settings → Custom Domains** → add `honor.quranic.education`.
2. In Cloudflare DNS for `quranic.education`, add the **CNAME** record Render shows
   (name `honor`, target `honor-xxxx.onrender.com`), **DNS only** (grey cloud) until Render shows the certificate as issued.

## Step 6. Give the family the link

Members open the address on their phone, tap their name and type their PIN.
Tip: "Add to Home Screen" in the phone's browser makes it feel like an app.

---

## Backups

Render's paid PostgreSQL plans keep daily backups (see the database's **Backups** tab).
To take your own copy, use **Connect → External** on the database and run `pg_dump` with that address.

## Updating

Push to `main`. GitHub runs the tests; Render rebuilds and redeploys. Database changes are applied
automatically on start (`alembic upgrade head`).
