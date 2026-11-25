# Honor 🏆

A family deeds tracker and leaderboard. Each member ticks their daily tasks (Fajr, Yaseen Sharif,
Darood Sharif, Quran pages, exercise and more), earns **Honor**, and climbs the ranks from
🥉 Honor to 🎗️ Highest Honor and beyond. It replaces the family's Honor spreadsheet.

| | |
|---|---|
| Website | React 19, TypeScript, Vite (`frontend/`) |
| Backend | Python 3.13, FastAPI, SQLAlchemy, Alembic (`app/`, `alembic/`) |
| Database | SQLite locally, PostgreSQL (Neon) in production |
| Hosting | Vercel (free Hobby plan): the API as a Vercel Function, the website from the CDN |

**What it does**

- **Members** sign in by tapping their name and typing a PIN. They tick their own tasks for today and yesterday.
- **Parents** sign in with email and password, can mark any member's day, adjust Honor with a reason,
  add members and set PINs, import from the spreadsheet, and change the rules.
- Targets grow automatically, as in the sheet: Darood Sharif, pages, laps, jumping jacks, push-ups,
  sit-ups, plank and mountain climbers. The bonus is 300× one of the 99 Names each day, then 1000× Astaghfar.
- **Top Honor** leaderboard grouped by rank (like a game's league table), with the week number, days left,
  avatars and a **This Week** tab; **History** of the last 14 days; and a **Rules** page.
- Each rank's game time and make-up benefits, and the 👑 Legendary quest, are built in.

## The rules (`app/scoring.py`, `app/tiers.py`, `app/makeup.py`, `app/progress.py`)

| | |
|---|---|
| +1 Honor | Tick the pledge (no games/YouTube over the limit) **and** all 17 tasks |
| +1 Bonus | Do the day's 300× dhikr (weekdays: needs the pledge too). Cannot be made up later |
| −1 Honor cut | A weekday ends with 5 or more tasks missed and no excuse (the 5 is a setting) |
| Excused day | Write a reason on the day: fitness tasks are excused and nothing is cut |
| Weekend (Fri, Sat) | Optional: you can earn, never lose |
| Making up | Each rank may tick missed tasks after the day, as its benefits allow (see below) |

| Honor tier | Ranks | Game / YouTube | Benefits |
|---|---|---|---|
| 🥉 Honor | I – III | 0 mins / week (after finishing tasks) | None |
| 🥈 Good Honor | IV – VII | 10 mins / Sunday | Miss up to 1 task and make up next day |
| 🥇 Great Honor | VIII – XII | 15 mins / Sunday | Miss up to 1 task and make up next day |
| ⭐ High Honor | XIII – XVIII | 20 mins / Sunday | 1 next day + a Thursday task made up Fri or Sat |
| 🌟 Higher Honor | XIX – XXIV | 25 mins / Sun + Mon | 1 next day + a Thursday task made up Fri or Sat |
| 🎗️ Highest Honor | XXV – XXXI | 30 mins / Sun + Mon | 2 next day + a Thursday task made up Fri or Sat + Mehmed |
| 🏆 Ultimate Honor | XXXII – XXXIX | 40 mins / Sun + Mon + Tue | 2 next day + a Thursday task made up Fri or Sat + Mehmed |
| ⚔️ Supreme Honor | XL – XLVI | 50 mins / Sun + Mon + Tue | 2 next day + a Wed or Thu task made up Fri or Sat + Mehmed |
| 💎 Diamond Honor | XLVII – XLIX | 60 mins / Sun + Mon + Tue | 3 next day + up to 2 tasks each on Wed and Thu made up Fri and Sat + Mehmed |
| 👑 Legendary Honor | L | Unlimited / day, anytime | Up to 15 tasks a week made up on the weekend or any day |

**👑 Legendary Honor.** Without it the top is XLIX. A 💎 Diamond member may give up the title, restart at I,
and must finish every task and every bonus every day until L. One missed day ends the quest. A Legendary
member who doesn't complete tasks on 3 weekdays in a row is demoted to 💎 Diamond and can never be Legendary again.

## Run it on your computer (Windows)

```powershell
# 1. Backend (first PowerShell window, in the repository folder)
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
copy .env.example .env               # then edit ADMIN_EMAIL and ADMIN_PASSWORD
uvicorn app.main:app --reload --port 8000   # creates/updates the database tables on start

# 2. Website (second PowerShell window)
cd frontend
npm install
npm run dev                          # http://localhost:5173
```

Sign in with "Parent sign-in" using the email and password from `.env`, then add members in **Admin**.

## Tests

```powershell
python -m pytest -q                  # rules, ranks, make-ups, Legendary quest, sign-in, import
cd frontend ; npm test               # leaderboard grouping and dates
```

GitHub runs both, plus the database migrations on a real PostgreSQL, on every push (`.github/workflows/ci.yml`).

## Put it online

Free, step by step: **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** (Vercel + Neon, about 10 minutes).
