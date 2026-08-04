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

Only the Status cell of each in-scope row is touched, plus the two <!-- tag -->
blocks that report the tallies; module names, rationales, row order and every
other section are left byte-identical.  The out-of-scope tables deliberately have
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

# "### P1 -- Core language & built-in types  .  90 modules"
TIER_HEADING = re.compile(r"^### (P[1-4]) — ")
# A module row, with a Status cell (glyph, ❓ from the first cut of this column,
# or empty) or without one at all -- the last case also covering the legacy
# trailing-tick form (`test_foo` ✅) this column replaced.
ROW = re.compile(
    r"^\|(?:\s*(?:" + "|".join(GLYPHS) + r"|❓)?\s*\|)?"
    r"\s*`(test_\w+)`(?:\s*" + OK + r")?\s*\|\s*(.*?)\s*\|\s*$"
)


def manifest_modules():
    """Dotted module names wired into the harness, as bare test_* names."""
    names = []
    for line in MANIFEST.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            names.append(line.split(".")[-1])
    return names


def scoreboard_status():
    """{test_foo: 'OK'|'ERROR'|...} from the committed per-module rows."""
    status = {}
    row = re.compile(r"^\|\s*test\.(test_\w+)\s*\|\s*(\w+)\s*\|")
    for line in SCOREBOARD.read_text().splitlines():
        m = row.match(line)
        if m:
            status[m.group(1)] = m.group(2)
    return status


def icon_for(module, listed, status):
    if module not in listed:
        return UNKNOWN
    return OK if status.get(module) == "OK" else NOT_OK


def rewrite(text, listed, status):
    """Rewrite the in-scope tier tables; return (new_text, per-tier counts)."""
    out = []
    counts = {}
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
            out.append("| %s | `%s` | %s |" % (icon, module, rationale))
            continue

        out.append(line)

    return "\n".join(out) + ("\n" if text.endswith("\n") else ""), counts


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


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--check", action="store_true",
                    help="report drift and exit 1 instead of rewriting")
    args = ap.parse_args()

    listed = manifest_modules()
    status = scoreboard_status()

    missing = sorted(set(listed) - set(status))
    if missing:
        print("warning: in the manifest but absent from the scoreboard "
              "(shown as %s): %s" % (NOT_OK, ", ".join(missing)),
              file=sys.stderr)

    old = SCOPE.read_text()
    new, counts = rewrite(old, listed, status)

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
