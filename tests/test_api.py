from datetime import date, timedelta
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


def test_member_marks_own_day_and_scores(client, family):
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
    # base 10, +2 today; 22 and 23 Nov were empty weekdays: -1 each
    assert alpha["level"] == 10 + 2 - 2 and alpha["label"] == "X" and alpha["is_me"]
    assert alpha["tier"]["name"] == "Great Honor" and alpha["week_delta"] == 0
    assert rows[0]["member"]["name"] == "Sierra" and rows[0]["rank"] == 1
    assert board["week"] == {"number": 5, "start": "2026-11-22", "days_left": 4}
    assert board["weekly"][0]["member_id"] == family["A"].id


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
    m = Member(name="Zulu", code="Zu", base_honor=2, pin_hash=family["A"].pin_hash)
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
    m = Member(name="Delta", code="D", base_honor=48, pin_hash=family["A"].pin_hash)
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
        assert me["tier"]["key"] == "diamond" and me["can_start_quest"]
        q = client.post("/api/board/quest", headers=h, json={"member_id": m.id}).json()
        assert q["level"] == 1 and q["quest"]["active"] and q["tier"]["key"] == "honor"
        assert client.post("/api/board/quest", headers=h, json={"member_id": m.id}).status_code == 400


def test_avatar(client, family):
    h = auth(client, family["A"])
    assert client.put("/api/board/avatar", headers=h, json={"avatar": "🦁"}).json() == {"avatar": "🦁"}
    assert client.put("/api/board/avatar", headers=h, json={"avatar": "<b>"}).status_code == 400
    assert client.put("/api/board/avatar", headers=auth(client, admin=True), json={"avatar": "🦁"}).status_code == 400


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
