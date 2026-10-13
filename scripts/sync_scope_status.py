#!/usr/bin/env python3
"""Refresh the Status column of the in-scope tables in docs/Grail_CPython_Scope.md.

The scope document lists every CPython regression module and tags it in-scope
(tier P1-P4) or out-of-scope.  Each in-scope table carries a leading Status
column saying where that module stands in the measurement harness:

    OK_ICON      in scripts/cpython_suite_manifest.txt, scoring OK
    NOT_OK_ICON  in the manifest, but FAIL/ERROR/IMPORTERROR/CRASH/TIMEOUT/...
    (blank)      not in the manifest -- never measured

Those three facts live in two other files (the manifest and the committed
per-module rows of docs/CPython_Suite_Scoreboard.md), so the column is derived,
not authored.  Run this after a suite run that moves a row:

    python3 scripts/sync_scope_status.py            # rewrite the doc
    python3 scripts/sync_scope_status.py --check    # exit 1 if out of date

Only the Status cell of each in-scope row is touched, plus the <!-- tag -->
blocks that report what the board says (module tallies, test counts, and the
rows that are not OK); module names, rationales, row order and every other
section are left byte-identical.  CI runs --check, and the nightly's
baseline-refresh PR re-runs this beside the board it commits.  The out-of-scope tables deliberately have
no Status column -- for them "not measured" is the intent rather than a gap.
"""

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCOPE = ROOT / "docs" / "Grail_CPython_Scope.md"
SCOREBOARD = ROOT / "docs" / "CPython_Suite_Scoreboard.md"
MANIFEST = ROOT / "scripts" / "cpython_suite_manifest.txt"

OK = "✅"  # white heavy check mark
NOT_OK = "❗"  # heavy exclamation mark
# Not-measured is an EMPTY cell, not a glyph: it is the overwhelming majority of
# rows (205 of 255), and any mark there competes with the two that carry news.
UNKNOWN = ""
GLYPHS = (OK, NOT_OK)

HEADER = "| Status | Module | Rationale |"
SEPARATOR = "|:------:|--------|-----------|"

# Prose tallies are derived too, so they cannot drift out of step with the
# column.  Each is regenerated between a matching pair of HTML comments.
TALLY_TABLE_TAG = "status-tally"
WIRED_SENTENCE_TAG = "wired-tally"
TEST_TALLY_TAG = "test-tally"
NOT_OK_ROWS_TAG = "not-ok-rows"

# An OK row at or above this skipped fraction is listed by name under the test
# tally, so a green module that runs little of itself is visible as such.
HEAVY_SKIP = 0.5

# "### P1 -- Core language & built-in types  .  90 modules"
TIER_HEADING = re.compile(r"^### (P[1-4]) — ")
# A module row, with a Status cell (glyph, ❓ from the first cut of this column,
# or empty) or without one at all -- the last case also covering the legacy
# trailing-tick form (`test_foo` ✅) this column replaced.
ROW = re.compile(
    r"^\|(?:\s*(?:" + "|".join(GLYPHS) + r"|❓)?\s*\|)?"
    r"\s*`(test_\w+)`(?:\s*" + OK + r")?\s*\|\s*(.*?)\s*\|\s*$"
)


def scope_name(dotted):
    """The scope-document row a manifest/scoreboard name belongs to.

    ``test.test_foo'' is row test_foo.  A package's submodule --
    ``test.test_asyncio.test_locks'' -- belongs to its PACKAGE's row,
    test_asyncio.  Taking the LAST component instead filed
    test.test_asyncio.test_context under the unrelated top-level
    test_context (contextvars), which nobody had measured."""
    parts = dotted.split(".")
    return parts[1] if len(parts) > 1 and parts[0] == "test" else parts[-1]


def manifest_modules():
    """Dotted module names wired into the harness, as scope row names."""
    names = []
    for line in MANIFEST.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            names.append(scope_name(line))
    return names


BOARD_ROW = re.compile(
    r"^\|\s*(test\.test_\w+(?:\.\w+)*)\s*\|\s*(\w+)\s*\|"
    r"\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|")


def scoreboard_rows():
    """[(dotted, status, tests, fail, err, skip)] in board order."""
    rows = []
    for line in SCOREBOARD.read_text().splitlines():
        m = BOARD_ROW.match(line)
        if m:
            rows.append((m.group(1), m.group(2))
                        + tuple(int(g) for g in m.groups()[2:]))
    return rows


def scoreboard_status(rows):
    """{test_foo: 'OK'|'ERROR'|...} from the committed per-module rows.  A
    package row is OK only while every one of its wired submodules is."""
    status = {}
    for dotted, st, *_ in rows:
        name = scope_name(dotted)
        if status.get(name, "OK") == "OK":
            status[name] = st
    return status


def icon_for(module, listed, status):
    if module not in listed:
        return UNKNOWN
    return OK if status.get(module) == "OK" else NOT_OK


def rewrite(text, listed, status):
    """Rewrite the in-scope tier tables; return (new_text, per-tier counts,
    {test_foo: tier})."""
    out = []
    counts = {}
    tiers = {}
    tier = None
    for line in text.splitlines():
        heading = TIER_HEADING.match(line)
        if heading:
            tier = heading.group(1)
            counts[tier] = {OK: 0, NOT_OK: 0, UNKNOWN: 0}
            out.append(line)
            continue
        # Out-of-scope sections (and everything after the tier tables) are
        # left alone; only "### P<n>" opens a table this script owns.
        if line.startswith("### ") or line.startswith("## "):
            tier = None
            out.append(line)
            continue
        if tier is None:
            out.append(line)
            continue

        if line.startswith("| Module ") or line.startswith(HEADER):
            out.append(HEADER)
            continue
        # The separator row, at whatever width -- but NOT a blank line or a
        # `---` rule, both of which are also subsets of these characters.
        if line.startswith("|") and set(line) <= set("|-: "):
            out.append(SEPARATOR)
            continue

        m = ROW.match(line)
        if m:
            module, rationale = m.group(1), m.group(2)
            icon = icon_for(module, listed, status)
            counts[tier][icon] += 1
            tiers[module] = tier
            out.append("| %s | `%s` | %s |" % (icon, module, rationale))
            continue

        out.append(line)

    return ("\n".join(out) + ("\n" if text.endswith("\n") else ""), counts,
            tiers)


def replace_block(text, tag, body):
    """Replace the content between <!-- tag --> and <!-- /tag -->."""
    open_t, close_t = "<!-- %s -->" % tag, "<!-- /%s -->" % tag
    pattern = re.compile(re.escape(open_t) + ".*?" + re.escape(close_t), re.S)
    if not pattern.search(text):
        sys.exit("%s has no '%s ... %s' block" % (SCOPE.name, open_t, close_t))
    return pattern.sub(
        lambda _: "%s\n%s\n%s" % (open_t, body.strip("\n"), close_t), text)


def tally_table(counts, totals):
    """The per-tier Status breakdown, as a markdown table."""
    rows = ["| Tier | %s OK | %s not OK | not measured | Total |"
            % (OK, NOT_OK),
            "|------|------:|----------:|-------------:|------:|"]
    for tier in sorted(counts):
        c = counts[tier]
        rows.append("| %s | %d | %d | %d | %d |"
                    % (tier, c[OK], c[NOT_OK], c[UNKNOWN], sum(c.values())))
    rows.append("| **In-scope** | **%d** | **%d** | **%d** | **%d** |"
                % (totals[OK], totals[NOT_OK], totals[UNKNOWN],
                   sum(totals.values())))
    return "\n".join(rows)


def wired_sentence(counts, totals):
    per_tier = " · ".join(
        "%s %d" % (tier, counts[tier][OK] + counts[tier][NOT_OK])
        for tier in sorted(counts) if counts[tier][OK] + counts[tier][NOT_OK])
    return ("Of the %d in-scope modules, **%d are wired into the harness** (%s) "
            "and **%d of those score OK**."
            % (sum(totals.values()), totals[OK] + totals[NOT_OK], per_tier,
               totals[OK]))


def test_tally(rows, tiers):
    """Per-tier test counts from the board, with passing = tests - failures -
    errors - skipped: a skip is not a pass.  Then the OK rows that skip at
    least HEAVY_SKIP of themselves, by name."""
    by_tier = {}
    for dotted, _st, tests, fail, err, skip in rows:
        t = by_tier.setdefault(tiers.get(scope_name(dotted), "other"),
                               [0, 0, 0, 0])
        t[0] += 1
        t[1] += tests
        t[2] += skip
        t[3] += tests - fail - err - skip

    def line(label, nrows, tests, skip, passing, bold=""):
        pct = "%d%%" % round(100.0 * skip / tests) if tests else "-"
        cells = ["%d" % v for v in (nrows, tests, skip, passing)] + [pct]
        return "| %s | %s |" % (label, " | ".join(
            bold + c + bold for c in cells))

    out = ["| Tier | board rows | tests | skipped | passing | skipped % |",
           "|------|-----------:|------:|--------:|--------:|----------:|"]
    total = [0, 0, 0, 0]
    for tier in sorted(by_tier):
        out.append(line(tier, *by_tier[tier]))
        total = [a + b for a, b in zip(total, by_tier[tier])]
    out.append(line("**all**", *total, bold="**"))

    heavy = ["`%s` %d of %d" % (scope_name(d), skip, tests)
             for d, st, tests, _f, _e, skip in rows
             if st == "OK" and tests and skip / tests >= HEAVY_SKIP]
    if heavy:
        out += ["", "OK rows that skip at least %d%% of their tests: %s."
                % (round(100 * HEAVY_SKIP), " · ".join(heavy))]
    return "\n".join(out)


def not_ok_rows(rows, unmeasured):
    """The board rows that are not OK, each with its counts, then the wired
    modules the board has no row for yet (the nightly measures them next)."""
    bad = [r for r in rows if r[1] != "OK"]
    out = ["**%d of the %d rows on the committed board are not OK.**"
           % (len(bad), len(rows))]
    if bad:
        out.append("")
    for dotted, st, tests, fail, err, skip in bad:
        out.append("- `%s` %s, %d tests: %d failed, %d errors, %d skipped"
                   % (dotted, st, tests, fail, err, skip))
    if unmeasured:
        out += ["", "Wired, but not on the board until the next nightly "
                "measures them: %s." % ", ".join(
                    "`%s`" % m for m in unmeasured)]
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true",
                    help="report drift and exit 1 instead of rewriting")
    args = ap.parse_args()

    listed = manifest_modules()
    rows = scoreboard_rows()
    status = scoreboard_status(rows)

    missing = sorted(set(listed) - set(status))
    if missing:
        print("warning: in the manifest but absent from the scoreboard "
              "(shown as %s): %s" % (NOT_OK, ", ".join(missing)),
              file=sys.stderr)

    old = SCOPE.read_text()
    new, counts, tiers = rewrite(old, listed, status)

    totals = {OK: 0, NOT_OK: 0, UNKNOWN: 0}
    for tier in sorted(counts):
        c = counts[tier]
        for k in totals:
            totals[k] += c[k]
        print("%s: %s %-3d %s %-3d unmeasured %-3d (%d modules)"
              % (tier, OK, c[OK], NOT_OK, c[NOT_OK], c[UNKNOWN],
                 sum(c.values())))

    new = replace_block(new, TALLY_TABLE_TAG, tally_table(counts, totals))
    new = replace_block(new, WIRED_SENTENCE_TAG, wired_sentence(counts, totals))
    new = replace_block(new, TEST_TALLY_TAG, test_tally(rows, tiers))
    new = replace_block(new, NOT_OK_ROWS_TAG, not_ok_rows(rows, missing))
    print("in-scope total: %s %d  %s %d  unmeasured %d  (%d modules, %d wired)"
          % (OK, totals[OK], NOT_OK, totals[NOT_OK], totals[UNKNOWN],
             sum(totals.values()), totals[OK] + totals[NOT_OK]))

    if new == old:
        print("%s is up to date." % SCOPE.relative_to(ROOT))
        return 0
    if args.check:
        print("%s is OUT OF DATE -- run scripts/sync_scope_status.py"
              % SCOPE.relative_to(ROOT), file=sys.stderr)
        return 1
    SCOPE.write_text(new)
    print("rewrote %s" % SCOPE.relative_to(ROOT))
    return 0


if __name__ == "__main__":
    sys.exit(main())
