"""The Honor rules: daily targets, task list, day scoring, levels and tiers.

Everything here is pure (no database), so it is easy to test and to read.
Day 0 of the programme is 27 October 2026, the first row of the family's sheet.
"""
from __future__ import annotations

from dataclasses import dataclass, replace
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


def day_index(d: date, start: date | None = None) -> int:
    """Days since the program started (the admin's start date): day 0 is Ya Allah."""
    return (d - (start or PROGRAM_START)).days


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


DALAIL_LINKS = (  # Monday … Sunday: a video to read along with
    "https://www.youtube.com/watch?v=O9lFtZyP-Nw", "https://www.youtube.com/watch?v=qxVks92t9aU",
    "https://www.youtube.com/watch?v=8-ODssYYG54", "https://www.youtube.com/watch?v=2zj6Hc2QEKo",
    "https://www.youtube.com/watch?v=2Yws50vvchQ", "https://www.youtube.com/watch?v=Bya8BPdFbNM",
    "https://www.youtube.com/watch?v=BSlyyqH-4dA&t=492s",
)


# Ranks in order, for tasks that get harder (or appear) as a member climbs. Low Honor counts as Member.
RANK_ORDER = ["member", "bronze", "silver", "gold", "platinum", "emerald", "sapphire", "ruby", "diamond", "obsidian", "legendary"]


def rank_index(key: str) -> int:
    return RANK_ORDER.index(key) if key in RANK_ORDER else 0


@dataclass(frozen=True)
class TaskSpec:
    """A task as the admin set it up. The number (if any) is the Bronze number; every rank above Bronze adds
    `rank_step`. A task with `min_rank` only appears from that rank on. (Older tasks grew by `step` every `every`
    days from `start_day`; that daily growth is no longer used.)"""
    key: str
    label: str  # "{n}" marks where the number goes, e.g. "{n} jumping jacks"
    group: str
    fitness: bool = False  # excused on sick days
    number: int | None = None  # the number on start_day
    step: int = 0
    every: int = 1
    start_day: date = PROGRAM_START
    next_day: bool = False  # done at night and counted for the next day (Surah Mulk)
    not_before: str | None = None  # "12:00": members can't tick it earlier in the day
    links: tuple = ()  # up to 7 video links, Monday … Sunday ("" = none that day)
    rank_step: int = 0  # added to the number for every rank above Bronze
    min_rank: str = ""  # "" = every rank; else the task appears from this rank on
    at_rank: int = 1  # the member's rank (index in RANK_ORDER) this task is shown for; set by day_plan
    rank_numbers: tuple = ()  # (rank, number) pairs: the number set by hand for each rank (else Bronze number + rank_step)
    quest_number: int | None = None  # the number while on the Legendary quest (None: the Legendary rank's number)
    on_quest: bool = False  # set by day_plan on Legendary quest days

    def link_on(self, d: date) -> str | None:
        return (self.links[d.weekday()] or None) if len(self.links) == 7 else None

    def number_on(self, d: date) -> int | None:
        if self.number is None:
            return None
        if self.on_quest and self.quest_number is not None:
            return max(0, self.quest_number)
        if self.rank_numbers and 0 < self.at_rank < len(RANK_ORDER):
            by = dict(self.rank_numbers)
            if RANK_ORDER[self.at_rank] in by:
                return max(0, int(by[RANK_ORDER[self.at_rank]]))
        daily = self.step * ((d - self.start_day).days // max(1, self.every)) if self.step else 0
        return max(0, self.number + daily + self.rank_step * max(0, self.at_rank - 1))

    def label_on(self, d: date) -> str:
        n = self.number_on(d)
        return self.label.replace("{n}", str(n)) if n is not None else self.label.replace("{n}", "").strip()


# The tasks as they were in the family's sheet (copied into the database on first start).
DEFAULT_SPECS: list[TaskSpec] = [
    TaskSpec("fajr", "Fajr", "Ibadah"),
    TaskSpec("yaseen", "Yaseen Sharif", "Ibadah"),
    TaskSpec("dalail", "Dalilul Khairat", "Ibadah", links=DALAIL_LINKS),
    TaskSpec("darood", "{n} × Darood Sharif", "Ibadah", number=251, rank_step=25),
    TaskSpec("zikr", "5 minutes Zikr together", "Ibadah"),
    TaskSpec("asr", "Asr ki 4 Sunnat", "Ibadah", not_before="12:00"),
    TaskSpec("mulk", "Surah Mulk", "Ibadah", next_day=True),
    TaskSpec("pages", "{n} pages", "Learning & home", number=2, rank_step=1),
    TaskSpec("lang", "Language", "Learning & home"),
    TaskSpec("milk", "Milk", "Learning & home"),
    TaskSpec("assist", "Assistance", "Learning & home"),
    TaskSpec("lap", "{n} laps", "Fitness", True, number=2, rank_step=0),
    TaskSpec("jj", "{n} jumping jacks", "Fitness", True, number=100, rank_step=10),
    TaskSpec("push", "{n} push-ups", "Fitness", True, number=10, rank_step=2),
    TaskSpec("sit", "{n} sit-ups", "Fitness", True, number=1, rank_step=2),
    TaskSpec("plank", "{n} s plank", "Fitness", True, number=10, rank_step=5),
    TaskSpec("mc", "{n} s mountain climbers", "Fitness", True, number=10, rank_step=5),
]

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


def for_member(periods: list | None, member_id: str) -> list:
    """The special periods that apply to one member (a period with no members chosen applies to everyone)."""
    return [p for p in (periods or []) if not (getattr(p, "members", None) or []) or member_id in p.members]


def day_plan(specs: list, periods: list | None, d: date, rank: int | None = None, quest: bool = False) -> list:
    """The tasks that apply on day `d` for a member of rank `rank` (index in RANK_ORDER): tasks get harder with rank,
    some only appear from a rank on, and special periods (like Ramadan) can pause tasks or fix a smaller number."""
    if rank is not None:
        specs = [replace(t, at_rank=rank, on_quest=quest) for t in specs
                 if not getattr(t, "min_rank", "") or rank >= rank_index(t.min_rank)]
    if not periods:
        return specs
    off: set[str] = set()
    numbers: dict[str, int] = {}
    for per in periods:
        if per.start <= d <= per.end:
            off |= set(per.off or [])
            numbers |= {k: int(v) for k, v in (per.numbers or {}).items()}
    if not off and not numbers:
        return specs
    out = []
    for t in specs:
        if t.key in off:
            continue
        if t.key in numbers and getattr(t, "number", None) is not None:
            t = replace(t, number=numbers[t.key], step=0, rank_step=0, start_day=d)
        out.append(t)
    return out


def credited(done, prev_done, tasks: list | None = None, first_day: bool = False) -> set[str]:
    """What counts for a day. Night tasks (like Surah Mulk) ticked one day count for the next day,
    so a day gets them from the day before. A member's first day gets them free (there was no night before)."""
    night = {t.key for t in (tasks if tasks is not None else DEFAULT_SPECS) if getattr(t, "next_day", False)}
    out = set(done or [])
    if not night:
        return out
    return (out - night) | (night if first_day else night & set(prev_done or []))


# From this day: all tasks done → +1 (move on); at least half → 0 (hold your rank); less than half → −1 (cut).
# Days before it keep the old rule (cut when `cut_misses` or more tasks were missed), so past Honor doesn't change.
HALF_RULE_FROM = date(2026, 11, 27)


def score_day(d: date, done: set[str] | list[str] | None, excuse: str | None, today: date, cut_misses: int,
              tasks: list | None = None, skip: set[str] | dict | None = None, bonus_on: bool = True) -> DayScore:
    """+1 for the pledge and all the day's tasks, +1 for the bonus (only after all tasks, only on the Legendary quest).
    A finished weekday with fewer than half of its tasks done is cut −1; half or more holds (0). (Before HALF_RULE_FROM:
    cut when `cut_misses` or more were missed.)

    An excused day (a reason was written) excuses the fitness tasks and is never cut.
    Weekends: no pledge needed, nothing is cut. Today is never cut while it is still open.
    """
    done = set(done or [])
    excused = bool(excuse and excuse.strip())
    weekend = is_weekend(d)
    skip = set(skip or [])  # single tasks excused that day, with a reason
    req = [t.key for t in (tasks if tasks is not None else TASKS) if not (excused and t.fitness) and t.key not in skip]
    missed = sum(1 for k in req if k not in done)
    pledge = weekend or "gate" in done
    gain = 1 if pledge and missed == 0 else 0
    bonus = 1 if bonus_on and gain and "bonus" in done else 0  # only on the Legendary quest, once every task is done
    if d >= HALF_RULE_FROM:
        short = len(req) > 0 and (len(req) - missed) * 2 < len(req)  # fewer than half of the day's tasks done
    else:
        short = missed >= cut_misses
    cut = -1 if (not weekend and not excused and d < today and short) else 0
    return DayScore(gain, bonus, cut, len(req) - missed, len(req), weekend, excused)


def date_range(start: date, end: date):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)
