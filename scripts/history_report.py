#!/usr/bin/env python3
"""Reconstruct Grail's two test-progress series from git history.

Both series already exist in the repository; nothing here measures anything new,
it just reads what past commits recorded.

    ./scripts/history_report.py            # both series, markdown
    ./scripts/history_report.py --sunit    # SUnit only
    ./scripts/history_report.py --cpython  # CPython suite only
    ./scripts/history_report.py --daily    # CPython at per-commit resolution
    ./scripts/history_report.py --tsv DIR  # also write TSVs for charting

THE TWO SERIES MEASURE DIFFERENT THINGS, and conflating them flatters the
project:

  * SUnit is Grail's OWN suite.  Every commit is expected to leave it fully
    green, so its count is a measure of accumulated test-writing -- growth, not
    conformance.  A rising line here is the floor being raised, not CPython
    compatibility being won.

  * The CPython suite runs CPython's OWN regression modules unmodified.  Those
    tests were written without regard for what Grail supports, so the pass rate
    is the conformance measure.  It can fall as well as rise -- wiring a new
    module usually ADDS failures before anyone fixes them, which is the point.

SUnit counts are STATIC: a method whose name begins with `test' in a test class
file.  Running the suite at each historical commit would mean an install per
commit, which is hours; the static count tracks it to within ~0.2% (4,336 vs
the runner's 4,344 at the time of writing).  The gap is a handful of tests that
live outside the counted directories.  Treat the SUnit series as a shape, not a
audited total.

The test directory MOVED in March 2026 (smalltalk/tests -> src/smalltalk/
PythonTests), so both layouts are counted; a month that straddles the move is
still correct because each commit is inspected under whichever layout it had.

CPython counts are EXACT -- they are the committed scoreboard's own per-module
rows, summed.  The scoreboard only begins 2026-07-09, which is why that series
starts mid-year: there was no measurement before the harness existed.
"""

import argparse
import re
import subprocess
import sys
from collections import OrderedDict
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOARD = "docs/CPython_Suite_Scoreboard.md"
TEST_DIRS = ("src/smalltalk/PythonTests/", "smalltalk/tests/")
ROW = re.compile(r"^\|\s*(test\.\S+)\s*\|\s*(\w+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|"
                 r"\s*(\d+)\s*\|\s*(\d+)\s*\|")


def git(*args):
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True,
                          text=True, errors="replace").stdout


def rev_before(when):
    """Last commit on origin/main at or before `when` (a date), or None."""
    out = git("rev-list", "-n1", f"--before={when} 23:59:59", "origin/main").strip()
    return out or None


def month_ends(first, last):
    """Month-end dates from `first` through `last`, with `last` itself appended
    when the final month is still in progress -- a partial month reported as if
    it were complete would understate the current figure."""
    out, y, m = [], first.year, first.month
    while (y, m) <= (last.year, last.month):
        nxt = date(y + (m == 12), m % 12 + 1, 1)
        end = nxt - timedelta(days=1)
        out.append(min(end, last))
        y, m = nxt.year, nxt.month
    return out


# ---------------------------------------------------------------- SUnit

def sunit_count(rev):
    """Test methods in the test directories at `rev`.

    The .gs filein format puts the method NAME on the line after `method: Class',
    so the count is of following-lines that start with `test' -- which excludes
    the helper methods (setUp, assertResults:, ...) a bare `method:' count would
    wrongly include."""
    names = [ln for ln in git("ls-tree", "-r", "--name-only", rev).splitlines()
             if ln.endswith(".gs") and ln.startswith(TEST_DIRS)]
    if not names:
        return 0, 0
    total = 0
    for path in names:
        lines = git("show", f"{rev}:{path}").splitlines()
        for i, ln in enumerate(lines[:-1]):
            if ln.startswith("method: ") and lines[i + 1].startswith("test"):
                total += 1
    return total, len(names)


def sunit_series(first, last):
    rows = []
    for when in month_ends(first, last):
        rev = rev_before(when)
        if not rev:
            continue
        n, files = sunit_count(rev)
        rows.append((when, n, files))
    return rows


# -------------------------------------------------------------- CPython

def board_totals(rev):
    """(modules, ok, tests, fail, err, skip) from the scoreboard at `rev`."""
    text = git("show", f"{rev}:{BOARD}")
    mods = ok = tests = fail = err = skip = 0
    for line in text.splitlines():
        m = ROW.match(line)
        if not m:
            continue
        mods += 1
        ok += (m.group(2) == "OK")
        tests += int(m.group(3))
        fail += int(m.group(4))
        err += int(m.group(5))
        skip += int(m.group(6))
    return mods, ok, tests, fail, err, skip


def board_revs():
    """[(date, rev)] for every commit that touched the scoreboard, oldest first,
    keeping the LAST commit of each day so a day with several runs reports where
    it ended up."""
    out = git("log", "--reverse", "--format=%ad %H", "--date=short",
              "origin/main", "--", BOARD)
    by_day = OrderedDict()
    for line in out.splitlines():
        d, h = line.split()
        by_day[d] = h
    return list(by_day.items())


def _bucket(d, period):
    """The bucket key for an ISO date string under `period'."""
    if period == "monthly":
        return d[:7]
    y, w, _ = date.fromisoformat(d).isocalendar()
    return f"{y}-W{w:02d}"


def cpython_series(period="monthly"):
    """Scoreboard totals, one row per period.

    Takes the LAST observation in each bucket -- where the week/month ENDED,
    not its best or first moment -- and always appends the newest observation
    so the in-progress period is represented rather than silently dropped."""
    revs = board_revs()
    if not revs:
        return []
    if period == "daily":
        picked = revs
    else:
        seen = OrderedDict()
        for d, h in revs:
            seen[_bucket(d, period)] = (d, h)
        picked = list(seen.values())
        if revs[-1] not in picked:
            picked.append(revs[-1])
    return [(d, *board_totals(h)) for d, h in picked]


# --------------------------------------------------------------- output

def md_sunit(rows):
    print("### Grail's own SUnit suite — tests present (all passing)\n")
    print("| Month end | Test methods | Added | Test files |")
    print("|---|---:|---:|---:|")
    prev = None
    for when, n, files in rows:
        delta = "—" if prev is None else f"+{n - prev:,}"
        print(f"| {when:%b %Y} | {n:,} | {delta} | {files} |")
        prev = n


def md_cpython(rows, period="monthly"):
    # "Last run in ..." rather than "Week/Month ending": the date shown is the
    # last scoreboard commit IN that bucket, which is usually not the bucket's
    # final calendar day (nobody runs the suite every day, and the newest
    # bucket is still in progress).  Labelling it as the period end would be
    # asserting a measurement on a day we did not measure.
    label = {"daily": "Date",
             "weekly": "Last run in week",
             "monthly": "Last run in month"}[period]
    print(f"\n### CPython regression suite — outcome of every test discovered\n")
    print(f"| {label} | Modules | Modules OK | ΔOK | Tests | Passing | ΔPass | "
          f"Failing | Errors | Skipped | % of run | % of all |")
    print("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|")
    prev_ok = prev_pass = None
    for d, mods, ok, tests, fail, err, skip in rows:
        passing = tests - fail - err - skip
        run = tests - skip
        # Two rates, because they answer different questions and only quoting
        # one of them misleads.  "% of run" is the conformance number: of the
        # tests that actually EXECUTED, how many passed.  "% of all" counts a
        # skip against us, which is the right conservative framing when the
        # skip is Grail-shaped (cpython_only, requires_limited_api) rather than
        # a test CPython itself would skip on this platform.
        r_run = f"{100 * passing / run:.1f}%" if run else "—"
        r_all = f"{100 * passing / tests:.1f}%" if tests else "—"
        d_ok = "—" if prev_ok is None else f"{ok - prev_ok:+d}"
        d_pass = "—" if prev_pass is None else f"{passing - prev_pass:+,d}"
        print(f"| {d} | {mods} | {ok} | {d_ok} | {tests:,} | {passing:,} | {d_pass} | "
              f"{fail:,} | {err:,} | {skip:,} | {r_run} | {r_all} |")
        prev_ok, prev_pass = ok, passing

    # The newest bucket is almost always incomplete, and its deltas therefore
    # cover fewer days than the rows above it -- worth saying, because an
    # apparently slowing final row is usually just a short week.
    if rows and period in ("weekly", "monthly"):
        last = date.fromisoformat(rows[-1][0])
        y, w, dow = last.isocalendar()
        span = dow if period == "weekly" else last.day
        full = 7 if period == "weekly" else 28
        if span < full:
            unit = "week" if period == "weekly" else "month"
            print(f"\n*Final row is a partial {unit}: {span} day"
                  f"{'' if span == 1 else 's'} of data, so its deltas are not "
                  f"comparable with the full {unit}s above.*")


def write_tsv(path, header, rows):
    path.write_text("\t".join(header) + "\n"
                    + "\n".join("\t".join(str(c) for c in r) for r in rows) + "\n")
    print(f"wrote {path}", file=sys.stderr)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--sunit", action="store_true")
    ap.add_argument("--cpython", action="store_true")
    ap.add_argument("--period", choices=("daily", "weekly", "monthly"),
                    default="monthly",
                    help="CPython series resolution (default: monthly)")
    ap.add_argument("--daily", action="store_true",
                    help="shorthand for --period daily")
    ap.add_argument("--weekly", action="store_true",
                    help="shorthand for --period weekly")
    ap.add_argument("--since", default="2026-01-01")
    ap.add_argument("--tsv", metavar="DIR", help="also write TSVs here")
    a = ap.parse_args()
    both = not (a.sunit or a.cpython)
    period = "daily" if a.daily else "weekly" if a.weekly else a.period

    if git("rev-parse", "--verify", "-q", "origin/main").strip() == "":
        sys.exit("no origin/main -- run `git fetch origin main` first")

    today = date.today()
    first = date.fromisoformat(a.since)
    out = Path(a.tsv) if a.tsv else None
    if out:
        out.mkdir(parents=True, exist_ok=True)

    if both or a.sunit:
        rows = sunit_series(first, today)
        md_sunit(rows)
        if out:
            write_tsv(out / "sunit_history.tsv", ["month_end", "test_methods", "files"],
                      [(f"{w:%Y-%m-%d}", n, f) for w, n, f in rows])

    if both or a.cpython:
        rows = cpython_series(period=period)
        md_cpython(rows, period=period)
        if out:
            write_tsv(out / "cpython_history.tsv",
                      ["date", "modules", "modules_ok", "tests", "passing",
                       "failing", "errors", "skipped"],
                      [(d, m, ok, t, t - f - e - s, f, e, s)
                       for d, m, ok, t, f, e, s in rows])


if __name__ == "__main__":
    main()
