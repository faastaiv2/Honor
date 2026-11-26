"""Every rank's make-up benefit, end to end through the API, the way a member uses it:
miss tasks on a day, go back to that day later and tick them."""
from datetime import date, timedelta

import pytest

from app import scoring
from app.models import DayLog, Member
from app.tiers import BY_KEY
from tests.test_api import ALL, at_today, auth, put_day

SUN = date(2026, 11, 22)  # scoring starts (fixture); a Sunday
MON, TUE, WED, THU, FRI, SAT = (SUN + timedelta(days=i) for i in range(1, 7))
TASKS = [k for k in sorted(scoring.REQUIRED) if k not in ("mulk",)]


def _member(db, family, base, missed_day, missing):
    """A member with every day full, except `missing` tasks left unticked on `missed_day`."""
    m = Member(name=f"T{base}{missed_day.day}{missing}", code="T", base_honor=base, pin_hash=family["A"].pin_hash,
               created_at=family["A"].created_at, oath_at=family["A"].created_at)
    db.add(m)
    db.flush()
    for i in range(-1, 7):
        d = SUN + timedelta(days=i)
        tasks = list(ALL)
        if d == missed_day:
            tasks = [k for k in tasks if k not in TASKS[:missing] and k != "bonus"]
        db.add(DayLog(member_id=m.id, day=d, tasks=tasks, excuse="", late={}))
    db.commit()
    return m


def _wipe_after(db, m, d):
    """Days after `d` haven't happened yet."""
    for log in db.query(DayLog).filter(DayLog.member_id == m.id, DayLog.day > d):
        db.delete(log)
    db.commit()


def _tier(client, h, m, d):
    a, b = at_today(d)
    with a, b:
        return client.get(f"/api/board/day?member_id={m.id}", headers=h).json()["status"]["tier"]["key"]


def _make_up(client, h, m, day, on, keys):
    a, b = at_today(on)
    with a, b:
        log_tasks = [k for k in ALL if k not in TASKS[:len(TASKS)] or True]
        view = client.get(f"/api/board/day?member_id={m.id}&date={day}", headers=h).json()
        done = [t["key"] for g in view["groups"] for t in g["tasks"] if t["done"]] + ["gate"]
        return put_day(client, h, m, day, done + keys)


BASE = {"bronze": 1, "silver": 4, "gold": 8, "platinum": 13, "emerald": 19, "sapphire": 25, "ruby": 32, "diamond": 40,
        "obsidian": 47}


def _setup(client, db, family, rank, missed_day, missing, today):
    m = _member(db, family, BASE[rank], missed_day, missing)
    _wipe_after(db, m, today - timedelta(days=1))
    h = auth(client, m)
    for _ in range(12):  # settle the starting level so the member is in `rank` on `today`
        got = _tier(client, h, m, today)
        if got == rank:
            break
        order = list(BASE)
        m.base_honor += 1 if order.index(got) < order.index(rank) else -1
        db.commit()
    assert _tier(client, h, m, today) == rank
    return m, h


@pytest.mark.parametrize("rank", list(BASE))
def test_next_day_allowance_matches_the_benefit(client, family, db, rank):
    n = BY_KEY[rank].next_day
    m, h = _setup(client, db, family, rank, MON, n + 1, TUE)
    missing = TASKS[:n + 1]
    if n == 0:
        r = _make_up(client, h, m, MON, TUE, missing[:1])
        assert r.status_code == 403, f"{rank} should not make up"
        return
    assert _make_up(client, h, m, MON, TUE, missing[:n]).status_code == 200, f"{rank}: {n} next day"
    r = _make_up(client, h, m, MON, TUE, missing[:n + 1])
    assert r.status_code == 403, f"{rank}: {n + 1} is one too many"


@pytest.mark.parametrize("rank", ["silver", "gold", "platinum", "sapphire", "diamond", "obsidian"])
def test_two_days_late_is_refused(client, family, db, rank):
    m, h = _setup(client, db, family, rank, MON, 1, WED)
    assert _make_up(client, h, m, MON, WED, TASKS[:1]).status_code == 403


@pytest.mark.parametrize("rank,ok", [("silver", False), ("gold", False), ("platinum", True), ("emerald", True),
                                     ("sapphire", True), ("ruby", True), ("diamond", True), ("obsidian", True)])
def test_thursday_made_up_on_saturday(client, family, db, rank, ok):
    m, h = _setup(client, db, family, rank, THU, 1, SAT)
    assert (_make_up(client, h, m, THU, SAT, TASKS[:1]).status_code == 200) is ok


@pytest.mark.parametrize("rank,ok", [("platinum", False), ("ruby", False), ("diamond", True), ("obsidian", True)])
def test_wednesday_made_up_on_friday(client, family, db, rank, ok):
    m, h = _setup(client, db, family, rank, WED, 1, FRI)
    assert (_make_up(client, h, m, WED, FRI, TASKS[:1]).status_code == 200) is ok


def test_obsidian_two_on_wednesday(client, family, db):
    m, h = _setup(client, db, family, "obsidian", WED, 3, FRI)
    assert _make_up(client, h, m, WED, FRI, TASKS[:2]).status_code == 200
    assert _make_up(client, h, m, WED, FRI, TASKS[:3]).status_code == 403


def test_making_up_wins_back_the_honor(client, family, db):
    m, h = _setup(client, db, family, "silver", MON, 1, TUE)
    a, b = at_today(TUE)
    with a, b:
        before = client.get("/api/board/profile", headers=h).json()["level"]
    assert _make_up(client, h, m, MON, TUE, TASKS[:1]).status_code == 200
    with a, b:
        after = client.get("/api/board/profile", headers=h).json()["level"]
    assert after > before, "a made-up day should count as a full day"
