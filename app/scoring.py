"""The Honor rules: daily targets, task list, day scoring, levels and tiers.

Everything here is pure (no database), so it is easy to test and to read.
Day 0 of the programme is 27 October 2026, the first row of the family's sheet.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

PROGRAM_START = date(2026, 10, 27)

# 300x dhikr of the day: Allah, then the 99 Names in the sheet's order. After that, 1000x Astaghfar.
NAMES = [
    "الله", "الرحمن", "الرحيم", "المالك", "القدوس", "السلام", "المؤمن", "المهيمن", "العزيز", "الجبار",
    "المتكبر", "الخالق", "البارئ", "المصور", "الغفار", "القهار", "الوهاب", "الرزاق", "الفتاح", "العليم",
    "القابض", "الباسط", "الخافض", "الرافع", "المعز", "المذل", "السميع", "البصير", "الحكم", "العدل",
    "اللطيف", "الخبير", "الحليم", "العظيم", "الغفور", "الشكور", "العلي", "الكبير", "الحفيظ", "المقيت",
    "الحسيب", "الجليل", "الكريم", "الرقيب", "المجيب", "الواسع", "الحكيم", "الودود", "المجيد", "الباعث",
    "الشهيد", "الحق", "الوكيل", "القوي", "المتين", "الولي", "الحميد", "المحصي", "المبدئ", "المعيد",
    "المحيي", "المميت", "الحي", "القيوم", "الواجد", "الماجد", "الواحد", "الأحد", "الصمد", "القادر",
    "المقتدر", "المقدم", "المؤخر", "الأول", "الآخر", "الظاهر", "الباطن", "الوالي", "المتعالي", "البر",
    "التواب", "المنتقم", "العفو", "الرؤوف", "مالك الملك", "ذو الجلال والإكرام", "المقسط", "الجامع", "الغني", "المغني",
    "المانع", "الضار", "النافع", "النور", "الهادي", "البديع", "الباقي", "الوارث", "الرشيد", "الصبور",
]


def day_index(d: date) -> int:
    return (d - PROGRAM_START).days


def is_weekend(d: date) -> bool:
    """Friday and Saturday are the weekend, as in the sheet."""
    return d.weekday() in (4, 5)


def _step(i: int) -> int:
    return (i + 2) // 4


def darood(i: int) -> int:
    return 100 + 10 * i if i <= 15 else 250 + (i - 15)


def pages(i: int) -> int:
    return 1 if i < 7 else 2 if i < 48 else 3 if i < 80 else 4 if i < 123 else 5


def laps(i: int) -> int:
    return 1 if i < 20 else 2 if i < 75 else 3


def _plural(n: int, one: str, many: str) -> str:
    return f"{n} {one if n == 1 else many}"


@dataclass(frozen=True)
class Task:
    key: str
    group: str
    fitness: bool = False


TASKS: list[Task] = [
    Task("fajr", "Ibadah"),
    Task("yaseen", "Ibadah"),
    Task("dalail", "Ibadah"),
    Task("darood", "Ibadah"),
    Task("zikr", "Ibadah"),
    Task("asr", "Ibadah"),
    Task("mulk", "Ibadah"),
    Task("pages", "Learning & home"),
    Task("lang", "Learning & home"),
    Task("milk", "Learning & home"),
    Task("assist", "Learning & home"),
    Task("lap", "Fitness", True),
    Task("jj", "Fitness", True),
    Task("push", "Fitness", True),
    Task("sit", "Fitness", True),
    Task("plank", "Fitness", True),
    Task("mc", "Fitness", True),
]
REQUIRED = [t.key for t in TASKS]
ALL_KEYS = {"gate", "bonus", *REQUIRED}

# Column order of the sheet after the date: pledge, the 17 tasks, bonus.
SHEET_COLUMNS = ["gate", "fajr", "yaseen", "dalail", "darood", "pages", "zikr", "lang", "asr", "milk",
                 "assist", "mulk", "lap", "jj", "push", "sit", "plank", "mc", "bonus"]


def task_label(key: str, i: int) -> str:
    i = max(0, i)
    s = _step(i)
    return {
        "gate": "Did not betray Honor — no games or YouTube over the limit",
        "fajr": "Fajr",
        "yaseen": "Yaseen Sharif",
        "dalail": "Dalilul Khairat",
        "darood": f"{darood(i)} × Darood Sharif",
        "zikr": "5 minutes Zikr together",
        "asr": "Asr ki 4 Sunnat",
        "mulk": "Surah Mulk",
        "pages": _plural(pages(i), "page", "pages"),
        "lang": "Language",
        "milk": "Milk",
        "assist": "Assistance",
        "lap": _plural(laps(i), "lap", "laps"),
        "jj": f"{100 + i} jumping jacks",
        "push": f"{10 + s} push-ups",
        "sit": f"{1 + s} sit-ups",
        "plank": f"{10 + i} s plank",
        "mc": f"{10 + i} s mountain climbers",
        "bonus": bonus_text(i),
    }[key]


def bonus_parts(i: int) -> tuple[str, str]:
    """(count, dhikr) for the day's bonus, e.g. ("300×", "يا حكم")."""
    i = max(0, i)
    if i < len(NAMES):
        name = NAMES[i]
        name = name[2:] if name.startswith("ال") and name != "الله" else name
        return "300×", f"يا {name}"
    return "1000×", "Astaghfar"


def bonus_text(i: int) -> str:
    count, dhikr = bonus_parts(i)
    return f"{count} {dhikr}"


@dataclass(frozen=True)
class DayScore:
    gain: int
    bonus: int
    cut: int
    done: int
    of: int
    weekend: bool
    excused: bool

    @property
    def delta(self) -> int:
        return self.gain + self.bonus + self.cut


def score_day(d: date, done: set[str] | list[str] | None, excuse: str | None, today: date, cut_misses: int) -> DayScore:
    """+1 for the pledge and all 17 tasks, +1 for the bonus, -1 when a finished weekday misses any task
    (`cut_misses` is 1; a larger number would allow some misses).

    An excused day (a reason was written) excuses the fitness tasks and is never cut.
    Weekends: no pledge needed, nothing is cut. Today is never cut while it is still open.
    """
    done = set(done or [])
    excused = bool(excuse and excuse.strip())
    weekend = is_weekend(d)
    req = [t.key for t in TASKS if not (excused and t.fitness)]
    missed = sum(1 for k in req if k not in done)
    pledge = weekend or "gate" in done
    gain = 1 if pledge and missed == 0 else 0
    bonus = 1 if pledge and "bonus" in done else 0
    cut = -1 if (not weekend and not excused and d < today and missed >= cut_misses) else 0
    return DayScore(gain, bonus, cut, len(req) - missed, len(req), weekend, excused)


def date_range(start: date, end: date):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)
