from datetime import date

from app import scoring as s
from app.sheet_import import parse_sheet

ALL = set(s.REQUIRED) | {"gate"}
TODAY = date(2026, 11, 24)  # a Tuesday


def test_targets_match_the_sheet():
    i = s.day_index(TODAY)
    assert i == 28
    assert s.task_label("darood", i) == "263 × Darood Sharif"
    assert s.task_label("jj", i) == "128 jumping jacks"
    assert s.task_label("push", i) == "17 push-ups"
    assert s.task_label("sit", i) == "8 sit-ups"
    assert s.task_label("plank", i) == "38 s plank"
    assert s.task_label("pages", i) == "2 pages"
    assert s.task_label("lap", i) == "2 laps"
    assert s.bonus_parts(i) == ("300×", "يا حكم")
    assert s.bonus_parts(0) == ("300×", "يا الله")
    assert s.bonus_parts(100) == ("1000×", "Astaghfar")
    assert s.darood(15) == 250 and s.darood(16) == 251
    assert s.pages(6) == 1 and s.pages(7) == 2 and s.pages(48) == 3 and s.pages(80) == 4 and s.pages(123) == 5
    assert s.laps(19) == 1 and s.laps(20) == 2 and s.laps(75) == 3


def test_weekend_is_friday_and_saturday():
    assert s.is_weekend(date(2026, 11, 27)) and s.is_weekend(date(2026, 11, 28))
    assert not s.is_weekend(date(2026, 11, 29))


def test_full_day_with_bonus_is_plus_two():
    r = s.score_day(date(2026, 11, 23), ALL | {"bonus"}, "", TODAY, 5)
    assert (r.gain, r.bonus, r.cut, r.delta) == (1, 1, 0, 2)


def test_all_tasks_without_pledge_earns_nothing():
    r = s.score_day(date(2026, 11, 23), set(s.REQUIRED) | {"bonus"}, "", TODAY, 5)
    assert r.delta == 0


def test_missing_five_on_past_weekday_is_cut_but_not_today():
    done = ALL - {"fajr", "yaseen", "dalail", "darood", "zikr"}
    assert s.score_day(date(2026, 11, 23), done, "", TODAY, 5).cut == -1
    assert s.score_day(TODAY, done, "", TODAY, 5).cut == 0
    assert s.score_day(date(2026, 11, 23), done | {"fajr"}, "", TODAY, 5).cut == 0


def test_excused_day_skips_fitness_and_is_never_cut():
    fitness = {t.key for t in s.TASKS if t.fitness}
    r = s.score_day(date(2026, 11, 23), ALL - fitness, "sick", TODAY, 5)
    assert r.gain == 1 and r.of == 11
    assert s.score_day(date(2026, 11, 23), set(), "sick", TODAY, 5).delta == 0


def test_weekend_earns_without_pledge_and_never_cuts():
    fri = date(2026, 11, 20)
    assert s.score_day(fri, set(s.REQUIRED) | {"bonus"}, "", TODAY, 5).delta == 2
    assert s.score_day(fri, set(), "", TODAY, 5).delta == 0


def test_parse_sheet_rows_with_and_without_row_numbers():
    tasks = "\t".join(["A, B"] + ["A"] * 17 + ["B"])
    text = (
        "\tDid NOT play\tFajr\n"                        # header row: skipped
        f"11/23/2026\t{tasks}\tA\tNone\tB\n"             # plain copy from the sheet
        f"57\t11/24/2026\t{tasks}\t\t\t\n"               # copy that kept a row-number column
    )
    days = parse_sheet(text)
    assert [d.day for d in days] == [date(2026, 11, 23), date(2026, 11, 24)]
    assert days[0].ticks["A"] == set(s.SHEET_COLUMNS) - {"bonus"}
    assert days[0].ticks["B"] == {"gate", "bonus"}
    assert days[0].excused == {"B"}
    assert days[1].excused == set()


def test_parse_handles_emoji_separators():
    row = "11/19/2026\t" + "\t" * 18 + "\t\tZ👺Si 👺B👺\tH"
    d = parse_sheet(row)[0]
    assert d.excused == {"H"}
    assert parse_sheet("11/20/2026\tWeekend\tWeekend, A\tNone")[0].ticks == {"A": {"fajr"}}
    assert parse_sheet("10/27/2026\tNew\tA, H")[0].ticks == {"A": {"fajr"}, "H": {"fajr"}}
