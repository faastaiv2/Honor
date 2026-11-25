from datetime import date, timedelta

from app import scoring
from app.makeup import check_week, remaining, week_start
from app.progress import simulate
from app.tiers import BY_KEY, tier_for

FULL = sorted(set(scoring.REQUIRED) | {"gate", "bonus"})
MON, TUE, WED, THU, FRI, SAT, SUN = (date(2026, 11, 23) + timedelta(days=i) for i in range(7))


def test_tier_boundaries_match_the_table():
    expect = {1: "bronze", 3: "bronze", 4: "silver", 7: "silver", 8: "gold", 12: "gold", 13: "platinum", 18: "platinum",
              19: "emerald", 24: "emerald", 25: "sapphire", 31: "sapphire", 32: "ruby", 39: "ruby",
              40: "diamond", 46: "diamond", 47: "obsidian", 49: "obsidian", 0: "member", -1: "low", -3: "low"}
    for level, key in expect.items():
        assert tier_for(level, False).key == key, level
    assert tier_for(60, False).key == "obsidian"  # no Legendary without the quest
    assert tier_for(50, True).key == "legendary"


def test_week_starts_on_sunday():
    assert week_start(THU) == date(2026, 11, 22) and week_start(SUN) == SUN


def test_next_day_makeup_limits():
    good, highest, diamond = BY_KEY["silver"], BY_KEY["sapphire"], BY_KEY["obsidian"]
    one = {MON: {"fajr": TUE}}
    two = {MON: {"fajr": TUE, "mulk": TUE}}
    assert check_week(good, one) is None and check_week(good, two)
    assert check_week(highest, two) is None
    assert check_week(BY_KEY["bronze"], one)
    assert check_week(good, {MON: {"fajr": WED}})  # two days late
    assert remaining(good, MON, TUE, {}) == 1 and remaining(highest, MON, TUE, {}) == 2
    assert remaining(diamond, MON, TUE, {}) == 3 and remaining(good, MON, WED, {}) == 0


def test_thursday_rule():
    high = BY_KEY["platinum"]
    assert check_week(high, {THU: {"fajr": SAT}}) is None  # Thursday task made up on Saturday
    assert check_week(high, {THU: {"fajr": FRI, "mulk": FRI}}) is None  # 1 next-day + 1 Thursday
    assert check_week(high, {THU: {"fajr": FRI, "mulk": FRI, "milk": SAT}})  # 3 is too many
    assert check_week(high, {WED: {"fajr": FRI}})  # Wednesday is not covered for High Honor
    assert remaining(high, THU, SAT, {}) == 1 and remaining(high, THU, FRI, {}) == 2


def test_supreme_shares_wed_or_thu_and_diamond_gets_both():
    sup, dia = BY_KEY["diamond"], BY_KEY["obsidian"]
    assert check_week(sup, {WED: {"fajr": FRI}}) is None
    assert check_week(sup, {WED: {"fajr": FRI}, THU: {"mulk": SAT}})  # only one of Wed or Thu
    assert check_week(dia, {WED: {"fajr": FRI, "mulk": FRI}, THU: {"milk": SAT, "lang": SAT}}) is None
    assert check_week(dia, {WED: {"fajr": FRI, "mulk": FRI, "milk": SAT}})  # max 2 for Wednesday


def test_legendary_fifteen_a_week_any_day():
    leg = BY_KEY["legendary"]
    keys = scoring.REQUIRED
    week = {MON: {k: SAT for k in keys[:10]}, TUE: {k: FRI for k in keys[:5]}}
    assert check_week(leg, week) is None
    week[WED] = {"fajr": THU}
    assert check_week(leg, week)
    assert check_week(leg, {SAT: {"fajr": SAT + timedelta(days=1)}})  # next week is too late


def run(base, days, quest=(), today=None, start=MON):
    today = today or start + timedelta(days=len(days))
    logs = {start + timedelta(days=i): (t, "") for i, t in enumerate(days)}
    return simulate(base, logs, {}, list(quest), start, today, 5)


def test_level_is_capped_at_49_without_legendary():
    p = run(48, [FULL] * 5)
    assert p.level == 49 and not p.legendary


def test_quest_restarts_at_one_and_reaches_legendary_when_perfect():
    p = run(47, [FULL] * 26, quest=[MON])
    assert p.legendary and p.level >= 50 and p.legendary_since is not None


def test_one_imperfect_day_breaks_the_quest():
    days = [FULL] * 3 + [[k for k in FULL if k != "bonus"]] + [FULL] * 40
    p = run(47, days, quest=[MON])
    assert not p.legendary and p.level == 49 and p.quest_broken_on == THU and p.quest_start is None


def test_a_recorded_quest_start_always_restarts_at_one():
    # Only Obsidian members can start the quest (the server checks when it starts), so a recorded start is trusted:
    # it restarts at I even if a parent's change that same morning is what made them Obsidian.
    p = run(40, [FULL] * 2, quest=[MON])
    assert p.level == 5 and p.quest_start == MON


def test_legendary_is_lost_after_three_missed_weekdays_and_never_returns():
    start = date(2026, 11, 1)  # a Sunday
    days = [FULL] * 26 + [[]] * 5 + [FULL] * 30
    p = run(47, days, quest=[start], start=start)
    assert p.banned and not p.legendary and p.demoted_on is not None
    assert p.level == 49  # climbs back to the Diamond cap, never Legendary again
    again = run(47, days + [FULL] * 3, quest=[start, start + timedelta(days=70)], start=start)
    assert not again.legendary and again.quest_start is None


def test_week_delta_counts_only_this_week():
    p = simulate(10, {SAT - timedelta(days=7): (FULL, ""), MON - timedelta(days=1): (["mulk"], ""), MON: (FULL, "")}, {}, [],
                 SAT - timedelta(days=7), TUE, 5,
                 week_from=week_start(TUE))
    assert p.week_delta == 2 + (-1)  # Monday +2, Tuesday still open, Sunday rest; previous week excluded


def test_gems_from_tasks_levels_and_ranks():
    # base 6 (Silver). Monday: all 17 + bonus (+2 levels: VII, then VIII = new Gold rank).
    p = run(6, [FULL])
    assert p.gems_tasks == 18 * 5
    assert p.gems_levels == 10 + 10 + 100  # VII, VIII, and Gold (100) reached for the first time
    assert p.best_level == 8 and p.streak == 1


def test_no_gems_twice_for_the_same_level():
    # up 2, down 1 (empty weekday), up 2 again: only levels never reached before pay
    p = run(10, [FULL, ["mulk"], FULL])  # Surah Mulk read the night before counts for the next day
    assert p.level == 13 and p.gems_levels == (10 + 10) + 0 + (10 + 150)  # XI, XII; then XIII (+Platinum rank, 150)


def test_streak_skips_weekends_and_resets_on_a_missed_weekday():
    start = date(2026, 11, 26)  # Thursday
    p = run(10, [FULL, [], ["mulk"], FULL], start=start)  # Thu done, Fri+Sat empty (weekend), Sun done
    assert p.streak == 2
    p = run(10, [FULL, FULL, ["mulk"], FULL], start=MON)  # Wednesday missed
    assert p.streak == 1


def test_surah_mulk_counts_for_the_next_day():
    no_mulk = [k for k in FULL if k != "mulk"]
    d1, d2 = MON, MON + timedelta(days=1)

    def days(a, b):
        return simulate(10, {d1: (a, ""), d2: (b, "")}, {}, [], d1, d2 + timedelta(days=1), 1).history

    # Day 1 is the first day, so its Mulk is free. Day 2 needs Mulk ticked on day 1.
    h = days(no_mulk, no_mulk)
    assert h[d1] == 2 and h[d2] == -1
    assert days(FULL, no_mulk)[d2] == 2
    # Ticking Mulk on the day itself doesn't help that day: it is for tomorrow.
    assert days(no_mulk, FULL)[d2] == -1


def test_gems_only_for_the_full_day():
    thu = date(2026, 11, 26)  # the new rates start here
    half = FULL[:5]
    p = simulate(10, {thu: (FULL, ""), thu + timedelta(days=1): (half, "")}, {}, [], thu, thu + timedelta(days=2), 1)
    assert p.gems_tasks == 20  # nothing per task, 20 for the full day, nothing for the half day


def test_level_never_goes_below_minus_three():
    from app.tiers import LOW_FLOOR
    p = simulate(0, {}, {MON: -10}, [], MON - timedelta(days=1), MON + timedelta(days=1), 5)
    assert p.level == LOW_FLOOR == -3 and tier_for(p.level, False).key == "low"
    assert simulate(-9, {}, {}, [], MON, MON, 5).level == -3
    sick = {MON - timedelta(days=1) + timedelta(days=i): ([], "sick") for i in range(4)}
    up = simulate(0, sick, {MON: -10, TUE: 2}, [], MON - timedelta(days=1), TUE + timedelta(days=1), 5)
    assert up.level == -1  # climbing back starts from −III, not from −X
