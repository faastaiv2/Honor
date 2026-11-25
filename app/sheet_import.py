"""Read rows pasted from the family's Google/Excel sheet.

A day row looks like: date, pledge, 17 task columns, bonus, honor received, honor cut, exceptions,
where each task cell lists the initials of who did it ("A, Si, Z, B"). Header rows (no date) are skipped.
A leading row-number column is tolerated: the date column is found on each row.
"""
import re
from dataclasses import dataclass, field
from datetime import date, datetime

from app.scoring import SHEET_COLUMNS

_DATE = re.compile(r"^\s*(\d{1,2})/(\d{1,2})/(\d{4})\s*$")


@dataclass
class ParsedDay:
    day: date
    ticks: dict[str, set[str]] = field(default_factory=dict)  # initials -> task keys
    excused: set[str] = field(default_factory=set)            # initials listed under Exceptions


def _initials(cell: str) -> list[str]:
    # "Z👺Si 👺B👺" and "A, Si" both work: split on anything that is not a letter.
    # Words such as "Weekend", "None" or "New" are longer than any initials (at most 3 letters).
    return [p for p in re.split(r"[^A-Za-z]+", cell or "") if 0 < len(p) <= 3]


def parse_sheet(text: str) -> list[ParsedDay]:
    days = []
    for line in text.splitlines():
        cells = line.split("\t")
        idx = next((i for i, c in enumerate(cells[:3]) if _DATE.match(c)), None)
        if idx is None:
            continue
        m = _DATE.match(cells[idx])
        try:
            d = datetime(int(m.group(3)), int(m.group(1)), int(m.group(2))).date()
        except ValueError:
            continue
        rest = cells[idx + 1:] + [""] * 30
        pd = ParsedDay(d)
        for key, cell in zip(SHEET_COLUMNS, rest[: len(SHEET_COLUMNS)]):
            for who in _initials(cell):
                pd.ticks.setdefault(who, set()).add(key)
        exceptions = rest[len(SHEET_COLUMNS) + 2]  # after "honor received" and "honor cut"
        pd.excused.update(_initials(exceptions))
        days.append(pd)
    return days
