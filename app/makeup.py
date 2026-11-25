"""Checks for making up missed tasks after the day is over, by rank.

A "late" tick is a task ticked by a member after its day ended. Each log keeps them as
{task_key: date_it_was_ticked}. Only parents can change a finished day without limits.
"""
from __future__ import annotations

from datetime import date, timedelta

from app.tiers import Tier

FRI, SAT = 4, 5


def week_start(d: date) -> date:
    """Weeks run Sunday to Saturday."""
    return d - timedelta(days=(d.weekday() + 1) % 7)


def _parse(lates: dict) -> dict[str, date]:
    return {k: (v if isinstance(v, date) else date.fromisoformat(v)) for k, v in (lates or {}).items()}


def _mid_used(tier: Tier, day: date, lates: dict[str, date]) -> tuple[int, str | None]:
    """How many of this day's late ticks use the mid-week allowance, or an error."""
    nd = sorted(k for k, t in lates.items() if t == day + timedelta(days=1))
    later = [k for k, t in lates.items() if t > day + timedelta(days=1)]
    too_early = [k for k, t in lates.items() if t <= day]
    if too_early:
        return 0, None  # ticked on the day itself: not late
    overflow = max(0, len(nd) - tier.next_day)
    mid = overflow + len(later)
    if not mid:
        return 0, None
    if day.weekday() not in tier.mid_days:
        return mid, f"{tier.name} can make up {tier.next_day} task{'s' if tier.next_day != 1 else ''} the next day only"
    mid_ticks = [lates[k] for k in later] + ([day + timedelta(days=1)] if overflow else [])
    if any(t.weekday() not in (FRI, SAT) or week_start(t) != week_start(day) for t in mid_ticks):
        return mid, "Tasks from this day can only be made up on Friday or Saturday of the same week"
    return mid, None


def check_week(tier: Tier, week_lates: dict[date, dict]) -> str | None:
    """None when every late tick in the week fits the rank's allowance, else the reason it does not."""
    parsed = {d: _parse(l) for d, l in week_lates.items()}
    if tier.weekly_any:
        total = 0
        for d, lates in parsed.items():
            for t in lates.values():
                if t > d and week_start(t) != week_start(d):
                    return "Legendary make-ups must be done in the same week"
                total += t > d
        return None if total <= tier.weekly_any else f"Legendary allows {tier.weekly_any} make-up tasks a week"
    pool = 0
    for d, lates in sorted(parsed.items()):
        late = {k: t for k, t in lates.items() if t > d}
        if not late:
            continue
        if not tier.next_day and not tier.mid_days:
            return f"{tier.emoji} {tier.name} cannot make up tasks after the day. Climb to 🥈 Good Honor to unlock it"
        mid, err = _mid_used(tier, d, late)
        if err:
            return err
        if mid:
            if tier.mid_each and mid > tier.mid_cap:
                return f"{tier.name} can make up {tier.mid_cap} tasks from {d.strftime('%A')}"
            pool += mid
    if not tier.mid_each and pool > tier.mid_cap:
        return f"{tier.name} can make up {tier.mid_cap} mid-week task{'s' if tier.mid_cap != 1 else ''} a week"
    return None


def remaining(tier: Tier, day: date, today: date, week_lates: dict[date, dict]) -> int:
    """How many more tasks of `day` could be made up if ticked today."""
    if day >= today:
        return 0
    n = 0
    base = dict(week_lates.get(day, {}))
    while n < 20:
        trial = dict(week_lates)
        trial[day] = {**base, **{f"_probe{i}": today for i in range(n + 1)}}
        if check_week(tier, trial):
            break
        n += 1
    return n
