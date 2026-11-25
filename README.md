# Honor 🏆

A family deeds tracker and leaderboard. Each member ticks their daily tasks (Fajr, Yaseen Sharif,
Darood Sharif, Quran pages, exercise and more), earns **Honor**, and climbs the ranks from
🥉 Honor to 🎗️ Highest Honor and beyond. It replaces the family's Honor spreadsheet.

| | |
|---|---|
| Website | React 19, TypeScript, Vite (`frontend/`) |
| Backend | Python 3.13, FastAPI, SQLAlchemy, Alembic (`backend/`) |
| Database | SQLite locally, PostgreSQL in production |
| Hosting | One Render web service (website + API in a single Docker image) and Render PostgreSQL |

**What it does**

- **Members** sign in by tapping their name and typing a PIN. They tick their own tasks for today and yesterday.
- **Parents** sign in with email and password, can mark any member's day, adjust Honor with a reason,
  add members and set PINs, import from the spreadsheet, and change the rules.
- Targets grow automatically, as in the sheet: Darood Sharif, pages, laps, jumping jacks, push-ups,
  sit-ups, plank and mountain climbers. The bonus is 300× one of the 99 Names each day, then 1000× Astaghfar.
- **Leaderboard** with a tower of ranks, **History** of the last 14 days, and a **Rules** page.

## The rules (in `backend/app/scoring.py`)

| | |
|---|---|
| +1 Honor | Tick the pledge (no games/YouTube over the limit) **and** all 17 tasks |
| +1 Bonus | Do the day's 300× dhikr (weekdays: needs the pledge too) |
| −1 Honor cut | A weekday ends with 5 or more tasks missed and no excuse (the 5 is a setting) |
| Excused day | Write a reason: fitness tasks are excused and nothing is cut |
| Weekend (Fri, Sat) | Optional: you can earn, never lose |
| Ranks | 👺 ≤0 · 🥉 I–III · 🥈 IV–VII · 🥇 VIII–XII · ⭐ XIII–XVIII · 🌟 XIX–XXIV · 🎗️ XXV–XXXIV · 👑 XXXV–XLIX · 💎 L+ |

## Run it on your computer (Windows)

```powershell
# 1. Backend (first PowerShell window)
cd backend
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
copy .env.example .env               # then edit ADMIN_EMAIL and ADMIN_PASSWORD
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# 2. Website (second PowerShell window)
cd frontend
npm install
npm run dev                          # http://localhost:5173
```

Sign in with "Parent sign-in" using the email and password from `.env`, then add members in **Admin**.

## Tests

```powershell
cd backend ; python -m pytest -q     # rules, sign-in, permissions, import
cd frontend ; npm test               # tower layout and dates
```

GitHub runs both, plus a Docker build, on every push (`.github/workflows/ci.yml`).

## Put it online

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**: Render reads `render.yaml` and creates everything.
