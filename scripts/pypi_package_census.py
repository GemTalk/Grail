#!/usr/bin/env python3
"""Measure how many popular pip-installed packages IMPORT under Grail, unmodified.

The project goal this serves is "pip install X; import X just works".  The
scoreboard in docs/CPython_Suite_Scoreboard.md measures the stdlib; nothing
measured the package ecosystem, so a run of stdlib fixes landed with no way to
say what it bought.  This is that measurement, and its output is meant to be a
QUEUE: docs/Package_Census.md ranks the gaps by how many packages each blocks.

    ./scripts/pypi_package_census.py --venv /path/to/venv
    ./scripts/pypi_package_census.py --venv /path/to/venv --only pyyaml,click
    ./scripts/pypi_package_census.py --venv /path/to/venv --submodules
    ./scripts/pypi_package_census.py --report        # re-print the last TSV

Nothing here gates CI and nothing is committed from out/: this is a survey.

WHAT IT DOES
------------
1. Reads the venv's installed metadata to derive, per project:
     * the version pip resolved,
     * the TOP-LEVEL IMPORT NAME(s) from the wheel's RECORD -- `pyyaml' is
       imported as `yaml', and guessing that mapping by hand is how a census
       reports phantom failures,
     * whether the project's OWN wheel shipped a .so/.dylib/.pyd,
     * whether anything in its install-time dependency closure did.
2. Runs `./grail scripts/grail_import_probe.py <import-name>' once per project,
   in a FRESH process.  A shared session would let one package's half-finished
   import poison the next, and a package that kills the session would take the
   rest of the run with it.
3. Writes out/pypi/census.tsv plus out/pypi/<project>.out (the full traceback).

WHAT `ext' MEANS FOR THE HEADLINE NUMBER
----------------------------------------
Grail cannot load a CPython C extension, so a project whose own wheel is a .so
is out of scope and is NOT a Grail defect.  Neither is one whose dependency is.
Both are still MEASURED -- reported separately, never silently dropped -- for
two reasons: several ship a pure-Python fallback and import anyway, and a
project that fails for an unrelated Grail reason BEFORE it ever reaches its .so
is a real finding that pre-filtering would have hidden.

The headline denominator is therefore the `pure' rows only, and the tool prints
all three denominators so a reader can check the arithmetic rather than trust it.

VERDICTS
--------
    IMPORTS   `import <pkg>' returned, and it was the VENV's copy
    SHADOWED  it returned, but Grail's own src/python/stdlib answered the
              import instead of the venv -- Grail bundles `jinja2' and
              `markupsafe', and grailDir/src/python/stdlib beats sys.path by
              design (docs/Sys_Path_Bootstrap.md).  (Its stand-ins for `click'
              and `requests' are named _grail_click and _grail_requests, so an
              installed real one is what imports.)  Counting these
              as the pip package working would be a straight falsehood, so
              they get their own verdict and sit outside the headline.
    FAILS     it raised; the exception type, message and raising file are kept
    CRASH     the session died with NO result line -- an uncatchable Smalltalk
              error, invisible to Python's `except BaseException'.  This is a
              finding in its own right, not a hole in the data.
    TIMEOUT   the probe outlived --timeout seconds

THE SUBMODULE LEVEL (--submodules)
----------------------------------
`import X' returning says little about X: python-dateutil imported in the
first census while `dateutil.tz' -- the part anyone wants -- did not.  So for
every project whose top level IMPORTS, the census also imports each of its
submodules: every .py file the project's wheel installed, read from its
RECORD (tests, test, conftest and __main__ excluded; a single-module wheel
has none).

The denominator is decided by CPython, not by the file walk.  The same list is
imported first by the VENV's interpreter, and only what imports there counts:
a submodule that needs an optional dependency pip never installed, or a
platform Grail is not on, is no more importable under CPython than under
Grail, and scoring it against Grail would be a phantom failure.

Both interpreters import the list in the same sorted order, in ONE process
each, reporting a line per module as it goes.  When a Grail session dies
(CRASH) or stops reporting (TIMEOUT, --timeout seconds per module), the module
it was on gets that verdict and the rest of the list resumes in a fresh
process -- so one bad submodule costs one row, not the package.

Results go to out/pypi/submodules.tsv, one row per module, and to the
`subs_ok'/`subs_ref' columns of census.tsv.
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import queue
import signal
import tempfile
import threading
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROBE = ROOT / "scripts" / "grail_import_probe.py"
PKGLIST = ROOT / "scripts" / "pypi_census_packages.txt"
OUTDIR = ROOT / "out" / "pypi"
TSV = OUTDIR / "census.tsv"
SUBS_TSV = OUTDIR / "submodules.tsv"

COLUMNS = ["project", "version", "import_name", "scope", "verdict",
           "exc_type", "message", "resolved_or_raised_in",
           "subs_ok", "subs_ref"]
SUB_COLUMNS = ["project", "module", "cpython", "grail", "exc_type", "message"]

# Directory and module names that are not part of a package's importable
# surface: test suites (which import pytest and fixtures, not the package's
# users' code) and __main__ (which RUNS a CLI on import).
SUB_SKIP = {"tests", "test", "_tests", "conftest", "__main__", "__pycache__"}


def canon(name):
    return name.lower().replace("_", "-")


def read_packages(path):
    return [ln.strip() for ln in Path(path).read_text().splitlines()
            if ln.strip() and not ln.startswith("#")]


# The metadata walk runs inside the VENV's interpreter, not this one: only the
# venv can see what pip actually resolved there.
INSPECT = r'''
import json, sys
from importlib.metadata import distributions
try:
    from packaging.requirements import Requirement
except ImportError:
    Requirement = None

dists = {}
for d in distributions():
    n = (d.metadata["Name"] or "")
    if n:
        dists[n.lower().replace("_", "-")] = d

EXT = (".so", ".dylib", ".pyd")

def tops(d):
    out = set()
    for f in (d.files or []):
        p = str(f)
        if p.startswith("..") or ".dist-info" in p or p.startswith("bin/"):
            continue
        parts = p.split("/")
        if len(parts) > 1 and parts[0].endswith(".data"):
            continue
        if len(parts) > 1:
            if parts[0] != "__pycache__":
                out.add(parts[0])
        elif p.endswith(".py"):
            out.add(p[:-3])
    return sorted(out)

SKIP = set(json.loads(sys.argv[1]))

def modules(d):
    out = set()
    for f in (d.files or []):
        p = str(f)
        if not p.endswith(".py") or p.startswith("..") or p.startswith("bin/"):
            continue
        parts = p[:-3].split("/")
        if parts[-1] == "__init__":
            parts = parts[:-1]
        if not parts or any(x in SKIP or not x.isidentifier() for x in parts):
            continue
        out.add(".".join(parts))
    return sorted(out)

def ext_files(d):
    return sorted(str(f) for f in (d.files or []) if str(f).endswith(EXT))

def deps(d):
    names = []
    for spec in (d.requires or []):
        if Requirement is None:
            names.append(spec.split()[0].split("[")[0].split(";")[0])
            continue
        try:
            r = Requirement(spec)
        except Exception:
            continue
        if r.marker is not None and not r.marker.evaluate():
            continue          # an extra-only or wrong-platform dep is not installed
        names.append(r.name.lower().replace("_", "-"))
    return names

result = {}
for project in json.load(sys.stdin):
    key = project.lower().replace("_", "-")
    d = dists.get(key)
    if d is None:
        result[project] = {"installed": False}
        continue
    seen, stack, ext_deps = set(), [key], []
    while stack:
        k = stack.pop()
        if k in seen:
            continue
        seen.add(k)
        dd = dists.get(k)
        if dd is None:
            continue
        if k != key and ext_files(dd):
            ext_deps.append(k)
        stack.extend(deps(dd))
    result[project] = {
        "installed": True,
        "version": d.version,
        "tops": tops(d),
        "ext_files": ext_files(d)[:5],
        "ext_deps": sorted(ext_deps),
        "modules": modules(d),
    }
json.dump(result, sys.stdout)
'''


def inspect_venv(venv, projects):
    py = Path(venv) / "bin" / "python"
    if not py.exists():
        sys.exit("no interpreter at %s -- is --venv a python3 -m venv tree?" % py)
    proc = subprocess.run([str(py), "-c", INSPECT, json.dumps(sorted(SUB_SKIP))],
                          input=json.dumps(projects),
                          capture_output=True, text=True)
    if proc.returncode != 0:
        sys.exit("venv inspection failed:\n" + proc.stderr)
    return json.loads(proc.stdout)


# A wheel whose top-level is a NAMESPACE package defeats the mechanical rule
# below: protobuf installs into `google/', which carries no __init__.py of its
# own, so `import google' succeeds as an empty namespace and measures nothing
# (it also has no __file__, which the shadow check then misreads).  The dotted
# name is stated here rather than guessed, and this table should stay tiny --
# every entry is a place the mechanical rule failed.
IMPORT_NAME_OVERRIDES = {
    "protobuf": "google.protobuf",
    "google-auth": "google.auth",
    # No __init__.py anywhere in this wheel: google.api, google.rpc, ... are
    # all namespace packages of generated *_pb2 modules.  status_pb2 is the
    # one grpcio-status imports.
    "googleapis-common-protos": "google.rpc.status_pb2",
    "opentelemetry-api": "opentelemetry.trace",
}


def import_name(project, info):
    """The name a user would type after `import'.

    Preference order: a top-level exactly matching the project name, else the
    first PUBLIC top-level (pytest ships `_pytest' alongside `pytest'), else
    the first of any.  Underscore/dash normalised, since the wheel writes
    `typing_extensions' for the project `typing-extensions'.
    """
    if project in IMPORT_NAME_OVERRIDES:
        return IMPORT_NAME_OVERRIDES[project]
    tops = info.get("tops") or []
    if not tops:
        return None
    want = project.replace("-", "_").lower()
    for t in tops:
        if t.lower() == want:
            return t
    public = [t for t in tops if not t.startswith("_")]
    return (public or tops)[0]


def scope_of(info):
    if info.get("ext_files"):
        return "ext"
    if info.get("ext_deps"):
        return "ext-dep"
    return "pure"


def site_packages(venv):
    found = sorted(Path(venv).glob("lib/python3*/site-packages"))
    if not found:
        sys.exit("no lib/python3*/site-packages under %s" % venv)
    return found[0]


def submodules(info, import_name):
    """Every module the project's wheel installed, other than `import_name'.

    From the wheel's RECORD (via the venv's importlib.metadata), not from
    walking the import name's directory: pytest's code is in `_pytest', not
    `pytest', setuptools also ships `pkg_resources', and protobuf's import
    name is one directory of a namespace.  Not pkgutil.walk_packages either,
    which IMPORTS each subpackage to find its children, so the list would
    already depend on what imports.  Answers [] for a single-module wheel.
    """
    above = {".".join(import_name.split(".")[:i])
             for i in range(1, import_name.count(".") + 2)}
    return [m for m in info.get("modules") or [] if m not in above]


def grail_env(venv):
    env = dict(os.environ)
    env["VIRTUAL_ENV"] = str(venv)
    env.pop("PYTHONPATH", None)   # keep sys.path to the venv + Grail's own
    return env


def stream_list(argv_for, env, modules, timeout, log):
    """{module: (verdict, exc_type, message)} for every module in `modules'.

    argv_for(listfile) is the command that imports a list file; it runs with
    stdout read line by line, so a module that hangs is caught after `timeout'
    seconds of silence rather than at the end of the whole list.  A process
    that dies or goes silent marks the module it was on and is restarted on
    the remainder.  Everything it prints is appended to `log'.
    """
    results = {}
    pending = list(modules)
    scratch = tempfile.mkdtemp(prefix="grail-census-")
    try:
        shutil.copy(PROBE, Path(scratch) / PROBE.name)
        listfile = Path(scratch) / "modules.txt"
        while pending:
            listfile.write_text("\n".join(pending) + "\n")
            proc = subprocess.Popen(
                argv_for(Path(scratch) / PROBE.name, listfile),
                cwd=ROOT, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT, text=True, errors="replace",
                start_new_session=True, env=env)
            lines = queue.Queue()

            def pump(fh=proc.stdout, q=lines):
                for ln in fh:
                    q.put(ln)
                q.put(None)
            threading.Thread(target=pump, daemon=True).start()
            ended, stalled = False, False
            while True:
                try:
                    ln = lines.get(timeout=timeout)
                except queue.Empty:
                    stalled = True
                    break
                if ln is None:
                    break
                log.write(ln)
                if ln.startswith("CENSUS-END"):
                    ended = True
                elif ln.startswith("CENSUS|"):
                    parts = ln.rstrip("\n").split("|")
                    parts += [""] * (6 - len(parts))
                    _, name, verdict, exc_type, msg, _where = parts[:6]
                    if name in pending:
                        results[name] = (verdict, exc_type, msg)
                        pending.remove(name)
            if stalled:
                # The whole group: ./grail starts topaz, and killing only the
                # launcher leaves the gem running.
                try:
                    os.killpg(proc.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
            proc.wait()
            if ended or not pending:
                break
            # The process stopped before reporting pending[0]: that module is
            # the one it was importing.
            culprit = pending.pop(0)
            if stalled:
                results[culprit] = ("TIMEOUT", "",
                                    "no result after %ss" % timeout)
            else:
                results[culprit] = ("CRASH", "", "session died (exit %s)"
                                    % proc.returncode)
            log.write("\n### %s on %s; resuming with %d left\n"
                      % (results[culprit][0], culprit, len(pending)))
    finally:
        shutil.rmtree(scratch, ignore_errors=True)
    return results


def measure_submodules(venv, project, mods, timeout):
    """[row] of SUB_COLUMNS for one project: CPython first, then Grail."""
    if not mods:
        return []
    py = str(Path(venv) / "bin" / "python")
    sub_dir = OUTDIR / "submodules"
    sub_dir.mkdir(parents=True, exist_ok=True)
    with (sub_dir / ("%s.cpython.out" % project)).open("w") as log:
        ref = stream_list(lambda probe, lst: [py, "-I", str(probe), "--list",
                                              str(lst)],
                          dict(os.environ), mods, timeout, log)
    ok_ref = [m for m in mods if ref[m][0] == "IMPORTS"]
    with (sub_dir / ("%s.grail.out" % project)).open("w") as log:
        got = stream_list(lambda probe, lst: ["./grail", str(probe), "--list",
                                              str(lst)],
                          grail_env(venv), ok_ref, timeout, log) if ok_ref else {}
    rows = []
    for m in mods:
        cv = ref[m][0]
        gv, et, msg = got.get(m, ("", "", ref[m][2] if cv != "IMPORTS"
                                  else ""))
        if cv != "IMPORTS":
            et = ref[m][1]
        rows.append(dict(project=project, module=m, cpython=cv, grail=gv,
                         exc_type=et, message=msg))
    return rows


def probe(venv, module, timeout, env_extra=None):
    """(verdict, exc_type, message, raised_in, full_output) for ONE module.

    The probe is copied to an empty scratch dir first: Grail puts the running
    script's directory at sys.path[0], and scripts/ is full of .py files that
    could shadow something a package imports.
    """
    scratch = tempfile.mkdtemp(prefix="grail-census-")
    try:
        shutil.copy(PROBE, Path(scratch) / PROBE.name)
        env = grail_env(venv)
        env.update(env_extra or {})
        try:
            proc = subprocess.run(
                ["./grail", str(Path(scratch) / PROBE.name), module],
                cwd=ROOT, env=env, stdin=subprocess.DEVNULL,
                capture_output=True, text=True, errors="replace",
                timeout=timeout)
        except subprocess.TimeoutExpired as exc:
            out = (exc.stdout or b"")
            if isinstance(out, bytes):
                out = out.decode("utf-8", "replace")
            return ("TIMEOUT", "", "no result after %ss" % timeout, "", out)
        output = proc.stdout + proc.stderr
        for line in proc.stdout.splitlines():
            if line.startswith("CENSUS|"):
                parts = line.split("|")
                parts += [""] * (6 - len(parts))
                _, _name, verdict, exc_type, msg, where = parts[:6]
                if verdict == "IMPORTS" and not str(where).startswith(str(venv)):
                    verdict = "SHADOWED"
                    msg = "answered by Grail's bundled tree, not the venv"
                return (verdict, exc_type, msg, where, output)
        return ("CRASH", "", "session produced no result line (exit %s)"
                % proc.returncode, "", output)
    finally:
        shutil.rmtree(scratch, ignore_errors=True)


def cell(value):
    return str(value).replace("\t", " ").replace("\n", " ")


def write_tsv(rows, path=TSV, columns=COLUMNS):
    OUTDIR.mkdir(parents=True, exist_ok=True)
    with path.open("w") as fh:
        fh.write("\t".join(columns) + "\n")
        for r in rows:
            fh.write("\t".join(cell(r.get(c, "")) for c in columns) + "\n")


def read_tsv(path=TSV, columns=COLUMNS):
    if not path.exists():
        if path != TSV:
            return []
        sys.exit("no %s -- run without --report first" % path)
    lines = path.read_text().splitlines()
    return [dict(zip(columns, ln.split("\t") + [""] * len(columns)))
            for ln in lines[1:]]


def report_submodules(rows, subs):
    """Per project, then the failing submodules grouped by their message.

    The grouping is the queue: one gap usually fails a run of submodules in
    several packages, and a count of modules per message ranks it.
    """
    measured = [r for r in rows if r.get("subs_ref")]
    if not measured:
        return
    print("\nSUBMODULES (of those importing under CPython)")
    width = max(len(r["project"]) for r in measured)
    tot_ok = tot_ref = 0
    for r in measured:
        ok, ref = int(r["subs_ok"] or 0), int(r["subs_ref"] or 0)
        tot_ok += ok
        tot_ref += ref
        print("%-*s  %4d/%-4d %s" % (width, r["project"], ok, ref,
                                     "all" if ok == ref else ""))
    print("%-*s  %4d/%-4d" % (width, "ALL", tot_ok, tot_ref))
    groups = defaultdict(list)
    for s in subs:
        if s["cpython"] == "IMPORTS" and s["grail"] != "IMPORTS":
            key = ("%s %s: %s" % (s["grail"], s["exc_type"], s["message"])
                   ).replace(" : ", " ").strip(": ")
            groups[key[:140]].append(s)
    if groups:
        print("\nFAILING SUBMODULES BY MESSAGE (modules, packages)")
        for key, ss in sorted(groups.items(), key=lambda kv: -len(kv[1])):
            projects = Counter(s["project"] for s in ss)
            print("%4d  %-3d %s\n            %s"
                  % (len(ss), len(projects), key,
                     ", ".join("%s(%d)" % kv for kv in projects.most_common())))


def report(rows):
    """Print EVERY row, then the counts.

    Rows first, deliberately.  A census that prints only totals is a number
    describing nothing; the rows are what a reader can actually check.
    """
    width = max([len(r["project"]) for r in rows] + [7])
    print()
    for r in rows:
        print("%-*s  %-12s %-8s %-8s %s"
              % (width, r["project"], r["version"][:12], r["scope"],
                 r["verdict"],
                 (r["exc_type"] + ": " + r["message"]).strip(": ")[:96]))
    print()
    for scope in ("pure", "ext-dep", "ext"):
        sub = [r for r in rows if r["scope"] == scope]
        if not sub:
            continue
        ok = [r for r in sub if r["verdict"] == "IMPORTS"]
        shadow = [r for r in sub if r["verdict"] == "SHADOWED"]
        print("%-8s %2d/%2d import   (%s)%s"
              % (scope, len(ok), len(sub),
                 ", ".join(r["project"] for r in ok) or "none",
                 "   [+%d shadowed: %s]"
                 % (len(shadow), ", ".join(r["project"] for r in shadow))
                 if shadow else ""))
    ok = [r for r in rows if r["verdict"] == "IMPORTS"]
    print("%-8s %2d/%2d import" % ("ALL", len(ok), len(rows)))
    for odd in ("SHADOWED", "CRASH", "TIMEOUT"):
        names = [r["project"] for r in rows if r["verdict"] == odd]
        if names:
            print("%-8s %s" % (odd, ", ".join(names)))
    report_submodules(rows, read_tsv(SUBS_TSV, SUB_COLUMNS))


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--venv", default=os.environ.get("VIRTUAL_ENV"),
                    help="virtualenv whose site-packages Grail should see "
                         "(default: $VIRTUAL_ENV)")
    ap.add_argument("--packages", default=str(PKGLIST),
                    help="file of project names, one per line (default: %s)"
                         % PKGLIST.name)
    ap.add_argument("--only", default="",
                    help="comma-separated subset of those names")
    ap.add_argument("--timeout", type=int,
                    default=int(os.environ.get("GRAIL_CENSUS_TIMEOUT", "180")))
    ap.add_argument("--submodules", action="store_true",
                    help="also import every submodule of each project whose "
                         "top level imports (see THE SUBMODULE LEVEL)")
    ap.add_argument("--report", action="store_true",
                    help="re-print the last run's TSV without measuring")
    args = ap.parse_args()

    if args.report:
        report(read_tsv())
        return

    if not args.venv:
        sys.exit("--venv is required (or export VIRTUAL_ENV)")
    projects = read_packages(args.packages)
    if args.only:
        want = {canon(n) for n in args.only.split(",")}
        projects = [p for p in projects if canon(p) in want]
        if not projects:
            sys.exit("--only matched nothing in %s" % args.packages)

    meta = inspect_venv(args.venv, projects)
    OUTDIR.mkdir(parents=True, exist_ok=True)
    rows = []
    mods_of = {}
    for i, project in enumerate(projects, 1):
        info = meta.get(project, {"installed": False})
        if not info.get("installed"):
            rows.append(dict(project=project, version="", import_name="",
                             scope="not-installed", verdict="NOT_INSTALLED",
                             exc_type="", message="pip did not install it",
                             resolved_or_raised_in=""))
            print("[%2d/%d] %-24s NOT_INSTALLED" % (i, len(projects), project))
            continue
        name = import_name(project, info)
        scope = scope_of(info)
        if name is None:
            rows.append(dict(project=project, version=info["version"],
                             import_name="", scope=scope, verdict="NO_MODULE",
                             exc_type="", message="wheel ships no importable "
                             "top-level (a plugin or data-only project)",
                             resolved_or_raised_in=""))
            print("[%2d/%d] %-24s NO_MODULE" % (i, len(projects), project))
            continue
        mods_of[project] = submodules(info, name)
        verdict, exc_type, msg, where, output = probe(args.venv, name,
                                                      args.timeout)
        (OUTDIR / ("%s.out" % project)).write_text(output)
        rows.append(dict(project=project, version=info["version"],
                         import_name=name, scope=scope, verdict=verdict,
                         exc_type=exc_type, message=msg, resolved_or_raised_in=where))
        print("[%2d/%d] %-24s %-8s %-8s %s"
              % (i, len(projects), project, scope, verdict,
                 (exc_type + ": " + msg).strip(": ")[:80]))
        sys.stdout.flush()

    if args.submodules:
        subs = []
        for r in rows:
            if r["verdict"] != "IMPORTS":
                continue
            got = measure_submodules(args.venv, r["project"],
                                     mods_of[r["project"]], args.timeout)
            if not got:
                continue
            subs.extend(got)
            ref = [g for g in got if g["cpython"] == "IMPORTS"]
            r["subs_ref"] = len(ref)
            r["subs_ok"] = sum(1 for g in ref if g["grail"] == "IMPORTS")
            print("    %-24s submodules %d/%d"
                  % (r["project"], r["subs_ok"], r["subs_ref"]))
            sys.stdout.flush()
        write_tsv(subs, SUBS_TSV, SUB_COLUMNS)
    elif SUBS_TSV.exists():
        SUBS_TSV.unlink()             # a stale level-2 file describes another run

    write_tsv(rows)
    report(rows)
    print("\nrows: %s   per-package output: %s/<project>.out"
          % (TSV, OUTDIR))


if __name__ == "__main__":
    main()
