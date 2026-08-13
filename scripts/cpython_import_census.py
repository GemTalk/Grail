#!/usr/bin/env python3
"""Ask, for every in-scope CPython test module Grail has never measured, whether
the module it TESTS can be imported today.

The scoreboard says where the 50 wired modules stand.  It says nothing about the
other 205 in-scope ones, because wiring a module means vendoring its test file
into src/python/stdlib/test/ first -- a deliberate act, and the reason the
scoreboard's denominator moves so slowly.  So "how far is the suite from done"
is mostly a question about modules nobody has run.

Importing the SUBJECT is the cheap proxy.  `test_zoneinfo' is worth vendoring if
`import zoneinfo' works and is dead weight if it does not, and the probe costs
one import instead of a vendored file and a full test run.  This script derives
the unmeasured in-scope list from docs/Grail_CPython_Scope.md, maps each
`test_x' to its subject module, and runs scripts/cpython_import_census.gs over
them in a Grail session.

    ./scripts/cpython_import_census.py              # probe + report
    ./scripts/cpython_import_census.py --report     # re-print the last TSV

Verdicts per module:

    IMPORTS     subject imports -- vendoring the test file is the only step left
    MISSING     no such module in Grail -- implement/vendor the subject first
    ERROR       the subject exists and its import RAISED -- a real bug, and the
                highest-value kind of finding here
    NO_SUBJECT  no stdlib module of that name: a language/interpreter test
                (test_grammar, test_scope) that needs no subject, or a name this
                script could not map.  Both are candidates for wiring.
    CRASH       the probe killed the session; the driver resumes past it

"Is this a stdlib module?" is answered by scripts/cpython_314_stdlib_modules.txt
-- the 3.14 series the scope document targets -- not by the interpreter running
this script, which ./.setenv pins to 3.13 for unrelated reasons.

Output is out/cpython/import_census.tsv (gitignored, like the rest of out/).
Nothing here is committed and nothing gates CI: this is a survey to point the
next vendoring effort, not a measurement of conformance.
"""

import argparse
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCOPE = ROOT / "docs" / "Grail_CPython_Scope.md"
MANIFEST = ROOT / "scripts" / "cpython_suite_manifest.txt"
PROBE = ROOT / "scripts" / "cpython_import_census.gs"
STDLIB_NAMES = ROOT / "scripts" / "cpython_314_stdlib_modules.txt"
OUTDIR = ROOT / "out" / "cpython"
TSV = OUTDIR / "import_census.tsv"

TIER_HEADING = re.compile(r"^### (P[1-4]) — ")
ROW = re.compile(r"^\|\s*(\S*)\s*\|\s*`(test_\w+)`\s*\|")

TOPAZ_CFG = "GEM_TEMPOBJ_CODE_SIZE=300000;GEM_TEMPOBJ_CACHE_SIZE=500000;"


def stdlib_names():
    """The 3.14 module-name universe, from the vendored list.

    Deliberately NOT sys.stdlib_module_names of whatever interpreter runs this:
    ./.setenv prepends python@3.13 to PATH (the C shim needs its
    python3-config), so every census run from a configured shell classified
    against 3.13 -- which has no `annotationlib', so test_annotationlib was
    filed as a language test rather than probed.  The scope document targets
    3.14.4; the list has to as well.
    """
    if not STDLIB_NAMES.exists():
        sys.exit("missing %s -- see its header for how to regenerate"
                 % STDLIB_NAMES.relative_to(ROOT))
    names = {
        line.strip()
        for line in STDLIB_NAMES.read_text().splitlines()
        if line.strip() and not line.startswith("#")
    }
    # Free drift check when the interpreter happens to BE a 3.14: a vendored
    # list that has fallen behind the series it claims is worth knowing about,
    # and this is the only moment we can tell.
    if sys.version_info[:2] == (3, 14):
        live = set(sys.stdlib_module_names)
        if live != names:
            print("note: vendored 3.14 list differs from this %s interpreter "
                  "(+%d/-%d); see %s"
                  % (sys.version.split()[0], len(live - names), len(names - live),
                     STDLIB_NAMES.name), file=sys.stderr)
    return names


def unmeasured_by_tier():
    """[(tier, test_module)] for in-scope rows with an empty Status cell.

    Reads the same tables scripts/sync_scope_status.py maintains; an empty
    Status cell is precisely "not in the manifest, never run".
    """
    wired = {
        line.strip().split(".")[-1]
        for line in MANIFEST.read_text().splitlines()
        if line.strip() and not line.strip().startswith("#")
    }
    out, tier = [], None
    for line in SCOPE.read_text().splitlines():
        heading = TIER_HEADING.match(line)
        if heading:
            tier = heading.group(1)
            continue
        if line.startswith("### ") or line.startswith("## "):
            tier = None
            continue
        if tier is None:
            continue
        m = ROW.match(line)
        if m and not m.group(1) and m.group(2) not in wired:
            out.append((tier, m.group(2)))
    return out


def subject_for(test_module, stdlib):
    """The stdlib module `test_x' exercises, or None.

    Three rules, in order, so the mapping stays auditable rather than becoming a
    hand-maintained alias table that silently rots:
      test_json      -> json          (exact)
      test_urllib2   -> urllib        (trailing digits are a suite-local suffix)
      test_email_x   -> email         (the leading component is the package)
    A name that survives all three has no subject module -- usually a language
    test, occasionally one that needs a mapping by hand.
    """
    base = test_module[len("test_"):]
    if base in stdlib:
        return base
    stripped = re.sub(r"\d+$", "", base)
    if stripped and stripped in stdlib:
        return stripped
    head = base.split("_")[0]
    if head in stdlib:
        return head
    return None


def run_probe(names):
    """{name: (verdict, detail)} -- restarting past any name that kills topaz."""
    OUTDIR.mkdir(parents=True, exist_ok=True)
    names_file = OUTDIR / "import_census_names.txt"
    names_file.write_text("\n".join(names) + "\n")

    env = dict(os.environ)
    env["GRAIL_DIR"] = str(ROOT)
    env["GRAIL_CENSUS_NAMES"] = str(names_file)

    verdicts, offset = {}, 0
    while offset < len(names):
        env["GRAIL_CENSUS_OFFSET"] = str(offset)
        try:
            proc = subprocess.run(
                ["topaz", "-lq", "-C", TOPAZ_CFG, "-S", str(PROBE)],
                cwd=ROOT, env=env, stdin=subprocess.DEVNULL,
                capture_output=True, text=True, errors="replace",
            )
        except FileNotFoundError:
            sys.exit("topaz not on PATH -- run `source .setenv` first")
        probing, done, progressed = None, False, 0
        for line in proc.stdout.splitlines():
            if line.startswith("CENSUS_FATAL|"):
                sys.exit("probe failed: " + line.split("|", 1)[1])
            if line.startswith("CENSUS_PROBE|"):
                probing = line.split("|", 1)[1]
            elif line.startswith("CENSUS|"):
                _, name, verdict, detail = line.split("|", 3)
                verdicts[name] = (verdict, detail)
                probing, progressed = None, progressed + 1
            elif line.startswith("CENSUS_DONE|"):
                done = True
        if done:
            break
        # The session died.  `probing' names the import that killed it -- record
        # it and resume at the next name, so one bad module costs one restart
        # rather than the rest of the census.
        if probing is not None:
            verdicts[probing] = ("CRASH", "probe killed the session")
            offset = names.index(probing) + 1
            print("  ! %s crashed the session, resuming" % probing, file=sys.stderr)
        elif progressed:
            offset += progressed
        else:
            sys.exit("probe made no progress at offset %d; see topaz output:\n%s"
                     % (offset, proc.stdout[-2000:]))
    return verdicts


def write_tsv(rows):
    OUTDIR.mkdir(parents=True, exist_ok=True)
    with TSV.open("w") as fh:
        fh.write("tier\ttest_module\tsubject\tverdict\tdetail\n")
        for tier, mod, subject, verdict, detail in rows:
            fh.write("%s\t%s\t%s\t%s\t%s\n"
                     % (tier, mod, subject or "", verdict, detail))


def read_tsv():
    if not TSV.exists():
        sys.exit("no %s -- run without --report first" % TSV)
    rows = []
    for line in TSV.read_text().splitlines()[1:]:
        parts = line.split("\t")
        if len(parts) == 5:
            rows.append((parts[0], parts[1], parts[2] or None, parts[3], parts[4]))
    return rows


VERDICTS = ("IMPORTS", "NO_SUBJECT", "ERROR", "MISSING", "CRASH")


def report(rows):
    tiers = sorted({r[0] for r in rows})
    print("\nUnmeasured in-scope modules, by whether their subject imports today")
    print("(%d modules; the 50 already wired are excluded)\n" % len(rows))
    head = "%-6s" % "tier" + "".join("%12s" % v for v in VERDICTS) + "%8s" % "total"
    print(head)
    print("-" * len(head))
    for tier in tiers:
        sub = [r for r in rows if r[0] == tier]
        line = "%-6s" % tier + "".join(
            "%12d" % sum(1 for r in sub if r[3] == v) for v in VERDICTS)
        print(line + "%8d" % len(sub))
    print("-" * len(head))
    print("%-6s" % "all" + "".join(
        "%12d" % sum(1 for r in rows if r[3] == v) for v in VERDICTS)
        + "%8d" % len(rows))

    ready = [r for r in rows if r[3] in ("IMPORTS", "NO_SUBJECT")]
    print("\nReady to wire (subject imports, or no subject needed): %d of %d"
          % (len(ready), len(rows)))
    for tier in tiers:
        names = sorted(r[1] for r in ready if r[0] == tier)
        if names:
            print("  %s: %s" % (tier, " ".join(names)))

    broken = [r for r in rows if r[3] == "ERROR"]
    if broken:
        print("\nSubject exists but its import RAISES (%d) -- bugs, not gaps:" % len(broken))
        for tier, mod, subject, _, detail in sorted(broken):
            print("  %-4s %-28s %-20s %s" % (tier, mod, subject, detail))

    missing = sorted({r[2] for r in rows if r[3] == "MISSING" and r[2]})
    if missing:
        print("\nSubject modules Grail does not have (%d distinct):" % len(missing))
        for i in range(0, len(missing), 6):
            print("  " + "  ".join("%-18s" % m for m in missing[i:i + 6]).rstrip())


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--report", action="store_true",
                    help="re-print the last census without re-probing")
    args = ap.parse_args()

    if args.report:
        report(read_tsv())
        return

    stdlib = stdlib_names()
    print("classifying against the vendored CPython 3.14 module list (%d names)"
          % len(stdlib))

    targets = unmeasured_by_tier()
    if not targets:
        sys.exit("no unmeasured in-scope modules found -- is %s intact?" % SCOPE.name)
    mapped = [(tier, mod, subject_for(mod, stdlib)) for tier, mod in targets]
    subjects = sorted({s for _, _, s in mapped if s})
    print("%d unmeasured in-scope modules -> %d distinct subject modules to probe"
          % (len(mapped), len(subjects)))

    verdicts = run_probe(subjects)

    rows = []
    for tier, mod, subject in mapped:
        if subject is None:
            rows.append((tier, mod, None, "NO_SUBJECT", "no stdlib module of that name"))
        else:
            verdict, detail = verdicts.get(subject, ("CRASH", "no verdict recorded"))
            rows.append((tier, mod, subject, verdict, detail))
    write_tsv(rows)
    report(rows)
    print("\nwrote %s" % TSV.relative_to(ROOT))


if __name__ == "__main__":
    main()
