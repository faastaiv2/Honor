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
        assert r.status_code == 403 and "Silver" in r.json()["detail"]


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
    assert client.put("/api/board/avatar", headers=h, json={"avatar": "lion"}).status_code == 400  # Common now: buy it first
    assert client.put("/api/board/avatar", headers=h, json={"avatar": ""}).json() == {"avatar": ""}  # Plain is free
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
        assert client.put("/api/board/profile", headers=h, json={"frame": "silver", "avatar": "", "theme": "gold"}).status_code == 200
        assert client.put("/api/board/profile", headers=h, json={"frame": "ruby"}).status_code == 403
        assert client.put("/api/board/profile", headers=h, json={"theme": "ocean"}).status_code == 403
        assert client.put("/api/board/profile", headers=h, json={"frame": "neon"}).status_code == 400
        row = next(r for r in client.get("/api/board/leaderboard", headers=h).json()["rows"] if r["is_me"])
        info = client.get("/api/board/today", headers=h).json()
    assert row["member"]["frame"] == "silver" and row["member"]["avatar"] == "" and info["viewer"]["theme"] == "gold"
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
        assert r.status_code == 200 and r.json()["gems"]["balance"] == earned - 100 and r.json()["member"]["avatar"] == "panda"
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


def test_special_period_for_chosen_members_only(client, family, db):
    ha = auth(client, admin=True)
    a, b = at_today()
    with a, b:
        r = client.post("/api/admin/periods", headers=ha, json={"name": "Sick week", "start": TODAY.isoformat(),
                        "end": TODAY.isoformat(), "off": ["lap"], "members": [family["A"].id]})
        assert r.status_code == 201 and r.json()["members"] == [family["A"].id]
        keys = lambda m: [t["key"] for g in client.get(f"/api/board/day?member_id={m.id}", headers=ha).json()["groups"] for t in g["tasks"]]
        assert "lap" not in keys(family["A"]) and "lap" in keys(family["B"])
        assert client.post("/api/admin/periods", headers=ha, json={"name": "x", "start": TODAY.isoformat(),
                           "end": TODAY.isoformat(), "off": ["lap"], "members": ["nobody"]}).status_code == 400


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


PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="


def test_art_tournament(client, family):
    sat = date(2026, 11, 28)
    hs = {c: auth(client, family[c]) for c in ("A", "B", "S")}
    ha = auth(client, admin=True)
    a, b = at_today()  # Tuesday
    with a, b, patch("app.routers.events.today_for", return_value=TODAY):
        info = client.get("/api/events", headers=hs["A"]).json()
        assert info["open"] is False and info["next"] is None and info["suggested_day"] == sat.isoformat()
        assert client.post("/api/events/create", headers=hs["A"], json={"day": sat.isoformat()}).status_code == 403
        r = client.post("/api/events/create", headers=ha, json={"day": sat.isoformat(), "title": "Art Tournament", "prompt": "Your favourite animal"})
        assert r.status_code == 200 and r.json()["next"]["prompt"] == "Your favourite animal"
        assert client.post("/api/events/create", headers=ha, json={"day": sat.isoformat()}).status_code == 400  # one per day
        assert client.post("/api/events/entry", headers=hs["A"], json={"title": "Sun", "image": PNG}).status_code == 403
    a, b = at_today(sat)
    with a, b, patch("app.routers.events.today_for", return_value=sat):
        for c, t in (("A", "Sunset"), ("B", "Cat"), ("S", "Mosque")):
            assert client.post("/api/events/entry", headers=hs[c], json={"title": t, "image": PNG}).status_code == 200
        assert client.post("/api/events/entry", headers=hs["A"], json={"title": "x", "image": "data:text/html;base64,PGI+"}).status_code == 400
        info = client.get("/api/events", headers=hs["A"]).json()
        assert info["open"] and info["event"]["title"] == "Art Tournament" and len(info["current"]) == 3 and info["mine"]["title"] == "Sunset"
        ids = {e["member"]["name"]: e["id"] for e in info["current"]}
        img = client.get(f"/api/events/image/{ids['Bravo']}", headers=hs["A"])
        assert img.status_code == 200 and img.headers["content-type"] == "image/png"
        before = client.get("/api/board/profile", headers=hs["S"]).json()["gems"]["balance"]
        assert client.post("/api/events/judge", headers=hs["A"], json={"day": sat.isoformat(), "first": ids["Sierra"]}).status_code == 403
        client.post("/api/events/judge", headers=ha, json={"day": sat.isoformat(), "first": ids["Sierra"], "second": ids["Alpha"], "third": ids["Bravo"]})
        prof = client.get("/api/board/profile", headers=hs["S"]).json()
        assert prof["gems"]["balance"] == before + 100 and prof["event_win"]["place"] == 1
        ach = {x["key"]: x for x in client.get("/api/board/achievements", headers=hs["S"]).json()["items"]}
        assert ach["art1"]["unlocked"] and not ach["art2"]["unlocked"]
        assert {x["key"]: x for x in client.get("/api/board/achievements", headers=hs["B"]).json()["items"]}["art3"]["unlocked"]
        client.post(f"/api/events/seen/{prof['event_win']['id']}", headers=hs["S"])
        assert client.get("/api/board/profile", headers=hs["S"]).json()["event_win"] is None
        assert client.post("/api/events/entry", headers=hs["S"], json={"title": "again", "image": PNG}).status_code == 400  # judged
        ev = client.get("/api/events", headers=ha).json()["event"]
        client.delete(f"/api/events/{ev['id']}", headers=ha)  # its art goes too and the prizes are taken back
        assert client.get("/api/board/profile", headers=hs["S"]).json()["gems"]["balance"] == before



def test_event_times_prizes_fee_banner_and_edit(client, family, db):
    sat = date(2026, 11, 28)
    ha, h = auth(client, admin=True), auth(client, family["A"])
    a, b = at_today(sat)
    with a, b, patch("app.routers.events.today_for", return_value=sat), patch("app.routers.events.clock_for", return_value="09:00"):
        r = client.post("/api/events/create", headers=ha, json={"day": sat.isoformat(), "title": "Calligraphy", "opens": "10:00",
                        "closes": "18:00", "prize1": 200, "prize2": 80, "prize3": 30, "fee": 20, "banner": "custom", "banner_image": PNG})
        ev = r.json()["event"]
        assert ev["state"] == "upcoming" and ev["prizes"] == {"1": 200, "2": 80, "3": 30} and ev["fee"] == 20 and ev["banner_image"]
        assert client.get(f"/api/events/banner/{ev['id']}", headers=h).status_code == 200
        assert client.post("/api/events/entry", headers=h, json={"title": "x", "image": PNG}).status_code == 403  # not open yet
        bad = client.put(f"/api/events/{ev['id']}", headers=ha, json={"day": sat.isoformat(), "opens": "18:00", "closes": "10:00"})
        assert bad.status_code == 400
    from app.models import DailyClaim
    db.add(DailyClaim(member_id=family["A"].id, day=sat - timedelta(days=9), gems=100))
    db.commit()
    with a, b, patch("app.routers.events.today_for", return_value=sat), patch("app.routers.events.clock_for", return_value="12:00"):
        before = client.get("/api/board/profile", headers=h).json()["gems"]["balance"]
        assert client.post("/api/events/entry", headers=h, json={"title": "Bismillah", "image": PNG}).status_code == 200
        assert client.get("/api/board/profile", headers=h).json()["gems"]["balance"] == before - 20  # entry fee
        client.delete("/api/events/entry/mine", headers=h)
        assert client.get("/api/board/profile", headers=h).json()["gems"]["balance"] == before  # fee back
        client.post("/api/events/entry", headers=h, json={"title": "Bismillah", "image": PNG})
        eid = client.get("/api/events", headers=h).json()["mine"]["id"]
        client.post("/api/events/judge", headers=ha, json={"day": sat.isoformat(), "first": eid})
        assert client.get("/api/board/profile", headers=h).json()["gems"]["balance"] == before - 20 + 200
        client.put(f"/api/events/{ev['id']}", headers=ha, json={"day": sat.isoformat(), "title": "Calligraphy", "opens": "10:00",
                   "closes": "18:00", "prize1": 150, "prize2": 80, "prize3": 30, "fee": 20, "banner": "ocean"})
        assert client.get("/api/board/profile", headers=h).json()["gems"]["balance"] == before - 20 + 150  # new prize
    with a, b, patch("app.routers.events.today_for", return_value=sat), patch("app.routers.events.clock_for", return_value="18:30"):
        info = client.get("/api/events", headers=h).json()
        assert info["open"] is False and info["past"][0]["title"] == "Calligraphy"
        assert client.post("/api/events/entry", headers=auth(client, family["B"]), json={"title": "late", "image": PNG}).status_code == 403


def test_new_member_sets_own_four_digit_pin_once(client, family, db):
    ha = auth(client, admin=True)
    m = client.post("/api/admin/members", headers=ha, json={"name": "Newbie", "base_honor": 1}).json()
    assert not m["has_pin"]
    assert client.post("/api/auth/member/setup", json={"member_id": m["id"], "pin": "12345"}).status_code == 422
    assert client.post("/api/auth/member/setup", json={"member_id": m["id"], "pin": "12a4"}).status_code == 422
    r = client.post("/api/auth/member/setup", json={"member_id": m["id"], "pin": "4321"})
    assert r.status_code == 200 and r.json()["viewer"]["name"] == "Newbie"
    assert client.post("/api/auth/member/setup", json={"member_id": m["id"], "pin": "0000"}).status_code == 409
    assert client.post("/api/auth/member", json={"member_id": m["id"], "pin": "4321"}).status_code == 200


def test_quest_music_upload_is_admin_only_and_served_to_family(client, family):
    ha, h = auth(client, admin=True), auth(client, family["A"])
    assert client.get("/api/media/quest-music/info", headers=h).json()["has"] is False
    song = b"ID3" + b"\x00" * 5000
    assert client.put("/api/media/quest-music", headers={**h, "Content-Type": "audio/mpeg"}, content=song).status_code == 403
    assert client.put("/api/media/quest-music", headers={**ha, "Content-Type": "text/plain"}, content=b"hi").status_code == 400
    r = client.put("/api/media/quest-music", headers={**ha, "Content-Type": "audio/mpeg"}, content=song)
    assert r.status_code == 200 and r.json()["size"] == len(song)
    assert client.patch("/api/media/quest-music", headers=ha, json={"start": 12, "volume": 70}).json()["start"] == 12
    assert client.patch("/api/media/quest-music", headers=ha, json={"start": 12, "end": 80, "volume": 70}).json()["end"] == 80
    assert client.patch("/api/media/quest-music", headers=ha, json={"start": 12, "volume": 70, "offset_ms": 4500}).json()["offset_ms"] == 4500
    assert client.patch("/api/media/quest-music", headers=ha, json={"start": 30, "end": 20, "volume": 70}).status_code == 400
    got = client.get("/api/media/quest-music", headers=h)
    assert got.status_code == 200 and got.content == song and got.headers["content-type"] == "audio/mpeg"
    assert client.get("/api/media/quest-music").status_code == 401
    every = client.get("/api/media", headers=h).json()
    assert every["quest-music"]["has"] and every["quest-music"]["size"] == len(song) and not every["chest"]["has"]
    assert client.put("/api/media/rankup-music-gold", headers={**ha, "Content-Type": "audio/mpeg"}, content=song).status_code == 200
    assert client.get("/api/media", headers=h).json()["rankup-music-gold"]["has"]
    assert client.put("/api/media/nonsense", headers={**ha, "Content-Type": "audio/mpeg"}, content=song).status_code == 404
    assert client.delete("/api/media/quest-music", headers=ha).json()["has"] is False


def test_event_for_today_must_not_be_already_over(client, family):
    from app.routers import events as ev_mod
    ha = auth(client, admin=True)
    a, b = at_today()
    with a, b, patch.object(ev_mod, "clock_for", lambda cfg: "20:30"), patch.object(ev_mod, "today_for", lambda cfg: TODAY):
        r = client.post("/api/events/create", headers=ha, json={"day": TODAY.isoformat(), "title": "Late", "opens": "09:00", "closes": "18:00"})
        assert r.status_code == 400 and "already over" in r.json()["detail"]
        r = client.post("/api/events/create", headers=ha, json={"day": TODAY.isoformat(), "title": "Tonight", "opens": "20:00", "closes": "23:00"})
        assert r.status_code == 200 and r.json()["open"] is True and r.json()["timezone"]


def test_pillar_of_shame_locks_picture_and_frame(client, family, db):
    ha = auth(client, admin=True)
    m = client.post("/api/admin/members", headers=ha, json={"name": "Low", "pin": "1234", "base_honor": -2}).json()
    h = {"Authorization": "Bearer " + client.post("/api/auth/member", json={"member_id": m["id"], "pin": "1234"}).json()["token"]}
    prof = client.get("/api/board/profile", headers=h).json()
    assert prof["member"]["avatar"] == "👹" and prof["member"]["frame"] == "shame" and prof["member"]["shamed"]
    assert client.put("/api/board/profile", headers=h, json={"avatar": "lion"}).status_code == 403
    row = next(r for r in client.get("/api/board/leaderboard", headers=ha).json()["rows"] if r["member"]["name"] == "Low")
    assert row["member"]["avatar"] == "👹"
    assert next(x for x in client.get("/api/auth/members").json() if x["name"] == "Low")["frame"] == "shame"


def test_goblin_raid_steals_gems_once_on_falling(client, family, db):
    from app.models import Member as M
    ha = auth(client, admin=True)
    m = client.post("/api/admin/members", headers=ha, json={"name": "Faller", "pin": "1234", "base_honor": 0}).json()
    h = {"Authorization": "Bearer " + client.post("/api/auth/member", json={"member_id": m["id"], "pin": "1234"}).json()["token"]}
    row = db.get(M, m["id"]); row.gems_stolen = -500; db.commit()  # give them 500 gems to lose
    first = client.get("/api/board/profile", headers=h).json()
    assert first["raid"] is None and first["gems"]["balance"] == 500
    fall = lambda d: client.post("/api/admin/adjustments", headers=ha, json={"member_id": m["id"], "delta": d, "note": "t"})
    fall(-1)  # to −I: 15–35
    one = client.get("/api/board/profile", headers=h).json()
    assert 15 <= one["raid"]["stolen"] <= 35 and one["gems"]["balance"] == 500 - one["raid"]["stolen"]
    seen = client.post("/api/board/profile/raid-seen", headers=h).json()
    assert seen["raid"] is None and client.get("/api/board/profile", headers=h).json()["raid"] is None
    fall(-1)  # deeper, to −II: 35–75
    two = client.get("/api/board/profile", headers=h).json()
    assert 35 <= two["raid"]["stolen"] <= 75
    client.post("/api/board/profile/raid-seen", headers=h)
    fall(-1)  # to −III: 75–99
    three = client.get("/api/board/profile", headers=h).json()
    assert 75 <= three["raid"]["stolen"] <= 99
    client.post("/api/board/profile/raid-seen", headers=h)
    fall(1)  # climbing to −II: no raid
    assert client.get("/api/board/profile", headers=h).json()["raid"] is None


def test_swearing_the_oath_unlocks_the_i_swear_achievement(client, family):
    h = auth(client, family["A"])
    item = lambda: next(x for x in client.get("/api/board/achievements", headers=h).json()["items"] if x["key"] == "oath")
    assert not item()["unlocked"] and item()["gems"] == 5
    client.post("/api/board/oath", headers=h, json={"words": "I SWEAR"})
    assert item()["unlocked"]
    before = client.get("/api/board/profile", headers=h).json()["gems"]["balance"]
    client.post("/api/board/achievements/oath/claim", headers=h)
    assert client.get("/api/board/profile", headers=h).json()["gems"]["balance"] == before + 5


def test_dalilul_khairat_has_the_days_video_link(client, family):
    from app.scoring import DALAIL_LINKS
    h, ha = auth(client, family["A"]), auth(client, admin=True)
    a, b = at_today()
    with a, b:
        view = client.get(f"/api/board/day?member_id={family['A'].id}", headers=h).json()
        dal = next(t for g in view["groups"] for t in g["tasks"] if t["key"] == "dalail")
        assert dal["link"] == DALAIL_LINKS[TODAY.weekday()]
        tasks = client.get("/api/admin/tasks", headers=ha).json()
        assert next(t for t in tasks if t["key"] == "dalail")["links"][6].endswith("t=492s")
        links = [""] * 7
        links[TODAY.weekday()] = "https://example.com/v"
        assert client.patch("/api/admin/tasks/dalail", headers=ha, json={"links": links}).status_code == 200
        dal = next(t for g in client.get(f"/api/board/day?member_id={family['A'].id}", headers=h).json()["groups"]
                   for t in g["tasks"] if t["key"] == "dalail")
        assert dal["link"] == "https://example.com/v"
        assert client.patch("/api/admin/tasks/dalail", headers=ha, json={"links": ["javascript:x"]}).status_code == 422


def test_free_and_achievement_pictures(client, family):
    h = auth(client, family["A"])
    pics = {x["key"]: x for x in client.get("/api/board/profile", headers=h).json()["avatars"]}
    assert pics["bunny"]["available"] and pics["bunny"]["price"] == 0
    assert not pics["squire"]["available"] and pics["squire"]["unlock"]["name"] == "I Swear"
    assert client.put("/api/board/profile", headers=h, json={"avatar": "squire"}).status_code == 403
    assert client.post("/api/board/shop/buy", headers=h, json={"kind": "avatar", "key": "squire"}).status_code == 400
    client.post("/api/board/oath", headers=h, json={"words": "I SWEAR"})
    assert client.put("/api/board/profile", headers=h, json={"avatar": "squire"}).status_code == 200
    assert client.put("/api/board/profile", headers=h, json={"avatar": "bunny"}).status_code == 200
    assert not pics["eagle"]["available"] and pics["eagle"]["unlock"]["key"] == "shop1"


def test_ticking_a_video_task_before_watching_means_swearing_again(client, family, db, watch_rule):
    h = auth(client, family["A"])
    a, b = at_today()
    with a, b:
        client.post("/api/board/oath", headers=h, json={"words": "I swear"})
        r = put_day(client, h, family["A"], TODAY, ["gate", "dalail"])
        assert r.status_code == 409 and r.json()["detail"].startswith("too_early")
        assert "Dalilul Khairat" in r.json()["detail"]
        assert client.get("/api/board/profile", headers=h).json()["oath"] is False
        client.post("/api/board/oath", headers=h, json={"words": "I swear"})
        w = client.post("/api/board/watched", headers=h,
                        json={"member_id": family["A"].id, "date": TODAY.isoformat(), "task": "dalail"})
        assert w.status_code == 200
        dal = next(t for g in client.get(f"/api/board/day?member_id={family['A'].id}", headers=h).json()["groups"]
                   for t in g["tasks"] if t["key"] == "dalail")
        assert dal["watched"] is True
        assert put_day(client, h, family["A"], TODAY, ["gate", "dalail"]).status_code == 200
        assert client.post("/api/board/watched", headers=auth(client, family["B"]),
                           json={"member_id": family["A"].id, "date": TODAY.isoformat(), "task": "dalail"}).status_code == 403


def test_announcements(client, family):
    h, ha = auth(client, family["A"]), auth(client, admin=True)
    assert client.post("/api/news", headers=h, json={"title": "x"}).status_code == 403
    r = client.post("/api/news", headers=ha, json={"title": "Trip on Sunday", "body": "Zoo!", "emoji": "🦁"})
    assert r.status_code == 201
    pin = client.post("/api/news", headers=ha, json={"title": "Rules", "pinned": True}).json()
    got = client.get("/api/news", headers=h).json()
    assert got["unread"] == 2 and got["items"][0]["title"] == "Rules"
    client.post("/api/news/seen", headers=h)
    assert client.get("/api/news", headers=h).json()["unread"] == 0
    assert client.patch(f"/api/news/{pin['id']}", headers=ha, json={"pinned": False}).json()["pinned"] is False
    assert client.delete(f"/api/news/{pin['id']}", headers=ha).status_code == 204
    assert [i["title"] for i in client.get("/api/news", headers=ha).json()["items"]] == ["Trip on Sunday"]


def test_only_godfathers_get_the_godfather_frame(client, family):
    h, ha = auth(client, family["A"]), auth(client, admin=True)
    frames = [f["key"] for f in client.get("/api/board/profile", headers=h).json()["frames"]]
    assert "godfather" not in frames
    assert client.put("/api/board/profile", headers=h, json={"frame": "godfather"}).status_code == 403
    assert client.post("/api/board/shop/buy", headers=h, json={"kind": "frame", "key": "godfather"}).status_code == 400
    assert client.patch(f"/api/admin/members/{family['A'].id}", headers=h, json={"godfather": True}).status_code == 403
    assert client.patch(f"/api/admin/members/{family['A'].id}", headers=ha, json={"godfather": True}).json()["godfather"] is True
    prof = client.get("/api/board/profile", headers=h).json()
    assert prof["frames"][0]["key"] == "godfather" and prof["frames"][0]["available"]
    assert client.put("/api/board/profile", headers=h, json={"frame": "godfather"}).status_code == 200
    client.patch(f"/api/admin/members/{family['A'].id}", headers=ha, json={"godfather": False})
    assert client.get("/api/board/profile", headers=h).json()["member"]["frame"] != "godfather"


def test_admin_gives_takes_and_sets_gems(client, family):
    h, ha = auth(client, family["A"]), auth(client, admin=True)
    url = f"/api/admin/members/{family['A'].id}/gems"
    assert client.post(url, headers=h, json={"delta": 50}).status_code == 403
    start = client.get("/api/board/profile", headers=h).json()["gems"]["balance"]
    assert client.post(url, headers=ha, json={"delta": 50, "note": "helped"}).json()["balance"] == start + 50
    assert client.get("/api/board/profile", headers=h).json()["gems"]["balance"] == start + 50
    assert client.post(url, headers=ha, json={"balance": 7}).json() == {"balance": 7, "delta": 7 - start - 50}
    assert client.post(url, headers=ha, json={"delta": -100}).json()["balance"] == 0  # never below 0
    assert client.get("/api/admin/gems", headers=ha).json()[family["A"].id] == 0


def test_godfather_achievement_is_only_for_godfathers(client, family):
    h, ha = auth(client, family["A"]), auth(client, admin=True)
    keys = [a["key"] for a in client.get("/api/board/achievements", headers=h).json()["items"]]
    assert "godfather" not in keys
    assert client.post("/api/board/achievements/godfather/claim", headers=h).status_code == 404
    client.patch(f"/api/admin/members/{family['A'].id}", headers=ha, json={"godfather": True})
    prof = client.get("/api/board/profile", headers=h).json()
    assert prof["godfather"] == {"is": True, "seen": False}
    before = prof["gems"]["balance"]
    gf = next(a for a in client.get("/api/board/achievements", headers=h).json()["items"] if a["key"] == "godfather")
    assert gf["unlocked"] and gf["gems"] == 313
    client.post("/api/board/achievements/godfather/claim", headers=h)
    assert client.get("/api/board/profile", headers=h).json()["gems"]["balance"] == before + 313
    client.post("/api/board/profile/godfather-seen", headers=h)
    assert client.get("/api/board/profile", headers=h).json()["godfather"]["seen"] is True


def test_before_the_program_starts_tasks_are_a_preview(client, family, db):
    from app.models import AppSettings
    cfg = db.get(AppSettings, 1)
    cfg.score_from = TODAY + timedelta(days=3)
    db.commit()
    h, ha = auth(client, family["A"]), auth(client, admin=True)
    a, b = at_today()
    with a, b:
        view = client.get(f"/api/board/day?member_id={family['A'].id}", headers=h).json()
        assert view["mode"] == "preview" and not view["editable"]
        assert view["bonus"]["dhikr"] == "يا الله"  # counts from the start: Ya Allah first
        r = put_day(client, h, family["A"], TODAY, ["gate", "fajr"])
        assert r.status_code == 403 and "preview" in r.json()["detail"]
        assert put_day(client, ha, family["A"], TODAY, ["gate", "fajr"]).status_code == 200  # a parent still can


def test_bonus_starts_from_ya_allah_on_the_start_day(client, family):
    h = auth(client, family["A"])
    for offset, name in ((0, "يا الله"), (1, "يا رحمن"), (2, "يا رحيم")):
        a, b = at_today(date(2026, 11, 22) + timedelta(days=offset))
        with a, b:
            assert client.get("/api/board/today", headers=h).json()["bonus"]["dhikr"] == name


def test_legend_achievement_gives_1000():
    from app.achievements import BY_KEY
    assert BY_KEY["legendary"].gems == 1000


def test_a_new_members_first_day_never_costs_honor(client, family, db):
    """Added on the 24th; the clock moves on to the 25th (a time zone change, or just midnight) with nothing ticked."""
    from app.models import Member
    m = Member(name="Newbie", code="N", base_honor=0, pin_hash=family["A"].pin_hash,
               created_at=datetime(2026, 11, 24, 18, 0, tzinfo=timezone.utc), seen_rank="member")
    db.add(m)
    db.commit()
    h = auth(client, m)
    a, b = at_today(TODAY + timedelta(days=1))
    with a, b:
        prof = client.get("/api/board/profile", headers=h).json()
    assert prof["level"] == 0 and prof["tier"]["key"] == "member"
    assert not prof.get("raid")


def test_an_undone_fall_calls_the_goblins_off(client, family, db):
    m = family["A"]
    m.raid_owed, m.gems_stolen, m.raid_depth = 20, 20, -1  # a raid recorded but not yet shown
    db.commit()
    h = auth(client, m)
    a, b = at_today()
    with a, b:
        prof = client.get("/api/board/profile", headers=h).json()
    db.refresh(m)
    assert not prof.get("raid") and m.gems_stolen == 0 and m.raid_owed == -1


def test_admin_can_switch_to_dark(client, family):
    ha, h = auth(client, admin=True), auth(client, family["A"])
    assert client.get("/api/board/today", headers=ha).json()["viewer"]["theme"] == "white"
    assert client.put("/api/admin/theme", headers=ha, json={"theme": "dark"}).json() == {"theme": "dark"}
    assert client.get("/api/board/today", headers=ha).json()["viewer"]["theme"] == "dark"
    assert client.put("/api/admin/theme", headers=ha, json={"theme": "pink"}).status_code == 422
    assert client.put("/api/admin/theme", headers=h, json={"theme": "dark"}).status_code == 403


def test_community_posts_pictures_wins_and_likes(client, family, db):
    from app.models import Event, EventEntry
    h, hb, ha = auth(client, family["A"]), auth(client, family["B"]), auth(client, admin=True)
    a, b = at_today()
    with a, b:
        client.post("/api/board/oath", headers=h, json={"words": "I swear"})
        assert client.put("/api/board/profile", headers=h, json={"avatar": "cat"}).status_code == 200
        assert client.put("/api/board/profile", headers=h, json={"avatar": "bunny"}).status_code == 200  # merged
    feed = client.get("/api/news", headers=hb).json()["items"]
    pics = [x for x in feed if x["kind"] == "picture"]
    assert len(pics) == 1 and pics[0]["data"]["avatar"] == "bunny" and pics[0]["member"]["name"] == "Alpha"
    pid = pics[0]["id"]
    assert client.post(f"/api/news/{pid}/like", headers=hb).json() == {"likes": 1, "liked": True, "likers": ["Bravo"]}
    client.post(f"/api/news/{pid}/like", headers=ha)
    item = next(x for x in client.get("/api/news", headers=hb).json()["items"] if x["id"] == pid)
    assert item["likes"] == 2 and item["liked"] and item["likers"] == ["Bravo", "Parent"]
    assert client.post(f"/api/news/{pid}/like", headers=hb).json()["liked"] is False  # un-like
    # 1st place in a tournament
    sat = date(2026, 11, 28)
    db.add(Event(day=sat, title="Art Tournament"))
    e1 = EventEntry(event_day=sat, member_id=family["A"].id, title="Sunset", image=b"x")
    e2 = EventEntry(event_day=sat, member_id=family["B"].id, title="Cat", image=b"x")
    db.add_all([e1, e2])
    db.commit()
    assert client.post("/api/events/judge", headers=ha, json={"day": sat.isoformat(), "first": e1.id}).status_code == 200
    client.post("/api/events/judge", headers=ha, json={"day": sat.isoformat(), "first": e2.id, "second": e1.id})
    wins = [x for x in client.get("/api/news", headers=h).json()["items"] if x["kind"] == "win"]
    assert len(wins) == 1 and wins[0]["member"]["name"] == "Bravo" and wins[0]["data"]["entry_id"] == e2.id


def test_weekly_map_grows_by_five_and_starts_again_on_sunday(client, family, db):
    from app.models import DailyClaim
    m = family["A"]
    h = auth(client, m)
    sun = date(2026, 11, 22)
    for i in range(3):  # Sun, Mon, Tue of last... this week: three chests opened already
        db.add(DailyClaim(member_id=m.id, day=sun + timedelta(days=i - 7), gems=5))  # last week's don't count
    db.add(DailyClaim(member_id=m.id, day=sun, gems=5))
    db.add(DailyClaim(member_id=m.id, day=sun + timedelta(days=1), gems=10))
    db.commit()
    mulk_last_night(db, m)
    a, b = at_today()  # Tuesday
    with a, b:
        put_day(client, h, m, TODAY, ALL)
        prof = client.get("/api/board/profile", headers=h).json()
        w = prof["daily"]
        assert w["step"] == 2 and w["gems"] == 15 and w["available"]
        assert [x["gems"] for x in w["map"]] == [5, 10, 15, 20, 25, 30, 35]
        assert [x["done"] for x in w["map"]][:3] == [True, True, False]
        after = client.post("/api/board/claim", headers=h).json()
        assert after["gems"]["balance"] == prof["gems"]["balance"] + 15 and after["daily"]["step"] == 3
    a, b = at_today(date(2026, 11, 29))  # next Sunday: a new map
    with a, b:
        w = client.get("/api/board/profile", headers=h).json()["daily"]
        assert w["step"] == 0 and w["gems"] == 5


def test_no_separate_gems_for_finishing_the_day_from_the_27th(client, family, db):
    from app.progress import gems_earned
    from app.services import get_settings_row, progress_for
    m = family["A"]
    mulk_last_night(db, m, date(2026, 11, 26))
    h = auth(client, m)
    for d in (date(2026, 11, 26), date(2026, 11, 27)):
        a, b = at_today(d)
        with a, b:
            assert put_day(client, h, m, d, ALL).status_code == 200
    cfg = get_settings_row(db)
    p = progress_for(db, cfg, [m], date(2026, 11, 27))[m.id]
    assert p.gems_tasks == 25  # 5 for Mulk on the 25th (old rate), 20 for the 26th; the 27th pays nothing extra: the map is the reward
    assert gems_earned(p) >= 20


def test_northern_lights_theme_is_won_by_centurion(client, family):
    h = auth(client, family["A"])
    themes = {x["key"]: x for x in client.get("/api/board/profile", headers=h).json()["themes"]}
    assert {"lavender", "sunset", "northern"} <= set(themes)
    assert themes["lavender"]["price"] == 600 and themes["sunset"]["price"] == 650
    n = themes["northern"]
    assert not n["available"] and n["unlock"]["key"] == "days100"
    assert client.post("/api/board/shop/buy", headers=h, json={"kind": "theme", "key": "northern"}).status_code == 400
    assert client.put("/api/board/profile", headers=h, json={"theme": "northern"}).status_code == 403
    cent = next(a for a in client.get("/api/board/achievements", headers=h).json()["items"] if a["key"] == "days100")
    assert cent["theme"] == {"key": "northern", "name": "Northern lights"}


def test_launch_gobi_at_the_pillar_once_a_day(client, family, db):
    from app.models import Member
    low = Member(name="Lowe", code="L", base_honor=-1, pin_hash=family["A"].pin_hash, created_at=family["A"].created_at)
    db.add(low)
    db.commit()
    h, hl = auth(client, family["B"]), auth(client, low)
    a, b = at_today()
    with a, b:
        row = next(r for r in client.get("/api/board/leaderboard", headers=h).json()["rows"] if r["member"]["id"] == low.id)
        assert row["can_gobi"] and not row["gobi_hit"]
        before = client.get("/api/board/profile", headers=h).json()["gems"]["balance"]
        r = client.post(f"/api/board/gobi/{low.id}", headers=h)
        assert r.status_code == 200 and r.json()["profile"]["gems"]["balance"] == before + 10
        assert client.post(f"/api/board/gobi/{low.id}", headers=h).status_code == 400  # once a day
        rows = client.get("/api/board/leaderboard", headers=h).json()["rows"]
        assert next(r for r in rows if r["member"]["id"] == low.id)["gobi_hit"]
        assert not any(r["can_gobi"] for r in rows)
        assert client.get("/api/board/profile", headers=hl).json()["gobi_today"] == ["Bravo"]
        assert client.get("/api/board/profile", headers=hl).json()["gobi_splat"] == ["Bravo"]
        client.post("/api/board/gobi-seen", headers=hl)
        assert client.get("/api/board/profile", headers=hl).json()["gobi_splat"] == []
        assert client.post(f"/api/board/gobi/{family['A'].id}", headers=auth(client, family["S"])).status_code == 400  # not on the Pillar


def test_deploy_shaytan_and_what_follows(client, family, db):
    h, ha, hb = auth(client, family["A"]), auth(client, admin=True), auth(client, family["B"])
    assert client.post("/api/tests/shaytan", headers=h, json={"member_id": family["A"].id}).status_code == 403
    t = client.post("/api/tests/shaytan", headers=ha, json={"member_id": family["A"].id}).json()
    assert client.post("/api/tests/shaytan", headers=ha, json={"member_id": family["A"].id}).status_code == 400  # one at a time
    a, b = at_today()
    with a, b:
        prof = client.get("/api/board/profile", headers=h).json()
        assert prof["shaytan"] == {"id": t["id"], "show": "offer", "offer": 50, "ladder": [50, 100, 500]}
        assert client.post(f"/api/tests/{t['id']}/answer", headers=hb, json={"accept": True}).status_code == 403
        before = prof["level"]
        assert client.post(f"/api/tests/{t['id']}/answer", headers=h, json={"accept": True, "refusals": 1}).json() == {"answer": "yes"}
        assert client.get("/api/board/profile", headers=h).json()["gems"]["balance"] == prof["gems"]["balance"]  # no gems: he lied
        assert client.post(f"/api/tests/{t['id']}/reward", headers=ha, json={"gems": 10}).status_code == 400
        prof = client.get("/api/board/profile", headers=h).json()  # saying yes cut 1 Honor straight away
        assert prof["level"] == before - 1 and prof["shaytan"] == {"id": t["id"], "show": "cut", "levels": 1}
        assert client.post(f"/api/tests/{t['id']}/cut", headers=ha, json={"levels": 2}).json()["cut"] == 3  # and the admin can add more
        prof = client.get("/api/board/profile", headers=h).json()
        assert prof["level"] == before - 3 and prof["shaytan"] == {"id": t["id"], "show": "cut", "levels": 3}
        client.post(f"/api/tests/{t['id']}/seen", headers=h, json={"what": "cut"})
        assert client.get("/api/board/profile", headers=h).json()["shaytan"] is None
        client.post(f"/api/tests/{t['id']}/post", headers=ha)
        assert any(x["kind"] == "shaytan" for x in client.get("/api/news", headers=hb).json()["items"])
        # Bravo refuses and gets a reward
        t2 = client.post("/api/tests/shaytan", headers=ha, json={"member_id": family["B"].id, "offer": 100}).json()
        client.post(f"/api/tests/{t2['id']}/answer", headers=hb, json={"accept": False})
        beat = next(x for x in client.get("/api/board/achievements", headers=hb).json()["items"] if x["key"] == "shaytan")
        assert beat["unlocked"] and beat["gems"] == 30 and beat["tier"] == "bronze"
        nope = next(x for x in client.get("/api/board/achievements", headers=h).json()["items"] if x["key"] == "shaytan")
        assert not nope["unlocked"]  # Alpha said yes
        g = client.get("/api/board/profile", headers=hb).json()["gems"]["balance"]
        client.post(f"/api/tests/{t2['id']}/reward", headers=ha, json={"gems": 30})
        prof = client.get("/api/board/profile", headers=hb).json()
        assert prof["gems"]["balance"] == g + 30 and prof["shaytan"]["show"] == "reward"
        listed = client.get("/api/tests", headers=ha).json()
        assert [x["answer"] for x in listed] == ["no", "yes"]
        assert (listed[0]["refusals"], listed[0]["final_offer"]) == (3, 1000)  # started at 100: turned down 100, 200, 1000
        assert (listed[1]["refusals"], listed[1]["final_offer"]) == (1, 100)  # said no to 50, yes to 100


def test_avatar_reminder_is_sent_by_the_admin(client, family):
    h, ha = auth(client, family["A"]), auth(client, admin=True)
    assert client.get("/api/board/profile", headers=h).json()["avatar_nudge"] is False  # never on its own
    assert client.post(f"/api/admin/members/{family['A'].id}/avatar-nudge", headers=ha).json()["avatar_nudge"] is True
    assert client.get("/api/board/profile", headers=h).json()["avatar_nudge"] is True
    client.post("/api/board/profile/avatar-nudge-seen", headers=h)
    assert client.get("/api/board/profile", headers=h).json()["avatar_nudge"] is False
    assert client.post(f"/api/admin/members/{family['A'].id}/avatar-nudge", headers=h).status_code == 403


def test_new_likes_on_my_picture_since_last_visit(client, family):
    h, hb, hc, ha = auth(client, family["A"]), auth(client, family["B"]), auth(client, family["S"]), auth(client, admin=True)
    assert client.get("/api/board/profile", headers=h).json()["new_likes"] is None  # starts counting now
    a, b = at_today()
    with a, b:
        client.post("/api/board/oath", headers=h, json={"words": "I swear"})
        client.put("/api/board/profile", headers=h, json={"avatar": "cat"})
    pid = next(x for x in client.get("/api/news", headers=h).json()["items"] if x["kind"] == "picture")["id"]
    client.post(f"/api/news/{pid}/like", headers=h)  # own like doesn't count
    for x in (hb, hc, ha):
        client.post(f"/api/news/{pid}/like", headers=x)
    nl = client.get("/api/board/profile", headers=h).json()["new_likes"]
    assert nl["count"] == 3 and nl["names"] == ["Parent", "Sierra"] and "picture" in nl["what"]
    client.post("/api/board/profile/likes-seen", headers=h)
    assert client.get("/api/board/profile", headers=h).json()["new_likes"] is None


def test_help_sends_feature_requests_and_bugs_to_the_admin(client, family):
    h, ha = auth(client, family["A"]), auth(client, admin=True)
    assert client.post("/api/feedback", headers=h, json={"kind": "feature", "text": "A pet to look after", "page": "/profile"}).status_code == 201
    assert client.post("/api/feedback", headers=h, json={"kind": "bug", "text": "The map didn't open"}).status_code == 201
    assert client.post("/api/feedback", headers=h, json={"kind": "spam", "text": "hello"}).status_code == 422
    assert client.get("/api/feedback", headers=h).status_code == 403  # only the admin reads them
    box = client.get("/api/feedback", headers=ha).json()
    assert box["unread"] == 2 and box["items"][0]["kind"] == "bug" and box["items"][1]["name"] == "Alpha"
    client.post("/api/feedback/read", headers=ha)
    assert client.get("/api/feedback/unread", headers=ha).json()["unread"] == 0
    fid = box["items"][0]["id"]
    assert client.patch(f"/api/feedback/{fid}", headers=ha, json={"done": True}).json()["done"] is True
    client.delete(f"/api/feedback/{fid}", headers=ha)
    assert len(client.get("/api/feedback", headers=ha).json()["items"]) == 1


def test_collecting_achievements_posts_to_community_except_the_oath(client, family, db):
    from app.models import AchievementClaim
    h, hb = auth(client, family["A"]), auth(client, family["B"])
    a, b = at_today()
    with a, b:
        client.post("/api/board/oath", headers=h, json={"words": "I swear"})
        assert client.post("/api/board/achievements/oath/claim", headers=h).status_code == 200
        assert not [x for x in client.get("/api/news", headers=hb).json()["items"] if x["kind"] == "achievement"]
        put_day(client, h, family["A"], TODAY, ALL)
        ready = [x["key"] for x in client.get("/api/board/achievements", headers=h).json()["items"] if x["unlocked"] and not x["claimed"]]
        assert ready
        for k in ready:
            client.post(f"/api/board/achievements/{k}/claim", headers=h)
    posts = [x for x in client.get("/api/news", headers=hb).json()["items"] if x["kind"] == "achievement"]
    assert len(posts) == 1 and len(posts[0]["data"]["items"]) == len(ready)  # one post for "Collect all"
    assert posts[0]["member"]["name"] == "Alpha" and "oath" not in [i["key"] for i in posts[0]["data"]["items"]]


def test_man_in_the_cloak_gives_back_more_or_reveals_shaytan(client, family):
    h, hb, ha = auth(client, family["A"]), auth(client, family["B"]), auth(client, admin=True)
    for x in (family["A"], family["B"]):
        client.post(f"/api/admin/members/{x.id}/gems", headers=ha, json={"balance": 30})
    t = client.post("/api/tests/charity", headers=ha, json={"member_id": family["A"].id, "ask": 20, "give_back": 50}).json()
    assert client.post("/api/tests/charity", headers=ha, json={"member_id": family["A"].id}).status_code == 400  # one at a time
    assert client.get("/api/board/profile", headers=h).json()["charity"] == {"id": t["id"], "ask": 20}
    assert client.post(f"/api/tests/charity/{t['id']}/answer", headers=hb, json={"give": True}).status_code == 403
    r = client.post(f"/api/tests/charity/{t['id']}/answer", headers=h, json={"give": True}).json()
    assert r == {"answer": "give", "given": 20, "give_back": 50}
    p = client.get("/api/board/profile", headers=h).json()
    assert p["charity"] is None and p["gems"]["balance"] == 60  # 30 − 20 + 50
    ach = next(x for x in client.get("/api/board/achievements", headers=h).json()["items"] if x["key"] == "sadaqah")
    assert ach["unlocked"] and ach["tier"] == "silver" and ach["gems"] == 40
    # Get lost: nothing changes, no achievement
    t2 = client.post("/api/tests/charity", headers=ha, json={"member_id": family["B"].id, "ask": 100, "give_back": 10}).json()
    assert client.post(f"/api/tests/charity/{t2['id']}/answer", headers=hb, json={"give": False}).json()["answer"] == "refuse"
    assert client.get("/api/board/profile", headers=hb).json()["gems"]["balance"] == 30
    assert not next(x for x in client.get("/api/board/achievements", headers=hb).json()["items"] if x["key"] == "sadaqah")["unlocked"]
    assert [x["answer"] for x in client.get("/api/tests/charity", headers=ha).json()] == ["refuse", "give"]


def test_carrier_pigeon_brings_a_note_and_gems_once(client, family):
    h, hb, ha = auth(client, family["A"]), auth(client, family["B"]), auth(client, admin=True)
    t = client.post("/api/tests/pigeon", headers=ha, json={"member_id": family["A"].id, "gems": 75, "sender": "Mum"}).json()
    assert t["sender"] == "Mum" and t["opened_at"] is None
    before = client.get("/api/board/profile", headers=h).json()
    assert before["pigeon"] == {"id": t["id"], "sender": "Mum", "gems": 75, "message": ""}
    assert client.post(f"/api/tests/pigeon/{t['id']}/open", headers=hb).status_code == 403
    assert client.post(f"/api/tests/pigeon/{t['id']}/open", headers=h).json() == {"gems": 75}
    assert client.post(f"/api/tests/pigeon/{t['id']}/open", headers=h).json() == {"gems": 0}  # once
    after = client.get("/api/board/profile", headers=h).json()
    assert after["pigeon"] is None and after["gems"]["balance"] == before["gems"]["balance"] + 75
    t2 = client.post("/api/tests/pigeon", headers=ha, json={"member_id": family["B"].id}).json()
    assert t2["sender"] == "Parent" and t2["gems"] == 50  # from the admin by default


def test_rude_kid_gobi_costs_gems_and_kindness_earns_gentle_heart(client, family):
    h, hb, ha = auth(client, family["A"]), auth(client, family["B"]), auth(client, admin=True)
    client.post(f"/api/admin/members/{family['A'].id}/gems", headers=ha, json={"balance": 30})
    client.post(f"/api/admin/members/{family['B'].id}/gems", headers=ha, json={"balance": 10})
    ta = client.post("/api/tests/bully", headers=ha, json={"member_id": family["A"].id}).json()
    tb = client.post("/api/tests/bully", headers=ha, json={"member_id": family["B"].id}).json()
    assert client.get("/api/board/profile", headers=h).json()["bully"] == {"id": ta["id"], "price": 25, "tell_price": 100, "elder": ""}
    assert client.post(f"/api/tests/bully/{tb['id']}/answer", headers=hb, json={"choice": "gobi"}).status_code == 400  # only 10 gems
    assert client.post(f"/api/tests/bully/{ta['id']}/answer", headers=h, json={"choice": "gobi"}).json() == {"answer": "gobi", "paid": 25}
    assert client.get("/api/board/profile", headers=h).json()["gems"]["balance"] == 5
    assert client.post(f"/api/tests/bully/{tb['id']}/answer", headers=hb, json={"choice": "kind"}).json()["answer"] == "kind"
    gentle = lambda hh: next(x for x in client.get("/api/board/achievements", headers=hh).json()["items"] if x["key"] == "kindness")
    assert gentle(hb)["unlocked"] and gentle(hb)["tier"] == "silver" and not gentle(h)["unlocked"]


def test_owl_quiz_one_try_per_question_and_gems_for_right_answers(client, family):
    h, ha = auth(client, family["A"]), auth(client, admin=True)
    qs = [{"q": "How many surahs are in the Quran?", "options": ["114", "100", "99"], "answer": 0},
          {"q": "First surah?", "options": ["Al-Baqarah", "Al-Fatihah"], "answer": 1},
          {"q": "Dua before eating?", "options": ["Bismillah", "Alhamdulillah"], "answer": 0}]
    assert client.post("/api/tests/quiz", headers=ha, json={"member_id": family["A"].id, "questions": [{"q": "x", "options": ["a", ""], "answer": 0}]}).status_code == 400
    t = client.post("/api/tests/quiz", headers=ha, json={"member_id": family["A"].id, "questions": qs, "gems_each": 10}).json()
    b0 = client.get("/api/board/profile", headers=h).json()
    assert "answer" not in b0["quiz"]["questions"][0]  # no peeking
    assert client.post(f"/api/tests/quiz/{t['id']}/answer", headers=h, json={"index": 0, "choice": 0}).json()["right"] is True
    assert client.post(f"/api/tests/quiz/{t['id']}/answer", headers=h, json={"index": 0, "choice": 1}).status_code == 400  # one try
    r = client.post(f"/api/tests/quiz/{t['id']}/answer", headers=h, json={"index": 1, "choice": 0}).json()
    assert r["right"] is False and r["answer"] == 1 and not r["done"]
    assert client.get("/api/board/profile", headers=h).json()["quiz"]["questions"][1]["answer"] == 1  # shown once answered
    r = client.post(f"/api/tests/quiz/{t['id']}/answer", headers=h, json={"index": 2, "choice": 0}).json()
    assert r["done"] and r["score"] == 2
    p = client.get("/api/board/profile", headers=h).json()
    assert p["quiz"] is None and p["gems"]["balance"] == b0["gems"]["balance"] + 20
    assert client.get("/api/tests/quiz", headers=ha).json()[0]["right"] == 2


def test_thirsty_kitten_secret_mercy_unlocks_pharaoh_cat(client, family):
    h, hb, ha = auth(client, family["A"]), auth(client, family["B"]), auth(client, admin=True)
    client.post(f"/api/admin/members/{family['A'].id}/gems", headers=ha, json={"balance": 80})
    mercy = lambda hh: next(x for x in client.get("/api/board/achievements", headers=hh).json()["items"] if x["key"] == "mercy")
    pharaoh = lambda hh: next(x for x in client.get("/api/board/profile", headers=hh).json()["avatars"] if x["key"] == "pharaohcat")
    assert mercy(h)["name"] == "???" and mercy(h)["secret"] and pharaoh(h)["unlock"]["name"] == "???" and not pharaoh(h)["available"]
    ta = client.post("/api/tests/kitten", headers=ha, json={"member_id": family["A"].id}).json()
    tb = client.post("/api/tests/kitten", headers=ha, json={"member_id": family["B"].id}).json()
    assert client.get("/api/board/profile", headers=h).json()["kitten"] == {"id": ta["id"]}
    assert client.post(f"/api/tests/kitten/{ta['id']}/answer", headers=h, json={"water": True}).json() == {"answer": "water", "gems": 80}
    assert client.get("/api/board/profile", headers=h).json()["gems"]["balance"] == 80  # every gem given back
    m = mercy(h)
    assert m["unlocked"] and m["name"] == "Mercy to All Creatures" and m["tier"] == "gold" and not m["secret"]
    assert pharaoh(h)["available"] and pharaoh(h)["unlock"]["name"] == "Mercy to All Creatures"
    client.post(f"/api/tests/kitten/{tb['id']}/answer", headers=hb, json={"water": False})
    assert not mercy(hb)["unlocked"] and not pharaoh(hb)["available"]


def test_left_the_kitten_post_gets_reactions_not_likes(client, family):
    h, hb, ha = auth(client, family["A"]), auth(client, family["B"]), auth(client, admin=True)
    t = client.post("/api/tests/kitten", headers=ha, json={"member_id": family["A"].id}).json()
    assert client.post(f"/api/tests/kitten/{t['id']}/post", headers=ha).status_code == 400  # not answered yet
    client.post(f"/api/tests/kitten/{t['id']}/answer", headers=h, json={"water": False})
    assert client.post(f"/api/tests/kitten/{t['id']}/post", headers=ha).json()["posted"] is True
    assert client.post(f"/api/tests/kitten/{t['id']}/post", headers=ha).status_code == 400  # once
    post = next(x for x in client.get("/api/news", headers=hb).json()["items"] if x["kind"] == "kitten")
    assert "left the kitten" in post["title"] and post["reactions"] == {"👎": 0, "😤": 0, "😠": 0}
    assert client.post(f"/api/news/{post['id']}/like", headers=hb).status_code == 400  # no ❤️ here
    r = client.post(f"/api/news/{post['id']}/like", headers=hb, json={"reaction": "😤"}).json()
    assert r["reactions"]["😤"] == 1 and r["my_reaction"] == "😤"
    r = client.post(f"/api/news/{post['id']}/like", headers=hb, json={"reaction": "👎"}).json()  # switch
    assert r["reactions"] == {"👎": 1, "😤": 0, "😠": 0}
    client.post(f"/api/news/{post['id']}/like", headers=ha, json={"reaction": "😠"})
    assert client.post(f"/api/news/{post['id']}/like", headers=hb, json={"reaction": "👎"}).json()["my_reaction"] == ""  # take back
    assert client.get("/api/board/profile", headers=h).json()["new_likes"] is None  # no "people liked your post" pop-up


def test_rude_kid_tell_a_grown_up_needs_100_and_gives_it_back(client, family):
    h, ha = auth(client, family["A"]), auth(client, admin=True)
    client.post(f"/api/admin/members/{family['A'].id}/gems", headers=ha, json={"balance": 99})
    t = client.post("/api/tests/bully", headers=ha, json={"member_id": family["A"].id, "elder": "Grandpa"}).json()
    assert client.get("/api/board/profile", headers=h).json()["bully"]["elder"] == "Grandpa"
    assert client.post(f"/api/tests/bully/{t['id']}/answer", headers=h, json={"choice": "tell"}).status_code == 400
    client.post(f"/api/admin/members/{family['A'].id}/gems", headers=ha, json={"balance": 120})
    assert client.post(f"/api/tests/bully/{t['id']}/answer", headers=h, json={"choice": "tell"}).json() == {"answer": "tell", "paid": 0}
    assert client.get("/api/board/profile", headers=h).json()["gems"]["balance"] == 120
