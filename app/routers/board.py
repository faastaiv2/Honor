import random
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import scoring
from app.db import get_db
from app.deps import Viewer, current_viewer
from app.makeup import check_week, remaining, week_start
from app.models import Admin, Announcement, GemTake, PostLike, GobiLaunch, AchievementClaim, DailyClaim, DayLog, Member, Purchase
from app.achievements import BY_KEY as ACHIEVEMENT_BY_KEY, Facts, evaluate as evaluate_achievements
from app.progress import Progress, gems_earned
from app.routers.events import placings, unseen_win
from app.services import (achievement_gems, active_members, clock_for, chests_opened, load_periods, can_start_quest, gems_claimed, gems_granted, gems_spent, get_settings_row, load_tasks, logs_between,
                          member_start, owned_items, progress_for, tier_of_progress, today_for, week_info)
from app.tiers import (THEME_UNLOCKS, WEEKLY_MAP, PICTURE_UNLOCKS, shown_look, CAP_WITHOUT_LEGENDARY, FRAME_KEYS, GEMS_FOR_FULL_DAY, GEMS_PER_LEVEL, GEMS_PER_TASK, RANK_GEMS, THEME_KEYS,
                       FREE_AVATARS, TIERS, catalogue, item_available, next_tier, price_of, roman, shop_key, tier_dict,
                       tier_for)

router = APIRouter(prefix="/board", tags=["board"])

AVATARS = FREE_AVATARS


class DayUpdate(BaseModel):
    member_id: str
    date: date
    tasks: list[str] = Field(default_factory=list, max_length=40)
    excuse: str = Field(default="", max_length=120)
    task_excuses: dict[str, str] | None = None  # task -> reason; None keeps what is saved


class AvatarIn(BaseModel):
    avatar: str = Field(max_length=16)


class ProfileIn(BaseModel):
    avatar: str | None = Field(default=None, max_length=16)
    frame: str | None = Field(default=None, max_length=16)
    theme: str | None = Field(default=None, max_length=16)


class BuyIn(BaseModel):
    kind: str = Field(pattern="^(frame|theme|avatar)$")
    key: str = Field(max_length=16)


class QuestIn(BaseModel):
    member_id: str


def _score_out(s: scoring.DayScore) -> dict:
    return {"gain": s.gain, "bonus": s.bonus, "cut": s.cut, "delta": s.delta, "done": s.done, "of": s.of,
            "weekend": s.weekend, "excused": s.excused}


def _level_label(p: Progress) -> str:
    """The level in Roman numerals; a + marks a member on the Legendary quest (e.g. +III)."""
    if p.legendary:
        return "L"
    return ("+" if p.quest_start is not None else "") + roman(p.level)


def _status(p: Progress) -> dict:
    t = tier_of_progress(p)
    nx = None if p.legendary else next_tier(t)
    if nx and nx.key == "legendary":
        nx = None  # Legendary is only reached through the quest
    return {
        "level": p.level, "label": _level_label(p), "tier": tier_dict(t), "legendary": p.legendary,
        "pending": p.pending,
        "banned": p.banned, "quest": {"active": p.quest_start is not None,
                                      "start": p.quest_start.isoformat() if p.quest_start else None,
                                      "days": p.quest_days,
                                      "broken_on": p.quest_broken_on.isoformat() if p.quest_broken_on else None},
        "can_start_quest": can_start_quest(p),
        "next": {"emoji": nx.emoji, "name": nx.name, "needed": nx.min - p.level} if nx else None,
    }


def _member_or_404(db: Session, member_id: str) -> Member:
    m = db.get(Member, member_id)
    if not m or not m.active:
        raise HTTPException(404, "Member not found")
    return m


@router.get("/today")
def today_info(v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    cfg = get_settings_row(db)
    t = today_for(cfg)
    i = scoring.day_index(t, cfg.score_from)
    count, dhikr = scoring.bonus_parts(i)
    return {
        "today": t.isoformat(), "day_number": max(1, (t - cfg.score_from).days + 1), "weekend": scoring.is_weekend(t),
        "week": week_info(t, cfg.score_from),
        "bonus": {"count": count, "dhikr": dhikr},
        "rules": {"cut_misses": cfg.cut_misses, "score_from": cfg.score_from.isoformat(), "timezone": cfg.timezone},
        "tiers": [tier_dict(x) for x in TIERS],
        "task_count": len(load_tasks(db)),
        "avatars": AVATARS,
        "viewer": {"kind": v.kind, "id": v.id, "name": v.name, "is_admin": v.is_admin,
                   "theme": _theme_of(db.get(Member, v.id)) if v.kind == "member" else _admin_theme(db, v)},
        "gems": {"per_task": GEMS_PER_TASK, "full_day": GEMS_FOR_FULL_DAY, "per_level": GEMS_PER_LEVEL, "per_rank": RANK_GEMS},
    }


def _week_lates(db: Session, member_id: str, d: date) -> dict[date, dict]:
    start = week_start(d)
    logs = logs_between(db, start, start + timedelta(days=6), member_id)
    return {day: dict(l.late or {}) for (_, day), l in logs.items()}


def _ampm(hhmm: str) -> str:
    h, m = (int(x) for x in hhmm.split(":"))
    return f"{(h % 12) or 12}:{m:02d} {'AM' if h < 12 else 'PM'}"


def _prev_ticks(db: Session, member_id: str, d: date) -> list:
    prev = db.scalar(select(DayLog).where(DayLog.member_id == member_id, DayLog.day == d - timedelta(days=1)))
    return list(prev.tasks) if prev else []


def _day_view(db: Session, member: Member, d: date, v: Viewer) -> dict:
    cfg = get_settings_row(db)
    today = today_for(cfg)
    p = progress_for(db, cfg, [member], today)[member.id]
    tier = tier_of_progress(p)
    log = db.scalar(select(DayLog).where(DayLog.member_id == member.id, DayLog.day == d))
    done = set(log.tasks if log else [])
    skip = dict(log.task_excuses or {}) if log else {}
    periods = [x for x in scoring.for_member(load_periods(db), member.id) if x.start <= d <= x.end]
    late = dict(log.late or {}) if log else {}
    excuse = log.excuse if log else ""
    i = scoring.day_index(d, cfg.score_from)
    groups: dict[str, list] = {}
    specs = scoring.day_plan(load_tasks(db), periods, d)
    first = member_start(cfg, member)
    counted = scoring.credited(done, _prev_ticks(db, member.id, d), specs, first_day=d == first)
    for t in specs:
        item = {"key": t.key, "label": t.label_on(d), "done": t.key in done, "fitness": t.fitness, "late": t.key in late,
                "excused": skip.get(t.key)}
        if t.not_before:
            item["not_before"] = _ampm(t.not_before)
        if t.link_on(d):
            item["link"] = t.link_on(d)
            item["watched"] = t.key in set(log.watched or []) if log else False
        if t.next_day:  # ticked tonight for tomorrow; today got last night's
            item |= {"next_day": True, "counted_today": t.key in counted}
        groups.setdefault(t.group, []).append(item)
    count, dhikr = scoring.bonus_parts(i)
    s = scoring.score_day(d, counted, excuse, today, cfg.cut_misses, specs, skip)
    own = v.is_admin or v.id == member.id
    left = remaining(tier, d, today, _week_lates(db, member.id, d)) if d < today else 0
    if v.is_admin:
        mode = "admin" if d <= today else "locked"
    elif d < cfg.score_from:
        mode = "preview"  # the admin hasn't started the program yet: look, don't tick
    elif not own or d > today:
        mode = "locked"
    elif d == today:
        mode = "open"
    else:
        mode = "makeup" if (left > 0 or late) else "locked"
    return {
        "member": {"id": member.id, "name": member.name},
        "date": d.isoformat(), "today": today.isoformat(), "weekend": scoring.is_weekend(d),
        "pledge": None if scoring.is_weekend(d) else
        {"key": "gate", "label": scoring.task_label("gate", i), "done": "gate" in done, "late": False},
        "groups": [{"name": g, "tasks": ts} for g, ts in groups.items()],
        "bonus": {"key": "bonus", "count": count, "dhikr": dhikr, "done": "bonus" in done},
        "excuse": excuse,
        "task_excuses": skip,
        "gems_today": p.today_tasks_gems if d == today else None,
        "periods": [{"name": x.name, "end": x.end.isoformat()} for x in periods],
        "score": _score_out(s),
        "mode": mode,
        "editable": mode not in ("locked", "preview"),
        "excuse_editable": mode in ("admin", "open"),
        "makeup_left": left,
        "makeup_rule": tier.benefits,
        "before_scoring": d < first,
        "starts": cfg.score_from.isoformat(),
        "status": _status(p),
    }


@router.get("/day")
def get_day(member_id: str, day: date | None = Query(default=None, alias="date"),
            v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    m = _member_or_404(db, member_id)
    return _day_view(db, m, day or today_for(get_settings_row(db)), v)


@router.put("/day")
def save_day(body: DayUpdate, v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    m = _member_or_404(db, body.member_id)
    cfg = get_settings_row(db)
    today = today_for(cfg)
    if not v.is_admin and v.id != m.id:
        raise HTTPException(403, "You can only mark your own tasks")
    if body.date > today:
        raise HTTPException(403, "That day has not started yet")
    if not v.is_admin and body.date < cfg.score_from:
        raise HTTPException(403, f"The program starts on {cfg.score_from:%A %-d %B}. Until then the tasks are a preview")
    specs = scoring.day_plan(load_tasks(db), scoring.for_member(load_periods(db), m.id), body.date)
    tasks = {k for k in body.tasks if k in {"gate", "bonus"} | {t.key for t in specs}}
    log = db.scalar(select(DayLog).where(DayLog.member_id == m.id, DayLog.day == body.date))
    before = set(log.tasks if log else [])
    old_skip = dict(log.task_excuses or {}) if log else {}
    if body.task_excuses is None:
        skip = old_skip
    else:
        skip = {k: r.strip()[:80] for k, r in body.task_excuses.items() if k in {t.key for t in specs} and r.strip()}
        if skip != old_skip and not v.is_admin and body.date < today:
            raise HTTPException(403, "A task can only be excused on the day. Ask a parent")
    tasks -= set(skip)  # an excused task is not ticked
    if not v.is_admin and body.date == today:
        # Some tasks can't be done before a time of day (Asr Sunnat from 12:00). Ticking one early breaks the oath.
        now = clock_for(cfg)
        early = [t for t in specs if t.not_before and t.key in tasks - before and now < t.not_before]
        watched = set(log.watched or []) if log else set()
        unwatched = [t for t in specs if WATCH_RULE and t.link_on(body.date) and t.key in tasks - before and t.key not in watched]
        if unwatched and not early:
            t = unwatched[0]
            m.oath_at = None
            m.oath_note = f"You ticked “{t.label_on(today)}” without opening its video first (▶ Watch)."[:160]
            m.early_ticks = (m.early_ticks or 0) + 1
            db.commit()
            raise HTTPException(409, f"too_early: {m.oath_note}")
        if early:
            t = early[0]
            m.oath_at = None
            m.oath_note = f"You tried to tick “{t.label_on(today)}” before {_ampm(t.not_before)}."[:160]
            m.early_ticks = (m.early_ticks or 0) + 1
            db.commit()
            raise HTTPException(409, f"too_early: {m.oath_note}")
    late = dict(log.late or {}) if log else {}
    excuse = body.excuse.strip()

    if not v.is_admin and body.date < today:
        # Making up a finished day: only within the rank's allowance.
        added, removed = tasks - before, before - tasks
        if removed - set(late):
            raise HTTPException(403, "Tasks ticked on the day cannot be changed afterwards")
        if "bonus" in added:
            raise HTTPException(403, "The bonus cannot be made up: it counts only on its own day")
        if excuse != (log.excuse if log else ""):
            raise HTTPException(403, "An excuse can only be written on the day. Ask a parent")
        for k in removed:
            late.pop(k, None)
        for k in added - {"gate"}:
            late[k] = today.isoformat()
        week = _week_lates(db, m.id, body.date)
        week[body.date] = late
        tier = tier_of_progress(progress_for(db, cfg, [m], today)[m.id])
        problem = check_week(tier, week)
        if problem and added - {"gate"}:
            raise HTTPException(403, problem)
    elif v.is_admin:
        late = {k: d for k, d in late.items() if k in tasks}

    counted = scoring.credited(tasks, _prev_ticks(db, m.id, body.date), specs, first_day=body.date == member_start(cfg, m))
    if "bonus" in tasks and not scoring.score_day(body.date, counted, body.excuse, today, cfg.cut_misses, specs, skip).gain:
        tasks.discard("bonus")  # the bonus opens only once every task is done (and unticks if one is unticked)
    if log is None:
        log = DayLog(member_id=m.id, day=body.date)
        db.add(log)
    done_day = scoring.score_day(body.date, scoring.credited(tasks, _prev_ticks(db, m.id, body.date), specs,
                                                             first_day=body.date == member_start(cfg, m)),
                                 excuse, today, cfg.cut_misses, specs, skip).gain
    if not done_day:
        log.completed_at = None
    elif log.completed_at is None:
        log.completed_at = datetime.now(timezone.utc)  # when the whole day got done (a quiet tie-breaker)
    log.tasks = sorted(tasks)
    log.late = late
    log.task_excuses = skip
    log.excuse = excuse
    log.updated_by = f"{v.kind}:{v.name}"
    db.commit()
    return _day_view(db, m, body.date, v)


@router.get("/leaderboard")
def leaderboard(v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    cfg = get_settings_row(db)
    today = today_for(cfg)
    members = active_members(db)
    prog = progress_for(db, cfg, members, today)
    yesterday = today - timedelta(days=1)
    logs = logs_between(db, yesterday, today)
    all_tasks, all_periods = load_tasks(db), load_periods(db)
    taken_today = set(db.scalars(select(GemTake.victim_id).where(GemTake.taker_id == v.id, GemTake.day == today))) \
        if v.kind == "member" else set()
    gobi_at = db.scalar(select(GobiLaunch.victim_id).where(GobiLaunch.launcher_id == v.id, GobiLaunch.day == today)) \
        if v.kind == "member" else None
    rows = []
    for m in members:
        specs = scoring.day_plan(all_tasks, scoring.for_member(all_periods, m.id), today)
        p = prog[m.id]
        log, prev = logs.get((m.id, today)), logs.get((m.id, yesterday))
        counted = scoring.credited(log.tasks if log else None, prev.tasks if prev else None, specs,
                                   first_day=today == member_start(cfg, m))
        skip = (log.task_excuses or {}) if log else {}
        s = scoring.score_day(today, counted, log.excuse if log else None, today, cfg.cut_misses, specs, skip)
        look = shown_look(m.avatar, m.frame, tier_of_progress(p).key)
        shamed = tier_of_progress(p).key == "low"
        row = {"can_gobi": v.kind == "member" and shamed and m.id != v.id and gobi_at is None,
               "gobi_hit": gobi_at == m.id,
               "member": {"id": m.id, "name": m.name, "avatar": look[0], "frame": look[1]},
               **_status(p), "today": _score_out(s), "week_delta": p.week_delta,
               "is_me": v.kind == "member" and v.id == m.id}
        if v.is_admin:  # parents see why a task was excused
            labels = {t.key: t.label_on(today) for t in specs}
            row["excused_today"] = [{"task": labels.get(k, k), "reason": r} for k, r in skip.items()]
        rows.append(row)
    # Same level? Quietly, whoever finished today's tasks earliest is higher; then more done today; then who
    # finished earliest yesterday. Every member gets their own place.
    never = datetime.max.replace(tzinfo=timezone.utc)

    def done_at(mid: str, d: date) -> datetime:
        log = logs.get((mid, d))
        t = log.completed_at if log else None
        return (t if t.tzinfo else t.replace(tzinfo=timezone.utc)) if t else never

    rows.sort(key=lambda r: (-(10**6 if r["legendary"] else 0) - r["level"], done_at(r["member"]["id"], today),
                             -r["today"]["done"], done_at(r["member"]["id"], yesterday), r["member"]["name"].lower()))
    for i, r in enumerate(rows):
        r["rank"] = i + 1
    weekly = sorted(rows, key=lambda r: (-r["week_delta"], -r["level"], r["member"]["name"].lower()))
    return {"week": week_info(today, cfg.score_from), "rows": rows,
            "weekly": [{"member_id": r["member"]["id"], "week_delta": r["week_delta"]} for r in weekly]}


@router.get("/history")
def history(days: int = Query(default=14, ge=1, le=62), v: Viewer = Depends(current_viewer),
            db: Session = Depends(get_db)) -> dict:
    cfg = get_settings_row(db)
    today = today_for(cfg)
    start = today - timedelta(days=days - 1)
    members = active_members(db)
    prog = progress_for(db, cfg, members, today)
    logs = logs_between(db, start - timedelta(days=1), today)
    dates = list(scoring.date_range(start, today))
    specs = load_tasks(db)
    periods = load_periods(db)
    rows = []
    for m in members:
        cells = []
        first = member_start(cfg, m)
        for d in dates:
            if d < first:
                cells.append({"state": "pre"})
                continue
            log, prev = logs.get((m.id, d)), logs.get((m.id, d - timedelta(days=1)))
            plan = scoring.day_plan(specs, scoring.for_member(periods, m.id), d)
            counted = scoring.credited(log.tasks if log else None, prev.tasks if prev else None, plan, first_day=d == first)
            s = scoring.score_day(d, counted, log.excuse if log else None, today, cfg.cut_misses, plan,
                                  (log.task_excuses or {}) if log else None)
            delta = prog[m.id].history.get(d, s.delta)
            state = "open" if d == today else "pos" if delta > 0 else "neg" if delta < 0 else \
                "rest" if s.weekend else "excused" if s.excused else "zero"
            cells.append({"state": state, "delta": delta, "done": s.done, "of": s.of})
        rows.append({"member": {"id": m.id, "name": m.name}, "cells": cells})
    return {"dates": [{"date": d.isoformat(), "weekend": scoring.is_weekend(d)} for d in dates], "rows": rows}


@router.put("/avatar")
def set_avatar(body: AvatarIn, v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    if v.kind != "member":
        raise HTTPException(400, "Parents set avatars in Admin")
    m = db.get(Member, v.id)
    if body.avatar and (price_of("avatar", body.avatar) is None or shop_key("avatar", body.avatar) not in owned_items(db, m.id)):
        raise HTTPException(400, "Choose one of the avatars shown")
    m.avatar = body.avatar
    db.commit()
    return {"avatar": m.avatar}


_RANK_ORDER = [t.key for t in TIERS]


ADMIN_THEMES = ("white", "dark")


def _admin_theme(db: Session, v: Viewer) -> str:
    a = db.get(Admin, v.id)
    return a.theme if a and a.theme in ADMIN_THEMES else "white"


def _theme_of(m: Member) -> str:
    """The member's theme; White until they pick one (or if theirs no longer exists, like the old Classic)."""
    return m.theme if m.theme in THEME_KEYS else "white"


RAID_GEMS = {-1: (15, 35), -2: (35, 75), -3: (75, 99)}  # gems the goblins steal at each level of the Pillar of Shame


def _goblin_raid(db: Session, m: Member, tier, p) -> None:
    """Falling onto the Pillar of Shame: goblins raid. Each level deeper (−I, −II, −III) brings a new, bigger raid
    (never more gems than the member has). Shown on the member's next visit (raid_owed)."""
    if p.level >= 0 or tier.key != "low":
        changed = False
        if m.raid_depth:  # climbed back off the Pillar: the next fall starts fresh
            m.raid_depth, changed = 0, True
        if m.raid_owed is not None and m.raid_owed >= 0:
            # The fall was undone (a start date or time zone fixed, a parent's correction) before they saw the raid:
            # call the goblins off and give back what they took.
            m.gems_stolen = max(0, (m.gems_stolen or 0) - m.raid_owed)
            m.raid_owed, changed = -1, True
        if changed:
            db.commit()
        return
    if m.seen_rank not in _RANK_ORDER:  # never seen before (a new member): no raid for where they start
        m.raid_depth = p.level
        db.commit()
        return
    if p.level >= (m.raid_depth or 0):
        return  # not deeper than the last raid
    lo, hi = RAID_GEMS.get(max(p.level, -3), (75, 99))
    balance = gems_earned(p) + gems_claimed(db, m.id) + achievement_gems(db, m.id)[0] - gems_spent(db, m.id) + gems_granted(db, m.id)
    take = max(0, min(balance, random.randint(lo, hi)))
    m.gems_stolen = (m.gems_stolen or 0) + take
    owed = m.raid_owed if m.raid_owed is not None and m.raid_owed >= 0 else 0
    m.raid_owed = owed + take  # two falls before the next visit: one raid with both
    m.raid_depth = p.level
    db.commit()


def _celebration(db: Session, m: Member, tier, p) -> dict | None:
    """The rank-up show still owed to this member, if any.

    The first time we see a member we just note their rank (no show for where they started). A drop in rank is
    noted silently too, so climbing back up earns the show again."""
    now = _RANK_ORDER.index(tier.key)
    # Climbing back to Member (0) from Low Honor is noted quietly: the shows are for Bronze and up.
    if m.seen_rank not in _RANK_ORDER or now < _RANK_ORDER.index(m.seen_rank) or tier.key == "member":
        m.seen_rank, m.seen_level_gems = tier.key, p.gems_levels
        db.commit()
        return None
    if m.seen_rank == tier.key:
        return None
    return {"tier": tier.key, "reward": max(0, p.gems_levels - m.seen_level_gems)}


def _week_days(db: Session, cfg, m: Member, today: date) -> list[dict]:
    """This week, Sunday to Saturday: which days were completed."""
    start = week_start(today)
    first = member_start(cfg, m)
    specs = load_tasks(db)
    periods = load_periods(db)
    logs = logs_between(db, start - timedelta(days=1), start + timedelta(days=6), m.id)
    out = []
    for i in range(7):
        d = start + timedelta(days=i)
        log, prev = logs.get((m.id, d)), logs.get((m.id, d - timedelta(days=1)))
        if d > today or d < first:
            state = "future" if d > today else "pre"
        else:
            plan = scoring.day_plan(specs, scoring.for_member(periods, m.id), d)
            counted = scoring.credited(log.tasks if log else None, prev.tasks if prev else None, plan, first_day=d == first)
            sc = scoring.score_day(d, counted, log.excuse if log else None, today, cfg.cut_misses, plan,
                                   (log.task_excuses or {}) if log else None)
            state = "done" if sc.gain else "open" if d == today else "rest" if sc.weekend else "excused" if sc.excused else "missed"
        out.append({"date": d.isoformat(), "state": state, "today": d == today})
    return out


def _weekly_map(db: Session, m: Member, tier, p, today: date) -> dict:
    """The weekly treasure map: the Nth chest opened this week (Sunday to Saturday) holds WEEKLY_MAP[N-1] gems."""
    start = week_start(today)
    opened = sorted(db.scalars(select(DailyClaim.day).where(DailyClaim.member_id == m.id, DailyClaim.day >= start,
                                                             DailyClaim.day <= today)))
    step = len(opened)
    claimed_today = today in opened
    gems = WEEKLY_MAP[step] if step < len(WEEKLY_MAP) else 0
    return {"gems": gems, "claimed_today": claimed_today, "step": step,
            "available": gems > 0 and not claimed_today and p.streak > 0 and tier.key != "low",
            "resets": (start + timedelta(days=7)).isoformat(),
            "map": [{"day": i + 1, "gems": g, "done": i < step, "on": opened[i].isoformat() if i < step else None}
                    for i, g in enumerate(WEEKLY_MAP)]}


def _charity_for(db: Session, member_id: str):
    from app.routers.tests import charity_for
    return charity_for(db, member_id)


def _shaytan_for(db: Session, member_id: str):
    from app.routers.tests import for_member
    return for_member(db, member_id)


def _profile(db: Session, m: Member) -> dict:
    cfg = get_settings_row(db)
    p = progress_for(db, cfg, [m], today_for(cfg))[m.id]
    tier = tier_of_progress(p)
    _goblin_raid(db, m, tier, p)  # before the rank is noted, so the fall is seen
    celebrate = _celebration(db, m, tier, p)
    owned = owned_items(db, m.id)
    spent = gems_spent(db, m.id)
    claimed = gems_claimed(db, m.id)
    from_achievements, _ = achievement_gems(db, m.id)
    today = today_for(cfg)
    daily = _weekly_map(db, m, tier, p, today)
    nxt = p.best_level + 1
    reward = 0 if p.legendary or nxt > CAP_WITHOUT_LEGENDARY else GEMS_PER_LEVEL + (
        RANK_GEMS[tier_for(nxt, False).key] if tier_for(nxt, False).min == nxt else 0)
    achs = _achievements(db, m, p)
    earned = {a["key"] for a in achs if a["unlocked"]}
    look = shown_look(m.avatar, m.frame, tier.key)
    raid = {"stolen": m.raid_owed} if m.raid_owed is not None and m.raid_owed >= 0 else None
    takers = db.execute(select(Member.name, GemTake.gems).join(Member, Member.id == GemTake.taker_id)
                        .where(GemTake.victim_id == m.id, GemTake.day == today_for(cfg)).order_by(GemTake.created_at)).all()
    gobis = db.scalars(select(Member.name).join(GobiLaunch, Member.id == GobiLaunch.launcher_id)
                       .where(GobiLaunch.victim_id == m.id, GobiLaunch.day == today_for(cfg)).order_by(GobiLaunch.created_at)).all()
    splats = db.scalars(select(Member.name).join(GobiLaunch, Member.id == GobiLaunch.launcher_id)
                        .where(GobiLaunch.victim_id == m.id, GobiLaunch.seen.is_(False)).order_by(GobiLaunch.created_at)).all()
    return {"raid": raid, "avatar_nudge": bool(m.avatar_nudge and not m.avatar), "new_likes": _new_likes(db, m), "taken_today": [{"name": n, "gems": g} for n, g in takers], "gobi_today": list(gobis),
            "gobi_splat": list(splats), "member": {"id": m.id, "name": m.name, "avatar": look[0], "frame": look[1], "theme": _theme_of(m),
                       "shamed": tier.key == "low", "own_avatar": m.avatar, "own_frame": m.frame},
            **_status(p), "week_delta": p.week_delta, "streak": p.streak,
            "gems": {"balance": gems_earned(p) + claimed + from_achievements - spent + gems_granted(db, m.id),
                     "earned": gems_earned(p) + claimed + from_achievements, "spent": spent, "claimed": claimed,
                     "achievements": from_achievements,
                     "today": p.today_tasks_gems, "from_tasks": p.gems_tasks, "from_levels": p.gems_levels},
            "next_level_reward": {"level": roman(nxt), "gems": reward} if reward else None,
            "frames": catalogue("frame", tier, owned, godfather=bool(m.godfather)), "themes": catalogue("theme", tier, owned, earned),
            "avatars": catalogue("avatar", tier, owned, earned), "celebrate": celebrate,
            "daily": daily,
            "week_days": _week_days(db, cfg, m, today),
            "event_win": unseen_win(db, m.id),
            "godfather": {"is": bool(m.godfather), "seen": bool(m.godfather_seen)},
            "shaytan": _shaytan_for(db, m.id), "charity": _charity_for(db, m.id),
            "oath": m.oath_at is not None, "oath_note": m.oath_note or "", "toured": bool(m.toured),
            "achievements_ready": sum(1 for a in achs if a["unlocked"] and not a["claimed"]),
            "achievements_new": [{k: a[k] for k in ("key", "name", "icon", "tier", "gems")} for a in achs if a["unlocked"] and not a["claimed"]]}


@router.get("/profile")
def get_profile(v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    if v.kind != "member":
        raise HTTPException(400, "Profiles are for members")
    return _profile(db, db.get(Member, v.id))


TAKE_GEMS = 5  # (older) gems a member could take from someone on the Pillar of Shame
GOBI_GEMS = 10  # hitting someone on the Pillar of Shame with a cauliflower: once a day


@router.post("/gobi-seen")
def gobi_seen(v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    """The person hit has watched the splat."""
    if v.kind == "member":
        for g in db.scalars(select(GobiLaunch).where(GobiLaunch.victim_id == v.id, GobiLaunch.seen.is_(False))):
            g.seen = True
        db.commit()
    return {"ok": True}


@router.post("/gobi/{victim_id}")
def launch_gobi(victim_id: str, v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    """A cauliflower hit someone on the Pillar of Shame: +10 gems for the launcher, once a day."""
    if v.kind != "member":
        raise HTTPException(400, "Only members can launch a gobi")
    if victim_id == v.id:
        raise HTTPException(400, "You can't launch a gobi at yourself")
    victim = db.get(Member, victim_id)
    if not victim or not victim.active:
        raise HTTPException(404, "Member not found")
    cfg = get_settings_row(db)
    today = today_for(cfg)
    if tier_of_progress(progress_for(db, cfg, [victim], today)[victim.id]).key != "low":
        raise HTTPException(400, f"{victim.name} isn't on the Pillar of Shame")
    if db.scalar(select(GobiLaunch.id).where(GobiLaunch.launcher_id == v.id, GobiLaunch.day == today)):
        raise HTTPException(400, "You already launched today's gobi. Try again tomorrow")
    db.add(GobiLaunch(launcher_id=v.id, victim_id=victim.id, day=today, gems=GOBI_GEMS))
    db.commit()
    return {"gems": GOBI_GEMS, "at": victim.name, "profile": _profile(db, db.get(Member, v.id))}


@router.post("/take/{victim_id}")
def take_gems(victim_id: str, v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    """Take 5 gems from someone on the Pillar of Shame (once a day from each person)."""
    if v.kind != "member":
        raise HTTPException(400, "Only members can take gems")
    if victim_id == v.id:
        raise HTTPException(400, "You can't take gems from yourself")
    victim = db.get(Member, victim_id)
    if not victim or not victim.active:
        raise HTTPException(404, "Member not found")
    cfg = get_settings_row(db)
    today = today_for(cfg)
    p = progress_for(db, cfg, [victim], today)[victim.id]
    if tier_of_progress(p).key != "low":
        raise HTTPException(400, f"{victim.name} isn't on the Pillar of Shame")
    if db.scalar(select(GemTake.id).where(GemTake.taker_id == v.id, GemTake.victim_id == victim.id, GemTake.day == today)):
        raise HTTPException(400, f"You already took gems from {victim.name} today. Try again tomorrow")
    balance = gems_earned(p) + gems_claimed(db, victim.id) + achievement_gems(db, victim.id)[0] - gems_spent(db, victim.id) + gems_granted(db, victim.id)
    take = max(0, min(TAKE_GEMS, balance))
    if take == 0:
        raise HTTPException(400, f"{victim.name} has no gems left to take")
    db.add(GemTake(taker_id=v.id, victim_id=victim.id, day=today, gems=take))
    db.commit()
    return {"taken": take, "from": victim.name, "profile": _profile(db, db.get(Member, v.id))}


WATCH_RULE = True  # a task with a video must have ▶ Watch opened before it is ticked


class WatchIn(BaseModel):
    member_id: str
    date: date
    task: str = Field(max_length=24)


@router.post("/watched")
def watched(body: WatchIn, v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    """A member opened a task's video (▶ Watch): now they may tick that task today."""
    if not v.is_admin and v.id != body.member_id:
        raise HTTPException(403, "Only for yourself")
    m = _member_or_404(db, body.member_id)
    log = db.scalar(select(DayLog).where(DayLog.member_id == m.id, DayLog.day == body.date))
    if not log:
        log = DayLog(member_id=m.id, day=body.date, tasks=[], excuse="", late={}, task_excuses={}, watched=[])
        db.add(log)
    if body.task not in (log.watched or []):
        log.watched = [*(log.watched or []), body.task]
    db.commit()
    return {"watched": log.watched}


@router.post("/profile/raid-seen")
def raid_seen(v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    """The member watched the goblin raid: don't show it again."""
    if v.kind != "member":
        raise HTTPException(400, "Profiles are for members")
    m = db.get(Member, v.id)
    m.raid_owed = -1
    db.commit()
    return _profile(db, m)


@router.post("/profile/celebrated")
def celebrated(v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    """The member watched their rank-up show: don't play it again."""
    if v.kind != "member":
        raise HTTPException(400, "Profiles are for members")
    m = db.get(Member, v.id)
    cfg = get_settings_row(db)
    p = progress_for(db, cfg, [m], today_for(cfg))[m.id]
    m.seen_rank, m.seen_level_gems = tier_of_progress(p).key, p.gems_levels
    db.commit()
    return _profile(db, m)


@router.put("/profile")
def save_profile(body: ProfileIn, v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    """A member picks their picture, frame and theme from what their rank unlocked or they bought."""
    if v.kind != "member":
        raise HTTPException(400, "Profiles are for members")
    m = db.get(Member, v.id)
    cfg = get_settings_row(db)
    tier = tier_of_progress(progress_for(db, cfg, [m], today_for(cfg))[m.id])
    if tier.key == "low" and (body.avatar is not None or body.frame is not None):
        raise HTTPException(403, "🔒 Your picture and frame are locked while you're on the Pillar of Shame. "
                                 "Finish all your tasks to climb back to Member")
    owned = owned_items(db, m.id)
    prog = progress_for(db, cfg, [m], today_for(cfg))[m.id]
    earned = {a["key"] for a in _achievements(db, m, prog) if a["unlocked"]}
    old_avatar = m.avatar
    for kind, value, keys in (("avatar", body.avatar, None), ("frame", body.frame, FRAME_KEYS), ("theme", body.theme, THEME_KEYS)):
        if value is None or value == "":
            if value == "":
                setattr(m, kind, "")
            continue
        if kind == "avatar" and value not in AVATARS and price_of("avatar", value) is None:
            raise HTTPException(400, "Choose one of the pictures shown")
        if keys is not None and value not in keys:
            raise HTTPException(400, f"Choose one of the {kind}s shown")
        if not item_available(kind, value, tier, owned, earned, godfather=bool(m.godfather)):
            raise HTTPException(403, "Unlock it first: climb to its rank or buy it in the shop")
        setattr(m, kind, value)
    if body.avatar and m.avatar != old_avatar:  # tell the family (Community)
        from app.routers.news import system_post
        from app.tiers import _PICTURE_NAMES
        pic = _PICTURE_NAMES.get(m.avatar, "")
        system_post(db, "picture", m, f"{m.name} has a new picture{f': {pic}' if pic else ''}",
                    {"avatar": m.avatar, "picture": pic}, emoji="🖼️", merge_minutes=15)
    db.commit()
    return _profile(db, m)


@router.post("/shop/buy")
def buy(body: BuyIn, v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    """Spend gems on a frame, theme or picture from the shop."""
    if v.kind != "member":
        raise HTTPException(400, "The shop is for members")
    m = db.get(Member, v.id)
    price = price_of(body.kind, body.key)
    if price is None:
        raise HTTPException(400, "That item is not sold in the shop")
    if (body.kind == "avatar" and body.key in PICTURE_UNLOCKS) or (body.kind == "theme" and body.key in THEME_UNLOCKS):
        raise HTTPException(400, "This picture can't be bought: earn its achievement to unlock it")
    if price == 0:
        raise HTTPException(400, "It's free: just tap Use")
    if shop_key(body.kind, body.key) in owned_items(db, m.id):
        raise HTTPException(400, "You already have it")
    cfg = get_settings_row(db)
    p = progress_for(db, cfg, [m], today_for(cfg))[m.id]
    balance = gems_earned(p) + gems_claimed(db, m.id) + achievement_gems(db, m.id)[0] - gems_spent(db, m.id) + gems_granted(db, m.id)
    if balance < price:
        raise HTTPException(400, f"You need {price - balance} more gems. Finish tasks to earn more!")
    db.add(Purchase(member_id=m.id, item=shop_key(body.kind, body.key), price=price))
    setattr(m, body.kind, body.key)  # put it on straight away
    db.commit()
    return _profile(db, m)


def _shaytan_beaten(db: Session, member_id: str) -> int:
    from sqlalchemy import func

    from app.models import Temptation
    return int(db.scalar(select(func.count()).select_from(Temptation).where(Temptation.member_id == member_id,
                                                                            Temptation.answer == "no")) or 0)


def _sadaqah_given(db: Session, member_id: str) -> int:
    from sqlalchemy import func

    from app.models import CharityTest
    return int(db.scalar(select(func.count()).select_from(CharityTest).where(CharityTest.member_id == member_id,
                                                                             CharityTest.answer == "give")) or 0)


def _achievements(db: Session, m: Member, p: Progress) -> list[dict]:
    _, got = achievement_gems(db, m.id)
    purchases = len(owned_items(db, m.id))
    facts = Facts(p=p, gems_earned=gems_earned(p) + gems_claimed(db, m.id), purchases=purchases, chests=chests_opened(db, m.id),
                  quests=len(m.quest_starts or []), oath=1 if m.oath_at else 0, godfather=1 if m.godfather else 0,
                  shaytan=_shaytan_beaten(db, m.id), sadaqah=_sadaqah_given(db, m.id), **dict(zip(("first", "second", "third"), placings(db, m.id).values())))
    return evaluate_achievements(facts, got)


@router.get("/achievements")
def achievements(member_id: str | None = None, v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    """Every achievement with progress; members see their own, parents can look at anyone's."""
    mid = member_id if v.is_admin and member_id else v.id
    if v.kind != "member" and not member_id:
        raise HTTPException(400, "Choose a member")
    m = _member_or_404(db, mid)
    cfg = get_settings_row(db)
    p = progress_for(db, cfg, [m], today_for(cfg))[m.id]
    items = _achievements(db, m, p)
    return {"member": {"id": m.id, "name": m.name}, "items": items,
            "unlocked": sum(1 for a in items if a["unlocked"]), "total": len(items)}


@router.post("/achievements/{key}/claim")
def claim_achievement(key: str, v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    """Collect an unlocked achievement's gems (once)."""
    if v.kind != "member":
        raise HTTPException(400, "Achievements are for members")
    a = ACHIEVEMENT_BY_KEY.get(key)
    if not a:
        raise HTTPException(404, "No such achievement")
    m = db.get(Member, v.id)
    cfg = get_settings_row(db)
    p = progress_for(db, cfg, [m], today_for(cfg))[m.id]
    item = next((x for x in _achievements(db, m, p) if x["key"] == key), None)
    if item is None:
        raise HTTPException(404, "No such achievement")
    if item["claimed"]:
        raise HTTPException(400, "Already collected")
    if not item["unlocked"]:
        raise HTTPException(400, f"Not yet: {item['progress']}/{item['goal']}")
    db.add(AchievementClaim(member_id=m.id, key=key, gems=a.gems))
    if key not in NO_POST_ACHIEVEMENTS:
        _post_achievement(db, m, a)
    db.commit()
    return achievements(None, v, db)


NO_POST_ACHIEVEMENTS = {"oath"}  # everyone swears the oath: not news
_TIER_LABEL = {"bronze": "Common", "silver": "Rare", "gold": "Epic", "legend": "Legendary", "godfather": "Godfather"}


def _post_achievement(db: Session, m: Member, a) -> None:
    """Community post when a member collects an achievement. Several collected within 10 minutes ("Collect all")
    go into one post."""
    from app.routers.news import system_post
    item = {"key": a.key, "name": a.name, "icon": a.icon, "tier": a.tier, "tier_name": _TIER_LABEL.get(a.tier, ""), "gems": a.gems}
    recent = db.scalar(select(Announcement).where(Announcement.kind == "achievement", Announcement.member_id == m.id)
                       .order_by(Announcement.created_at.desc()).limit(1))
    items = [item]
    if recent:
        t = recent.created_at if recent.created_at.tzinfo else recent.created_at.replace(tzinfo=timezone.utc)
        if t > datetime.now(timezone.utc) - timedelta(minutes=10):
            items = [x for x in (recent.data or {}).get("items", []) if x.get("key") != a.key] + [item]
    title = (f"{m.name} earned {a.name}!" if len(items) == 1 else f"{m.name} earned {len(items)} achievements!")
    system_post(db, "achievement", m, title, {"items": items}, emoji="🏅", merge_minutes=10)


class OathIn(BaseModel):
    words: str = Field(max_length=40)


@router.post("/oath")
def swear_oath(body: OathIn, v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    """The Oath of Honor: the member types I SWEAR to mark tasks only after doing them, honestly."""
    if v.kind != "member":
        raise HTTPException(400, "The oath is for members")
    if " ".join(body.words.upper().split()) != "I SWEAR":
        raise HTTPException(400, "Type I SWEAR to take the oath")
    m = db.get(Member, v.id)
    if m.oath_at is None:
        m.oath_at = datetime.now(timezone.utc)
        m.oath_note = ""
        db.commit()
    return _profile(db, m)


def _new_likes(db: Session, m: Member) -> dict | None:
    """Likes on this member's posts (a new picture, a win) since they last looked, not counting their own."""
    if m.likes_seen_at is None:  # first time: start counting from now
        m.likes_seen_at = datetime.now(timezone.utc)
        db.commit()
        return None
    since = m.likes_seen_at if m.likes_seen_at.tzinfo else m.likes_seen_at.replace(tzinfo=timezone.utc)
    rows = db.execute(select(PostLike.name, PostLike.created_at, Announcement.kind, Announcement.data)
                      .join(Announcement, Announcement.id == PostLike.post_id)
                      .where(Announcement.member_id == m.id, PostLike.who != f"member:{m.id}")
                      .order_by(PostLike.created_at.desc())).all()
    rows = [r for r in rows if (r[1] if r[1].tzinfo else r[1].replace(tzinfo=timezone.utc)) > since]
    if not rows:
        return None
    names = list(dict.fromkeys(r[0] for r in rows))
    kind, data = rows[0][2], rows[0][3] or {}
    what = (f"your new picture{' (' + data['picture'] + ')' if data.get('picture') else ''}" if kind == "picture"
            else "your win" if kind == "win" else "your achievement" if kind == "achievement" else "your post")
    return {"names": names[:2], "count": len(names), "likes": len(rows), "what": what}


@router.post("/profile/likes-seen")
def likes_seen(v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    m = db.get(Member, v.id) if v.kind == "member" else None
    if m:
        m.likes_seen_at = datetime.now(timezone.utc)
        db.commit()
    return {"ok": True}


@router.post("/profile/avatar-nudge-seen")
def avatar_nudge_seen(v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    m = db.get(Member, v.id) if v.kind == "member" else None
    if m:
        m.avatar_nudge = False
        db.commit()
    return {"ok": True}


@router.post("/profile/godfather-seen")
def godfather_seen(v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    """The member has watched their "You are a Godfather" show."""
    m = db.get(Member, v.id) if v.kind == "member" else None
    if m:
        m.godfather_seen = True
        db.commit()
    return {"ok": True}


@router.post("/toured")
def finish_tour(v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    if v.kind != "member":
        raise HTTPException(400, "The tour is for members")
    m = db.get(Member, v.id)
    m.toured = True
    db.commit()
    return _profile(db, m)


@router.post("/claim")
def claim_daily(v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    """Open the daily streak chest: once a day while the streak is alive; higher ranks get more gems."""
    if v.kind != "member":
        raise HTTPException(400, "The daily chest is for members")
    m = db.get(Member, v.id)
    cfg = get_settings_row(db)
    today = today_for(cfg)
    p = progress_for(db, cfg, [m], today)[m.id]
    w = _weekly_map(db, m, tier_of_progress(p), p, today)
    if w["claimed_today"]:
        raise HTTPException(400, "Already opened today. Come back tomorrow!")
    if w["step"] >= len(WEEKLY_MAP):
        raise HTTPException(400, "This week's map is complete! A new one starts on Sunday")
    if not w["available"]:
        raise HTTPException(400, "Finish all of today's tasks to light your streak, then open today's chest")
    db.add(DailyClaim(member_id=m.id, day=today, gems=w["gems"]))
    db.commit()
    return _profile(db, m)


@router.post("/quest")
def start_quest(body: QuestIn, v: Viewer = Depends(current_viewer), db: Session = Depends(get_db)) -> dict:
    """Give up 🔮 Obsidian and restart at I on the road to 👑 Legendary."""
    m = _member_or_404(db, body.member_id)
    if not v.is_admin and v.id != m.id:
        raise HTTPException(403, "Only you or a parent can start your quest")
    cfg = get_settings_row(db)
    today = today_for(cfg)
    p = progress_for(db, cfg, [m], today)[m.id]
    if not can_start_quest(p):
        raise HTTPException(400, "Only an 🔮 Obsidian member can start the Legendary quest")
    m.quest_starts = [*(m.quest_starts or []), f"{today.isoformat()}@{datetime.now(timezone.utc).isoformat()}"]
    db.commit()
    return _status(progress_for(db, cfg, [m], today)[m.id])
