from datetime import date, timedelta

from app import scoring
from app.makeup import check_week, remaining, week_start
from app.progress import simulate
from app.tiers import BY_KEY, tier_for

FULL = sorted(set(scoring.REQUIRED) | {"gate", "bonus"})
MON, TUE, WED, THU, FRI, SAT, SUN = (date(2026, 11, 23) + timedelta(days=i) for i in range(7))


def test_tier_boundaries_match_the_table():
    expect = {1: "honor", 3: "honor", 4: "good", 7: "good", 8: "great", 12: "great", 13: "high", 18: "high",
              19: "higher", 24: "higher", 25: "highest", 31: "highest", 32: "ultimate", 39: "ultimate",
              40: "supreme", 46: "supreme", 47: "diamond", 49: "diamond", 0: "low", -3: "low"}
    for level, key in expect.items():
        assert tier_for(level, False).key == key, level
    assert tier_for(60, False).key == "diamond"  # no Legendary without the quest
    assert tier_for(50, True).key == "legendary"


def test_week_starts_on_sunday():
    assert week_start(THU) == date(2026, 11, 22) and week_start(SUN) == SUN


def test_next_day_makeup_limits():
    good, highest, diamond = BY_KEY["good"], BY_KEY["highest"], BY_KEY["diamond"]
    one = {MON: {"fajr": TUE}}
    two = {MON: {"fajr": TUE, "mulk": TUE}}
    assert check_week(good, one) is None and check_week(good, two)
    assert check_week(highest, two) is None
    assert check_week(BY_KEY["honor"], one)
    assert check_week(good, {MON: {"fajr": WED}})  # two days late
    assert remaining(good, MON, TUE, {}) == 1 and remaining(highest, MON, TUE, {}) == 2
    assert remaining(diamond, MON, TUE, {}) == 3 and remaining(good, MON, WED, {}) == 0


def test_thursday_rule():
    high = BY_KEY["high"]
    assert check_week(high, {THU: {"fajr": SAT}}) is None  # Thursday task made up on Saturday
    assert check_week(high, {THU: {"fajr": FRI, "mulk": FRI}}) is None  # 1 next-day + 1 Thursday
    assert check_week(high, {THU: {"fajr": FRI, "mulk": FRI, "milk": SAT}})  # 3 is too many
    assert check_week(high, {WED: {"fajr": FRI}})  # Wednesday is not covered for High Honor
    assert remaining(high, THU, SAT, {}) == 1 and remaining(high, THU, FRI, {}) == 2


def test_supreme_shares_wed_or_thu_and_diamond_gets_both():
    sup, dia = BY_KEY["supreme"], BY_KEY["diamond"]
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


def test_quest_needs_diamond():
    p = run(40, [FULL] * 2, quest=[MON])
    assert p.level == 44 and p.quest_start is None


def test_legendary_is_lost_after_three_missed_weekdays_and_never_returns():
    start = date(2026, 11, 1)  # a Sunday
    days = [FULL] * 26 + [[]] * 5 + [FULL] * 30
    p = run(47, days, quest=[start], start=start)
    assert p.banned and not p.legendary and p.demoted_on is not None
    assert p.level == 49  # climbs back to the Diamond cap, never Legendary again
    again = run(47, days + [FULL] * 3, quest=[start, start + timedelta(days=70)], start=start)
    assert not again.legendary and again.quest_start is None


def test_week_delta_counts_only_this_week():
    p = simulate(10, {SAT - timedelta(days=7): (FULL, ""), MON: (FULL, "")}, {}, [], SAT - timedelta(days=7), TUE, 5,
                 week_from=week_start(TUE))
    assert p.week_delta == 2 + (-1)  # Monday +2, Tuesday still open, Sunday rest; previous week excluded
