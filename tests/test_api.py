from datetime import date, datetime, timedelta, timezone
from unittest.mock import patch

from app import scoring
from app.models import DayLog
from tests.conftest import auth

TODAY = date(2026, 11, 24)
ALL = sorted(set(scoring.REQUIRED) | {"gate", "bonus"})


def at_today(day=TODAY):
    return patch("app.routers.board.today_for", return_value=day), patch("app.services.today_for", return_value=day)


def test_health_and_unknown_api(client):
    h = client.get("/api/health").json()
    assert h["status"] == "ok" and h["database"] == "ok" and "postgres" not in str(h)
    assert client.get("/api/nope").status_code == 404


def test_sign_in_list_and_pin(client, family):
    names = client.get("/api/auth/members").json()
    assert [n["name"] for n in names] == ["Alpha", "Bravo", "Sierra"] and all(n["has_pin"] for n in names)
    bad = client.post("/api/auth/member", json={"member_id": family["A"].id, "pin": "9999"})
    assert bad.status_code == 401
    h = auth(client, family["A"])
    assert client.get("/api/auth/me", headers=h).json()["name"] == "Alpha"


def test_board_needs_sign_in(client, family):
    assert client.get("/api/board/leaderboard").status_code == 401
    assert client.get("/api/board/leaderboard", headers={"Authorization": "Bearer junk"}).status_code == 401


def test_pin_login_is_rate_limited(client, family):
    for _ in range(10):
        client.post("/api/auth/member", json={"member_id": family["A"].id, "pin": "0000"})
    r = client.post("/api/auth/member", json={"member_id": family["A"].id, "pin": "1234"})
    assert r.status_code == 429


def test_member_marks_own_day_and_scores(client, family, db):
    mulk_last_night(db, family["A"])
    h = auth(client, family["A"])
    a, b = at_today()
    with a, b:
        r = client.put("/api/board/day", headers=h, json={"member_id": family["A"].id, "date": TODAY.isoformat(),
                                                           "tasks": ALL + ["hack"]})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["score"]["delta"] == 2 and body["editable"]
        assert "hack" not in sum(([t["key"] for t in g["tasks"]] for g in body["groups"]), [])
        board = client.get("/api/board/leaderboard", headers=h).json()
    rows = board["rows"]
    alpha = next(r for r in rows if r["member"]["name"] == "Alpha")
    # base 10; 22 and 23 Nov were empty weekdays: -1 each; today's +2 arrives at midnight
    assert alpha["level"] == 10 - 2 and alpha["pending"] == 2 and alpha["is_me"]
    assert alpha["tier"]["name"] == "Gold" and alpha["week_delta"] == -2
    assert rows[0]["member"]["name"] == "Sierra" and rows[0]["rank"] == 1
    assert board["week"] == {"number": 1, "start": "2026-11-22", "days_left": 4}  # scoring began 22 Nov


def test_member_cannot_mark_others_or_old_days(client, family):
    h = auth(client, family["A"])
    a, b = at_today()
    with a, b:
        other = client.put("/api/board/day", headers=h, json={"member_id": family["B"].id, "date": TODAY.isoformat(), "tasks": []})
        assert other.status_code == 403
        old = client.put("/api/board/day", headers=h, json={"member_id": family["A"].id,
                                                             "date": (TODAY - timedelta(days=2)).isoformat(), "tasks": ["fajr"]})
        assert old.status_code == 403
        future = client.put("/api/board/day", headers=h, json={"member_id": family["A"].id,
                                                                "date": (TODAY + timedelta(days=1)).isoformat(), "tasks": []})
        assert future.status_code == 403


def test_admin_marks_any_member_any_past_day(client, family):
    h = auth(client, admin=True)
    a, b = at_today()
    with a, b:
        r = client.put("/api/board/day", headers=h, json={"member_id": family["B"].id, "date": "2026-11-22",
                                                           "tasks": ALL})
        assert r.status_code == 200 and r.json()["score"]["delta"] == 2


def test_admin_only_endpoints(client, family):
    hm = auth(client, family["A"])
    assert client.get("/api/admin/members", headers=hm).status_code == 403
    ha = auth(client, admin=True)
    m = client.post("/api/admin/members", headers=ha, json={"name": "Quebec", "code": "Q", "base_honor": 28, "pin": "4321"})
    assert m.status_code == 201
    assert client.post("/api/auth/member", json={"member_id": m.json()["id"], "pin": "4321"}).status_code == 200
    assert client.patch(f"/api/admin/members/{m.json()['id']}", headers=ha, json={"pin": "12"}).status_code == 422
    assert client.post("/api/admin/adjustments", headers=ha, json={"member_id": family["B"].id, "delta": 3,
                                                                    "note": "helped a lot"}).status_code == 201
    assert client.put("/api/admin/settings", headers=ha, json={"timezone": "Mars/Base"}).status_code == 400
    s = client.put("/api/admin/settings", headers=ha, json={"timezone": "Asia/Riyadh", "cut_misses": 6}).json()
    assert s["timezone"] == "Asia/Riyadh" and s["cut_misses"] == 6


def test_adjustment_changes_leaderboard(client, family):
    ha = auth(client, admin=True)
    a, b = at_today()
    with a, b:
        before = {r["member"]["name"]: r["level"] for r in client.get("/api/board/leaderboard", headers=ha).json()["rows"]}
        client.post("/api/admin/adjustments", headers=ha, json={"member_id": family["B"].id, "delta": 3})
        after = {r["member"]["name"]: r["level"] for r in client.get("/api/board/leaderboard", headers=ha).json()["rows"]}
    assert after["Bravo"] == before["Bravo"] + 3


def test_import_from_sheet(client, family, db):
    ha = auth(client, admin=True)
    tasks = "\t".join(["S, A"] + ["S"] * 17 + ["S, X"])
    text = f"11/23/2026\t{tasks}\t\t\tA\n11/30/2026\t{tasks}\n"
    r = client.post("/api/admin/import", headers=ha, json={"text": text, "start": "2026-11-19", "end": "2026-11-24"})
    assert r.status_code == 200, r.text
    assert r.json() == {"days": 1, "entries": 2, "unknown_initials": ["X"]}
    log = db.query(DayLog).filter_by(member_id=family["S"].id).one()
    assert set(log.tasks) == set(scoring.SHEET_COLUMNS)
    alpha = db.query(DayLog).filter_by(member_id=family["A"].id).one()
    assert alpha.tasks == ["gate"] and alpha.excuse


def test_history_shape(client, family):
    h = auth(client, family["A"])
    a, b = at_today()
    with a, b:
        hist = client.get("/api/board/history?days=7", headers=h).json()
    assert len(hist["dates"]) == 7 and hist["dates"][-1]["date"] == TODAY.isoformat()
    row = hist["rows"][0]["cells"]
    assert row[-1]["state"] == "open" and row[0]["state"] == "pre"


def test_first_admin_from_environment(db, monkeypatch):
    from app import main
    from app.models import Admin
    monkeypatch.setattr(main.settings, "admin_email", "Owner@Example.com")
    monkeypatch.setattr(main.settings, "admin_password", "a-long-password")
    monkeypatch.setattr(main, "SessionLocal", lambda: db)
    main.ensure_first_admin()
    assert db.query(Admin).one().email == "owner@example.com"
    main.ensure_first_admin()  # second start: no duplicate
    assert db.query(Admin).count() == 1


def mulk_last_night(db, member, day=TODAY):
    """Surah Mulk read the night before: it counts for `day`."""
    from app.models import DayLog
    db.add(DayLog(member_id=member.id, day=day - timedelta(days=1), tasks=["mulk"], excuse="", late={}))
    db.commit()


def put_day(client, h, member, day, tasks, excuse=""):
    return client.put("/api/board/day", headers=h, json={"member_id": member.id, "date": day.isoformat(),
                                                          "tasks": tasks, "excuse": excuse})


def test_makeup_depends_on_rank(client, family, db):
    """Bravo (Good Honor) may make up 1 task the next day; Sierra (Highest Honor) 2."""
    family["B"].base_honor, family["S"].base_honor = 7, 28  # after Sun/Mon cuts: V (Good) and XXVI (Highest)
    db.commit()
    mon, tue = date(2026, 11, 23), TODAY
    hb, hs = auth(client, family["B"]), auth(client, family["S"])
    a, b = at_today(mon)
    with a, b:
        put_day(client, hb, family["B"], mon, ["gate", "fajr"])
        put_day(client, hs, family["S"], mon, ["gate", "fajr"])
    a, b = at_today(tue)
    with a, b:
        view = client.get(f"/api/board/day?member_id={family['B'].id}&date={mon}", headers=hb).json()
        assert view["mode"] == "makeup" and view["makeup_left"] == 1 and not view["excuse_editable"]
        assert put_day(client, hb, family["B"], mon, ["gate", "fajr", "yaseen"]).status_code == 200
        r = put_day(client, hb, family["B"], mon, ["gate", "fajr", "yaseen", "dalail"])
        assert r.status_code == 403 and "next day" in r.json()["detail"]
        assert put_day(client, hs, family["S"], mon, ["gate", "fajr", "yaseen", "dalail"]).status_code == 200
        # cannot untick what was ticked on the day, cannot make up the bonus, cannot add an excuse later
        assert put_day(client, hb, family["B"], mon, ["gate", "yaseen"]).status_code == 403
        assert put_day(client, hs, family["S"], mon, ["gate", "fajr", "yaseen", "dalail", "bonus"]).status_code == 403
        assert put_day(client, hb, family["B"], mon, ["gate", "fajr", "yaseen"], "sick").status_code == 403
        # a made-up task can be unticked again
        assert put_day(client, hb, family["B"], mon, ["gate", "fajr"]).status_code == 200
    log = db.query(DayLog).filter_by(member_id=family["S"].id, day=mon).one()
    assert log.late == {"yaseen": "2026-11-24", "dalail": "2026-11-24"}


def test_lowest_rank_cannot_make_up(client, family, db):
    from app.models import Member
    m = Member(name="Zulu", code="Zu", base_honor=2, pin_hash=family["A"].pin_hash, created_at=family["A"].created_at)
    db.add(m)
    db.commit()
    h = auth(client, m)
    a, b = at_today()
    with a, b:
        view = client.get(f"/api/board/day?member_id={m.id}&date=2026-11-23", headers=h).json()
        assert view["mode"] == "locked" and view["makeup_left"] == 0
        r = put_day(client, h, m, date(2026, 11, 23), ["fajr"])
        assert r.status_code == 403 and "Good Honor" in r.json()["detail"]


def test_legendary_quest_flow(client, family, db):
    from app.models import Member
    m = Member(name="Delta", code="D", base_honor=48, pin_hash=family["A"].pin_hash, created_at=family["A"].created_at)
    db.add(m)
    db.commit()
    h = auth(client, m)
    a, b = at_today()
    with a, b:
        assert client.post("/api/board/quest", headers=auth(client, family["B"]), json={"member_id": m.id}).status_code == 403
        lb = client.get("/api/board/leaderboard", headers=h).json()["rows"]
        me = next(r for r in lb if r["is_me"])
        # 22 & 23 Nov were empty: 48 - 2 = 46 (Supreme), so no quest yet
        assert me["level"] == 46 and not me["can_start_quest"]
    m.base_honor = 49
    db.commit()
    a, b = at_today()
    with a, b:
        me = next(r for r in client.get("/api/board/leaderboard", headers=h).json()["rows"] if r["is_me"])
        assert me["tier"]["key"] == "obsidian" and me["can_start_quest"]
        q = client.post("/api/board/quest", headers=h, json={"member_id": m.id}).json()
        assert q["level"] == 1 and q["quest"]["active"] and q["tier"]["key"] == "bronze"
        assert client.post("/api/board/quest", headers=h, json={"member_id": m.id}).status_code == 400
        quest = next(x for x in client.get("/api/board/achievements", headers=h).json()["items"] if x["key"] == "quest")
        assert quest["unlocked"] and quest["gems"] == 500  # starting the quest is the greatest achievement


def test_avatar(client, family):
    h = auth(client, family["A"])
    assert client.put("/api/board/avatar", headers=h, json={"avatar": "lion"}).json() == {"avatar": "lion"}
    assert client.put("/api/board/avatar", headers=h, json={"avatar": "<b>"}).status_code == 400
    assert client.put("/api/board/avatar", headers=auth(client, admin=True), json={"avatar": "lion"}).status_code == 400


def test_migrations_run_on_a_fresh_database(tmp_path, monkeypatch):
    from sqlalchemy import create_engine, inspect

    from app import main
    url = f"sqlite:///{tmp_path}/fresh.db"
    monkeypatch.setenv("DATABASE_URL", url)
    from app.config import get_settings
    get_settings.cache_clear()
    try:
        main.run_migrations()
    finally:
        get_settings.cache_clear()
    cols = {c["name"] for c in inspect(create_engine(url)).get_columns("day_logs")}
    assert {"late", "tasks", "excuse"} <= cols


def test_misconfigured_production_explains_itself(client, monkeypatch):
    from app import main
    monkeypatch.setattr(main, "CONFIG_PROBLEMS", ["SECRET_KEY is missing or shorter than 32 characters"])
    monkeypatch.setattr(main, "STARTUP_PROBLEMS", ["SECRET_KEY is missing or shorter than 32 characters"])
    monkeypatch.setitem(main._state, "ready", False)
    h = client.get("/api/health").json()
    assert h["status"] == "needs setup" and "SECRET_KEY" in h["problems"][0] and h["setup"] == "not done yet"
    r = client.get("/api/auth/members")
    assert r.status_code == 503 and "not set up" in r.json()["detail"]


def test_sleeping_database_is_retried(client, monkeypatch):
    """A free Neon database can refuse the first connections while it wakes up."""
    from sqlalchemy.exc import OperationalError

    from app import main
    calls = {"n": 0}

    def flaky():
        calls["n"] += 1
        if calls["n"] <= 3:
            raise OperationalError("SELECT 1", {}, Exception('connection to server at "ep-x.neon.tech" failed: timeout'))

    monkeypatch.setattr(main, "run_migrations", flaky)
    monkeypatch.setattr(main.settings, "run_migrations", True)
    monkeypatch.setattr(main.time, "sleep", lambda s: None)
    monkeypatch.setitem(main._state, "ready", False)
    monkeypatch.setitem(main._state, "last_try", 0.0)
    assert main.ensure_ready(force=True) is False  # three quick attempts all fail
    assert "neon.tech" not in main.STARTUP_PROBLEMS[0] and "OperationalError" in main.STARTUP_PROBLEMS[0]
    assert client.get("/api/auth/members").status_code == 503  # retried too soon: still waiting
    monkeypatch.setitem(main._state, "last_try", 0.0)
    assert client.get("/api/auth/members").status_code == 200  # next try succeeds
    assert main.STARTUP_PROBLEMS == [] and main._state["ready"]


def test_member_without_initials_gets_hidden_tag(client, family):
    ha = auth(client, admin=True)
    a = client.post("/api/admin/members", headers=ha, json={"name": "Amir", "base_honor": 1, "pin": "1111"}).json()
    b = client.post("/api/admin/members", headers=ha, json={"name": "Amina", "base_honor": 1, "pin": "2222"}).json()
    assert a["code"] and b["code"] and a["code"].lower() != b["code"].lower()
    assert a["code"].lower() != "a"  # "A" is Alpha's already


def test_import_with_letter_mapping(client, family, db):
    ha = auth(client, admin=True)
    tasks = "\t".join(["S, Q"] + ["Q"] * 17 + ["Q"])
    text = f"11/23/2026\t{tasks}\n"
    prev = client.post("/api/admin/import/preview", headers=ha, json={"text": text}).json()
    assert prev == {"days": 1, "first": "2026-11-23", "last": "2026-11-23", "letters": ["Q", "S"]}
    r = client.post("/api/admin/import", headers=ha, json={"text": text, "start": "2026-11-23", "end": "2026-11-23",
                                                           "mapping": {"Q": family["B"].id}})
    assert r.json() == {"days": 1, "entries": 1, "unknown_initials": ["S"]}
    log = db.query(DayLog).filter_by(member_id=family["B"].id).one()
    assert set(log.tasks) == set(scoring.SHEET_COLUMNS)


def test_one_missed_task_cuts_honor(client, family):
    """Default rule: a finished weekday with any task not done is −1 Honor."""
    h = auth(client, admin=True)
    nearly = [k for k in ALL if k not in ("mulk", "bonus")]  # pledge + 16 of 17 tasks
    a, b = at_today()
    with a, b:
        r = client.put("/api/board/day", headers=h, json={"member_id": family["B"].id, "date": "2026-11-23", "tasks": nearly})
        assert r.json()["score"]["cut"] == -1 and r.json()["score"]["delta"] == -1
        today = client.put("/api/board/day", headers=h, json={"member_id": family["B"].id, "date": TODAY.isoformat(), "tasks": nearly})
        assert today.json()["score"]["cut"] == 0  # today is still open


def test_week_number_counts_from_scoring_start():
    from app.services import week_info
    start = date(2026, 11, 25)  # a Wednesday: its week (from Sunday 22 Nov) is Week 1
    assert week_info(date(2026, 11, 28), start)["number"] == 1
    assert week_info(date(2026, 11, 29), start)["number"] == 2  # next Sunday
    assert week_info(date(2026, 12, 13), start)["number"] == 4


def test_new_member_is_not_cut_for_days_before_joining(client, family, db):
    from datetime import datetime, timezone

    from app.models import Member
    m = Member(name="Tom", code="T", base_honor=5, pin_hash=family["A"].pin_hash,
               created_at=datetime(2026, 11, 24, 9, 0, tzinfo=timezone.utc))
    db.add(m)
    db.commit()
    a, b = at_today()
    with a, b:
        rows = client.get("/api/board/leaderboard", headers=auth(client, admin=True)).json()["rows"]
        hist = client.get("/api/board/history?days=4", headers=auth(client, admin=True)).json()
    assert next(r for r in rows if r["member"]["name"] == "Tom")["level"] == 5  # 22 & 23 Nov not counted
    tom = next(r for r in hist["rows"] if r["member"]["name"] == "Tom")["cells"]
    assert [c["state"] for c in tom] == ["pre", "pre", "pre", "open"]


def test_profile_frames_and_themes_unlock_by_rank(client, family):
    h = auth(client, family["A"])  # Alpha: base 10 (Gold), 8 after two empty days: Gold
    a, b = at_today()
    with a, b:
        prof = client.get("/api/board/profile", headers=h).json()
        assert prof["member"]["name"] == "Alpha" and prof["tier"]["key"] == "gold"
        frames = {f["key"]: f["available"] for f in prof["frames"]}
        themes = {t["key"]: t["available"] for t in prof["themes"]}
        assert frames["plain"] and frames["silver"] and frames["gold"] and not frames["ruby"] and not frames["galaxy"]
        assert "classic" not in themes and themes["bronze"] and themes["gold"] and not themes["obsidian"] and not themes["ocean"]
        assert client.put("/api/board/profile", headers=h, json={"frame": "silver", "avatar": "eagle", "theme": "gold"}).status_code == 200
        assert client.put("/api/board/profile", headers=h, json={"frame": "ruby"}).status_code == 403
        assert client.put("/api/board/profile", headers=h, json={"theme": "ocean"}).status_code == 403
        assert client.put("/api/board/profile", headers=h, json={"frame": "neon"}).status_code == 400
        row = next(r for r in client.get("/api/board/leaderboard", headers=h).json()["rows"] if r["is_me"])
        info = client.get("/api/board/today", headers=h).json()
    assert row["member"]["frame"] == "silver" and row["member"]["avatar"] == "eagle" and info["viewer"]["theme"] == "gold"
    assert client.get("/api/board/profile", headers=auth(client, admin=True)).status_code == 400


def test_shop_spends_gems(client, family, db):
    h = auth(client, family["S"])  # Sierra
    a, b = at_today()
    with a, b:
        # earn: 18 ticks a day = 90 gems a day (Monday filled in by the admin), plus any new-level rewards
        put_day(client, auth(client, admin=True), family["S"], date(2026, 11, 23), ALL)
        put_day(client, h, family["S"], TODAY, ALL)
        from app.models import DailyClaim
        db.add(DailyClaim(member_id=family["S"].id, day=TODAY - timedelta(days=5), gems=100))  # an earlier streak chest
        db.commit()
        prof = client.get("/api/board/profile", headers=h).json()
        earned = prof["gems"]["earned"]
        assert prof["gems"]["today"] == 90 and prof["gems"]["balance"] == earned
        too_dear = client.post("/api/board/shop/buy", headers=h, json={"kind": "frame", "key": "galaxy"})
        assert too_dear.status_code == 400 and "more gems" in too_dear.json()["detail"]
        assert client.post("/api/board/shop/buy", headers=h, json={"kind": "frame", "key": "gold"}).status_code == 400  # earned, not sold
        r = client.post("/api/board/shop/buy", headers=h, json={"kind": "avatar", "key": "panda"})
        assert r.status_code == 200 and r.json()["gems"]["balance"] == earned - 200 and r.json()["member"]["avatar"] == "panda"
        assert client.post("/api/board/shop/buy", headers=h, json={"kind": "avatar", "key": "panda"}).status_code == 400
        # unticking tasks takes their gems back
        put_day(client, h, family["S"], TODAY, [])
        assert client.get("/api/board/profile", headers=h).json()["gems"]["today"] == 0


def test_admin_edits_tasks(client, family):
    ha, hm = auth(client, admin=True), auth(client, family["A"])
    assert client.get("/api/admin/tasks", headers=hm).status_code == 403
    a, b = at_today()
    with a, b, patch("app.routers.admin.today_for", return_value=TODAY):
        tasks = client.get("/api/admin/tasks", headers=ha).json()
        assert len(tasks) == 17 and tasks[3]["shown_today"] == "263 × Darood Sharif"
        # Darood: 300 today, +2 every day
        r = client.patch("/api/admin/tasks/darood", headers=ha, json={"number_today": 300, "step": 2}).json()
        assert r["shown_today"] == "300 × Darood Sharif" and r["shown_tomorrow"] == "302 × Darood Sharif"
        # push-ups: keep today's number, now +3 every day
        r = client.patch("/api/admin/tasks/push", headers=ha, json={"step": 3, "every": 1}).json()
        assert r["number_today"] == 17 and r["shown_tomorrow"] == "20 push-ups"
        # new task with a number
        new = client.post("/api/admin/tasks", headers=ha, json={"label": "Squats", "group": "Fitness", "fitness": True,
                                                                "number_today": 10, "step": 1}).json()
        assert new["shown_today"] == "10 Squats" and new["key"] == "squats"
        client.patch("/api/admin/tasks/squats", headers=ha, json={"move": -1})
        # remove a task; rename another
        assert client.delete("/api/admin/tasks/milk", headers=ha).status_code == 204
        client.patch("/api/admin/tasks/lang", headers=ha, json={"label": "Arabic class"})
        view = client.get(f"/api/board/day?member_id={family['A'].id}", headers=hm).json()
    labels = [t["label"] for g in view["groups"] for t in g["tasks"]]
    assert "300 × Darood Sharif" in labels and "10 Squats" in labels and "Milk" not in labels and "Arabic class" in labels
    assert labels.index("10 Squats") < labels.index("17 s mountain climbers".replace("17", "38"))
    assert view["score"]["of"] == 17  # 17 - Milk + Squats


def test_new_task_counts_for_the_day(client, family, db):
    mulk_last_night(db, family["A"])
    ha = auth(client, admin=True)
    a, b = at_today()
    with a, b, patch("app.routers.admin.today_for", return_value=TODAY):
        client.post("/api/admin/tasks", headers=ha, json={"label": "Read a hadith"})
        r = client.put("/api/board/day", headers=ha, json={"member_id": family["A"].id, "date": TODAY.isoformat(), "tasks": ALL})
        assert r.json()["score"]["done"] == 17 and r.json()["score"]["of"] == 18 and r.json()["score"]["gain"] == 0
        r = client.put("/api/board/day", headers=ha, json={"member_id": family["A"].id, "date": TODAY.isoformat(),
                                                           "tasks": ALL + ["readahadith"]})
        assert r.json()["score"]["gain"] == 1


def test_rank_up_show_is_owed_once_and_follows_the_member(client, family):
    h, ha = auth(client, family["B"]), auth(client, admin=True)  # Bravo: Silver
    a, b = at_today()
    with a, b:
        first = client.get("/api/board/profile", headers=h).json()
        assert first["celebrate"] is None  # where you start gets no show
        client.post("/api/admin/adjustments", headers=ha, json={"member_id": family["B"].id, "delta": 6})
        prof = client.get("/api/board/profile", headers=h).json()
        assert prof["tier"]["key"] == "gold"
        assert prof["celebrate"]["tier"] == "gold" and prof["celebrate"]["reward"] >= 0
        # Still owed on another device until watched.
        assert client.get("/api/board/profile", headers=auth(client, family["B"])).json()["celebrate"]["tier"] == "gold"
        assert client.post("/api/board/profile/celebrated", headers=h).json()["celebrate"] is None
        assert client.get("/api/board/profile", headers=h).json()["celebrate"] is None
        # Dropping a rank is noted silently; climbing back earns the show again.
        client.post("/api/admin/adjustments", headers=ha, json={"member_id": family["B"].id, "delta": -6})
        assert client.get("/api/board/profile", headers=h).json()["celebrate"] is None
        client.post("/api/admin/adjustments", headers=ha, json={"member_id": family["B"].id, "delta": 6})
        assert client.get("/api/board/profile", headers=h).json()["celebrate"]["tier"] == "gold"


def test_new_member_climbing_before_first_login_gets_the_show(client, family):
    ha = auth(client, admin=True)
    a, b = at_today()
    with a, b:
        m = client.post("/api/admin/members", headers=ha, json={"name": "Tango", "pin": "1234", "base_honor": 2}).json()
        client.post("/api/admin/adjustments", headers=ha, json={"member_id": m["id"], "delta": 3})
        tok = client.post("/api/auth/member", json={"member_id": m["id"], "pin": "1234"}).json()["token"]
        prof = client.get("/api/board/profile", headers={"Authorization": "Bearer " + tok}).json()
    assert prof["tier"]["key"] == "silver" and prof["celebrate"]["tier"] == "silver"


def test_bonus_needs_every_task_first(client, family, db):
    mulk_last_night(db, family["A"])
    h = auth(client, family["A"])
    a, b = at_today()
    with a, b:
        r = client.put("/api/board/day", headers=h, json={"member_id": family["A"].id, "date": TODAY.isoformat(),
                                                           "tasks": ["gate", "fajr", "bonus"]})
        assert r.status_code == 200 and not r.json()["bonus"]["done"] and r.json()["score"]["bonus"] == 0
        r = client.put("/api/board/day", headers=h, json={"member_id": family["A"].id, "date": TODAY.isoformat(),
                                                           "tasks": ALL + ["bonus"]})
        assert r.json()["bonus"]["done"] and r.json()["score"]["delta"] == 2
        # Unticking a task unticks the bonus too.
        r = client.put("/api/board/day", headers=h, json={"member_id": family["A"].id, "date": TODAY.isoformat(),
                                                           "tasks": [k for k in ALL if k != "fajr"] + ["bonus"]})
        assert not r.json()["bonus"]["done"]


def test_daily_streak_chest_once_a_day_and_bigger_by_rank(client, family, db):
    mulk_last_night(db, family["A"])  # Alpha: Gold
    h = auth(client, family["A"])
    a, b = at_today()
    with a, b:
        prof = client.get("/api/board/profile", headers=h).json()
        assert prof["daily"]["gems"] == 5 and not prof["daily"]["available"]  # no streak yet
        assert client.post("/api/board/claim", headers=h).status_code == 400
        put_day(client, h, family["A"], TODAY, ALL)  # finishing today lights the streak
        before = client.get("/api/board/profile", headers=h).json()
        assert before["daily"]["available"]
        after = client.post("/api/board/claim", headers=h).json()
        assert after["gems"]["balance"] == before["gems"]["balance"] + 5 and after["daily"]["claimed_today"]
        assert client.post("/api/board/claim", headers=h).status_code == 400
        assert len(after["week_days"]) == 7 and any(d["today"] and d["state"] == "done" for d in after["week_days"])
    sierra = client.get("/api/board/profile", headers=auth(client, family["S"]))
    assert sierra.status_code == 200


def test_special_period_pauses_and_shrinks_tasks(client, family, db):
    mulk_last_night(db, family["A"])
    ha, h = auth(client, admin=True), auth(client, family["A"])
    a, b = at_today()
    with a, b:
        r = client.post("/api/admin/periods", headers=ha, json={"name": "Ramadan", "start": TODAY.isoformat(),
                        "end": (TODAY + timedelta(days=29)).isoformat(), "off": ["lap", "jj"], "numbers": {"push": 5}})
        assert r.status_code == 201, r.text
        view = client.get(f"/api/board/day?member_id={family['A'].id}", headers=h).json()
        keys = [t["key"] for g in view["groups"] for t in g["tasks"]]
        assert "lap" not in keys and "jj" not in keys and view["score"]["of"] == 15
        push = next(t for g in view["groups"] for t in g["tasks"] if t["key"] == "push")
        assert push["label"].startswith("5 ") and view["periods"][0]["name"] == "Ramadan"
        done = [k for k in ALL if k not in ("lap", "jj")]
        r = put_day(client, h, family["A"], TODAY, done)
        assert r.json()["score"]["gain"] == 1
        assert client.post("/api/admin/periods", headers=ha, json={"name": "x", "start": TODAY.isoformat(),
                           "end": (TODAY - timedelta(days=1)).isoformat(), "off": ["lap"]}).status_code == 400
        pid = client.get("/api/admin/periods", headers=ha).json()[0]["id"]
        assert client.delete(f"/api/admin/periods/{pid}", headers=ha).status_code == 204


def test_member_excuses_one_task_with_a_reason(client, family, db):
    mulk_last_night(db, family["A"])
    h, ha = auth(client, family["A"]), auth(client, admin=True)
    a, b = at_today()
    with a, b:
        done = [k for k in ALL if k != "fajr"]
        r = client.put("/api/board/day", headers=h, json={"member_id": family["A"].id, "date": TODAY.isoformat(),
                                                          "tasks": done, "task_excuses": {"fajr": "Travelling"}})
        body = r.json()
        assert body["score"]["gain"] == 1 and body["score"]["of"] == 16 and body["task_excuses"] == {"fajr": "Travelling"}
        fajr = next(t for g in body["groups"] for t in g["tasks"] if t["key"] == "fajr")
        assert fajr["excused"] == "Travelling" and not fajr["done"]
        # Ticking other things keeps the excuse unless it is sent again.
        r = put_day(client, h, family["A"], TODAY, done)
        assert r.json()["task_excuses"] == {"fajr": "Travelling"}
        row = next(x for x in client.get("/api/board/leaderboard", headers=ha).json()["rows"] if x["member"]["name"] == "Alpha")
        assert row["excused_today"][0]["reason"] == "Travelling"
        assert "excused_today" not in client.get("/api/board/leaderboard", headers=h).json()["rows"][0]
        # A finished day can't get a new excuse from a member.
        r = client.put("/api/board/day", headers=h, json={"member_id": family["A"].id, "date": (TODAY - timedelta(days=1)).isoformat(),
                                                          "tasks": ["mulk"], "task_excuses": {"fajr": "late"}})
        assert r.status_code == 403


def test_achievements_unlock_from_history_and_pay_once(client, family, db):
    mulk_last_night(db, family["A"])
    h, ha = auth(client, family["A"]), auth(client, admin=True)  # Alpha started at Gold
    a, b = at_today()
    with a, b:
        data = client.get("/api/board/achievements", headers=h).json()
        got = {x["key"]: x for x in data["items"]}
        assert got["gold"]["unlocked"] and got["silver"]["unlocked"] and not got["spark"]["unlocked"]
        assert data["total"] == len(data["items"]) >= 20
        put_day(client, h, family["A"], TODAY, ALL)  # a perfect day
        got = {x["key"]: x for x in client.get("/api/board/achievements", headers=h).json()["items"]}
        assert got["spark"]["unlocked"] and got["days10"]["progress"] == 1
        before = client.get("/api/board/profile", headers=h).json()
        assert before["achievements_ready"] >= 3
        client.post("/api/board/achievements/spark/claim", headers=h)
        after = client.get("/api/board/profile", headers=h).json()
        assert after["gems"]["balance"] == before["gems"]["balance"] + 15
        assert client.post("/api/board/achievements/spark/claim", headers=h).status_code == 400
        assert client.post("/api/board/achievements/days100/claim", headers=h).status_code == 400
        # Parents can look at a member's achievements.
        assert client.get(f"/api/board/achievements?member_id={family['A'].id}", headers=ha).json()["member"]["name"] == "Alpha"


def test_oath_needs_i_swear_and_the_tour_is_remembered(client, family):
    h = auth(client, family["A"])
    a, b = at_today()
    with a, b:
        prof = client.get("/api/board/profile", headers=h).json()
        assert prof["oath"] is False and prof["toured"] is False
        assert client.post("/api/board/oath", headers=h, json={"words": "i promise"}).status_code == 400
        assert client.post("/api/board/oath", headers=h, json={"words": "  i   swear "}).json()["oath"] is True
        assert client.post("/api/board/toured", headers=h).json()["toured"] is True
        assert client.post("/api/board/oath", headers=auth(client, admin=True), json={"words": "I SWEAR"}).status_code == 400


def test_quest_resets_to_one_even_after_a_parent_raised_them_today(client, family, db):
    ha = auth(client, admin=True)
    m = family["B"]  # Bravo, base 5
    a, b = at_today()
    with a, b, patch("app.routers.admin.today_for", return_value=TODAY):
        client.post("/api/admin/adjustments", headers=ha, json={"member_id": m.id, "delta": 44, "note": "to Obsidian"})
        from app.models import Adjustment
        for adj in db.query(Adjustment).all():  # made this morning (the test clock is fixed on TODAY)
            adj.created_at = datetime(TODAY.year, TODAY.month, TODAY.day, 9, tzinfo=timezone.utc)
        db.commit()
        h = auth(client, m)
        me = next(r for r in client.get("/api/board/leaderboard", headers=h).json()["rows"] if r["is_me"])
        assert me["tier"]["key"] == "obsidian" and me["can_start_quest"]
        q = client.post("/api/board/quest", headers=h, json={"member_id": m.id}).json()
        assert q["level"] == 1 and q["tier"]["key"] == "bronze" and q["quest"]["active"] and q["label"] == "+I"
        # A parent's change after the quest started still counts.
        client.post("/api/admin/adjustments", headers=ha, json={"member_id": m.id, "delta": 2, "note": "well done"})
        late = db.query(Adjustment).filter(Adjustment.delta == 2).one()
        late.created_at = datetime.now(timezone.utc)  # after the quest started
        db.commit()
        me = next(r for r in client.get("/api/board/leaderboard", headers=h).json()["rows"] if r["is_me"])
        assert me["level"] == 3


def test_reset_tasks_to_the_original_sheet(client, family):
    ha = auth(client, admin=True)
    with patch("app.routers.admin.today_for", return_value=TODAY):
        client.patch("/api/admin/tasks/lap", headers=ha, json={"label": "1"})  # a mistake like "2 1"
        client.post("/api/admin/tasks", headers=ha, json={"label": "Extra"})
        out = client.post("/api/admin/tasks/reset", headers=ha).json()
    keys = [t["key"] for t in out]
    assert keys == [t.key for t in scoring.DEFAULT_SPECS]
    lap = next(t for t in out if t["key"] == "lap")
    assert lap["label"] == "{n} laps" and lap["number_today"] is not None
    assert next(t for t in out if t["key"] == "mulk")["next_day"]
    assert client.post("/api/admin/tasks/reset", headers=auth(client, family["A"])).status_code == 403


def test_asr_before_noon_breaks_the_oath(client, family, db):
    h = auth(client, family["A"])
    a, b = at_today()
    with a, b:
        client.post("/api/board/oath", headers=h, json={"words": "I SWEAR"})
        with patch("app.routers.board.clock_for", return_value="11:30"):
            view = client.get(f"/api/board/day?member_id={family['A'].id}", headers=h).json()
            asr = next(t for g in view["groups"] for t in g["tasks"] if t["key"] == "asr")
            assert asr["not_before"] == "12:00 PM"
            r = client.put("/api/board/day", headers=h, json={"member_id": family["A"].id, "date": TODAY.isoformat(), "tasks": ["asr"]})
            assert r.status_code == 409 and r.json()["detail"].startswith("too_early")
        prof = client.get("/api/board/profile", headers=h).json()
        assert prof["oath"] is False and "Asr" in prof["oath_note"]
        with patch("app.routers.board.clock_for", return_value="12:05"):
            assert client.put("/api/board/day", headers=h, json={"member_id": family["A"].id, "date": TODAY.isoformat(), "tasks": ["asr"]}).status_code == 200
        assert client.post("/api/board/oath", headers=h, json={"words": "I SWEAR"}).json()["oath_note"] == ""
        early = next(x for x in client.get("/api/admin/members", headers=auth(client, admin=True)).json() if x["name"] == "Alpha")
        assert early["early_ticks"] == 1
        # Parents can tick it any time.
        with patch("app.routers.board.clock_for", return_value="09:00"):
            assert client.put("/api/board/day", headers=auth(client, admin=True), json={"member_id": family["B"].id, "date": TODAY.isoformat(), "tasks": ["asr"]}).status_code == 200


def test_same_level_earlier_finisher_ranks_higher(client, family, db):
    ha = auth(client, admin=True)
    a, b = at_today()
    with a, b, patch("app.routers.admin.today_for", return_value=TODAY):
        for code in ("A", "B", "S"):
            mulk_last_night(db, family[code])
        # Make Bravo and Sierra level with Alpha (base 10, 26 -> 5, 26).
        client.patch(f"/api/admin/members/{family['B'].id}", headers=ha, json={"base_honor": 10})
        client.patch(f"/api/admin/members/{family['S'].id}", headers=ha, json={"base_honor": 10})
        rows = client.get("/api/board/leaderboard", headers=ha).json()["rows"]
        assert sorted(r["rank"] for r in rows) == [1, 2, 3]  # nobody shares a place
        put_day(client, auth(client, family["S"]), family["S"], TODAY, ALL)  # Sierra finishes first
        put_day(client, auth(client, family["B"]), family["B"], TODAY, ALL)  # then Bravo
        rows = client.get("/api/board/leaderboard", headers=ha).json()["rows"]
    order = [r["member"]["name"] for r in rows]
    assert order[:2] == ["Sierra", "Bravo"] and rows[0]["rank"] == 1 and rows[1]["rank"] == 2
