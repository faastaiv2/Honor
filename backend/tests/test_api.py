from datetime import date, timedelta
from unittest.mock import patch

from app import scoring
from app.models import DayLog
from tests.conftest import auth

TODAY = date(2026, 11, 24)
ALL = sorted(set(scoring.REQUIRED) | {"gate", "bonus"})


def at_today():
    return patch("app.routers.board.today_for", return_value=TODAY), patch("app.services.today_for", return_value=TODAY)


def test_health_and_unknown_api(client):
    assert client.get("/api/health").json()["status"] == "ok"
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
    alpha = next(r for r in board if r["member"]["name"] == "Alpha")
    # base 10, +2 today; 22 and 23 Nov were empty weekdays: -1 each
    assert alpha["honor"] == 10 + 2 - 2
    assert board[0]["member"]["name"] == "Sierra" and board[0]["rank"] == 1


def test_member_cannot_mark_others_or_old_days(client, family):
    h = auth(client, family["A"])
    a, b = at_today()
    with a, b:
        other = client.put("/api/board/day", headers=h, json={"member_id": family["B"].id, "date": TODAY.isoformat(), "tasks": []})
        assert other.status_code == 403
        old = client.put("/api/board/day", headers=h, json={"member_id": family["A"].id,
                                                             "date": (TODAY - timedelta(days=2)).isoformat(), "tasks": []})
        assert old.status_code == 403
        yest = client.put("/api/board/day", headers=h, json={"member_id": family["A"].id,
                                                              "date": (TODAY - timedelta(days=1)).isoformat(), "tasks": []})
        assert yest.status_code == 200
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
        before = {r["member"]["name"]: r["honor"] for r in client.get("/api/board/leaderboard", headers=ha).json()}
        client.post("/api/admin/adjustments", headers=ha, json={"member_id": family["B"].id, "delta": 3})
        after = {r["member"]["name"]: r["honor"] for r in client.get("/api/board/leaderboard", headers=ha).json()}
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
