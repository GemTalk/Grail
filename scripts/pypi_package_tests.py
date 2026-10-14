#!/usr/bin/env python3
"""Run pip packages' OWN test suites under Grail, against CPython's result.

The import census (scripts/pypi_package_census.py, docs/Package_Census.md)
answers ``does `import X' work''.  This answers the next question, ``does X
work'': each project's test suite, from its sdist, run by pytest under CPython
and under Grail, and compared test by test.

    ./scripts/pypi_package_tests.py --venv /path/to/venv --only six,idna
    ./scripts/pypi_package_tests.py --venv /path/to/venv          # the census list
    ./scripts/pypi_package_tests.py --report                       # re-print the TSV

Nothing here gates CI and nothing is committed from out/: this is a survey.

WHAT IT DOES, PER PROJECT
-------------------------
1. Takes the version the venv installed, and fetches THAT version's sdist from
   PyPI's JSON API.  Wheels rarely ship tests; sdists usually do.  Nothing is
   built: the tests run against the package the venv already installed, so the
   code under test is the code the census measured.
2. Finds the tests in the extracted sdist -- a tests/, test/ or testing/
   directory, else test_*.py files at the top -- and runs pytest on them, once
   under the venv's CPython and once under Grail, with the same arguments.  The
   project's own pytest config is kept (markers, filterwarnings) but its
   ``addopts'' is emptied: they name plugins (coverage, xdist) that are not
   what is being measured.
3. Reads both runs through one plugin (scripts/grail_pytest_report.py), which
   prints a line per test as it finishes.  A Grail session that dies, or says
   nothing for --timeout seconds, costs only the test it was running: that test
   is scored CRASH or TIMEOUT and the run resumes in a fresh process with
   everything already reported deselected.

THE SCORE
---------
The denominator is the tests CPython PASSES: a test that fails, errors or is
skipped under CPython -- a network test, an optional dependency pip did not
install, a platform check -- says nothing about Grail.  The headline is how
many of those Grail also passes; the rest are broken down by what Grail did
instead.  A Grail pass that CPython does not count is reported, never added.

Results: out/pypi-tests/results.tsv (one row per project), out/pypi-tests/
<project>.tests.tsv (one row per test), and the two raw logs per project.
"""

import argparse
import io
import json
import os
import queue
import shutil
import signal
import subprocess
import sys
import tarfile
import tempfile
import threading
import time
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUTDIR = ROOT / "out" / "pypi-tests"
PLUGIN = ROOT / "scripts" / "grail_pytest_report.py"
DRIVER = ROOT / "scripts" / "grail_pytest_driver.py"
PACKAGES = ROOT / "scripts" / "pypi_census_packages.txt"
TSV = OUTDIR / "results.tsv"
NAMESPACE = "pypi_package_tests"
COLUMNS = ["project", "version", "tests", "cpython_passed", "grail_passed",
           "grail_failed", "grail_error", "grail_skipped", "grail_crash",
           "grail_timeout", "grail_not_run", "grail_only_passed", "note"]
TEST_DIRS = ("tests", "test", "testing", "t")
PYTEST_ARGS = ["-p", "grail_pytest_report", "-p", "no:cacheprovider",
               "-p", "no:faulthandler", "--capture=sys", "-o", "addopts=",
               "--continue-on-collection-errors", "-q", "--no-header", "-rN"]


# --------------------------------------------------------------- the venv

def installed_versions(venv):
    """{canonical project name: version} for everything the venv installed."""
    py = Path(venv) / "bin" / "python"
    code = ("import importlib.metadata as m, json; print(json.dumps("
            "{d.metadata['Name']: d.version for d in m.distributions()}))")
    out = subprocess.run([str(py), "-I", "-c", code], capture_output=True,
                         text=True, check=True).stdout
    return {canon(k): v for k, v in json.loads(out).items()}


def canon(name):
    return name.lower().replace("_", "-").replace(".", "-")


def site_packages(venv):
    return next((Path(venv) / "lib").glob("python3*/site-packages"))


def read_packages(path=PACKAGES):
    return [ln.strip() for ln in path.read_text().splitlines()
            if ln.strip() and not ln.startswith("#")]


# --------------------------------------------------------------- the sdist

def fetch_sdist(project, version):
    """Path of the extracted sdist, fetched once and cached; None if PyPI has
    no sdist for this version."""
    dest = OUTDIR / "src" / ("%s-%s" % (project, version))
    if dest.is_dir():
        return dest
    url = "https://pypi.org/pypi/%s/%s/json" % (project, version)
    with urllib.request.urlopen(url, timeout=60) as resp:
        meta = json.load(resp)
    sdists = [u for u in meta.get("urls", []) if u.get("packagetype") == "sdist"]
    if not sdists:
        return None
    with urllib.request.urlopen(sdists[0]["url"], timeout=300) as resp:
        blob = resp.read()
    work = Path(tempfile.mkdtemp(prefix="grail-sdist-", dir=OUTDIR))
    try:
        name = sdists[0]["filename"]
        if name.endswith(".zip"):
            with zipfile.ZipFile(io.BytesIO(blob)) as zf:
                zf.extractall(work)
        else:
            with tarfile.open(fileobj=io.BytesIO(blob)) as tf:
                tf.extractall(work, filter="data")
        tops = [p for p in work.iterdir() if p.is_dir()]
        top = tops[0] if len(tops) == 1 else work
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(top), str(dest))
    finally:
        shutil.rmtree(work, ignore_errors=True)
    return dest


def find_tests(src):
    """The paths, relative to src, pytest should be given; [] when the sdist
    ships no tests."""
    for name in TEST_DIRS:
        if (src / name).is_dir():
            return [name]
    files = sorted(p.name for p in src.glob("test_*.py"))
    files += sorted(p.name for p in src.glob("*_test.py"))
    return files


# --------------------------------------------------------------- the runs

def stream(argv, cwd, env, timeout, log):
    """Run argv, reading its report lines as they arrive.  Answers
    ({nodeid: outcome}, started-but-unfinished nodeid or None, how it ended,
    a note) where `how' is 'exit', 'crash' or 'timeout' and the note says
    what stopped a run that never reached its tests."""
    proc = subprocess.Popen(argv, cwd=cwd, env=env, stdin=subprocess.DEVNULL,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                            text=True, errors="replace", start_new_session=True)
    lines = queue.Queue()

    def pump(fh=proc.stdout, q=lines):
        for ln in fh:
            q.put(ln)
        q.put(None)
    threading.Thread(target=pump, daemon=True).start()
    results, running, how, exited = {}, None, "crash", False
    collected, internal = False, None
    while True:
        try:
            ln = lines.get(timeout=timeout)
        except queue.Empty:
            how = "timeout"
            break
        if ln is None:
            break
        log.write(ln)
        # pytest's progress dots share the line the report follows.
        at = ln.find("GRAIL_")
        ln = ln[at:] if at > 0 else ln
        if ln.startswith("INTERNALERROR> ") and "Error" in ln.split(":")[0]:
            internal = ln[len("INTERNALERROR> "):].strip()
        if ln.startswith("GRAIL_COLLECTED|"):
            collected = True
        elif ln.startswith("GRAIL_START|"):
            running = ln.rstrip("\n").split("|", 1)[1]
        elif ln.startswith("GRAIL_TEST|"):
            _, outcome, nodeid = ln.rstrip("\n").split("|", 2)
            results[nodeid] = outcome
            if nodeid == running:
                running = None
        elif ln.startswith("GRAIL_EXIT|"):
            exited = True
    if how == "timeout":
        # The whole group: ./grail starts topaz, and killing only the launcher
        # leaves the gem running.
        try:
            os.killpg(proc.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
    proc.wait()
    if how != "timeout":
        how = "exit" if (exited or proc.returncode in (0, 1, 2, 5)) else "crash"
    note = ""
    if internal:
        note = "INTERNALERROR: " + internal[:160]
    elif not collected:
        note = {"timeout": "collection timed out", "crash": "died collecting"}.get(how, "")
    return results, running, how, note


def run_cpython(venv, src, tests, timeout, log):
    env = dict(os.environ)
    env["PYTHONPATH"] = str(PLUGIN.parent)
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    env.pop("GRAIL_TEST_DESELECT", None)
    argv = [str(Path(venv) / "bin" / "python"), "-m", "pytest"] + tests + PYTEST_ARGS
    results, _, _, _ = stream(argv, src, env, timeout, log)
    return results


def grail_argv(venv, src, tests):
    return (["./grail", "--namespace", NAMESPACE, str(DRIVER),
             str(site_packages(venv)), str(PLUGIN.parent), str(src), "--"]
            + tests + PYTEST_ARGS)


def warm_grail(venv, log):
    """Import pytest once in the namespace and commit, so each run after
    imports it in well under a second rather than compiling it again."""
    argv = ["./grail", "--namespace", NAMESPACE, str(DRIVER),
            str(site_packages(venv)), str(PLUGIN.parent), str(ROOT), "--warm"]
    proc = subprocess.run(argv, cwd=ROOT, env=grail_env(venv), capture_output=True,
                          text=True, errors="replace", timeout=1800)
    log.write(proc.stdout)
    return "GRAIL_WARM|" in proc.stdout


def grail_env(venv):
    env = dict(os.environ)
    env["VIRTUAL_ENV"] = str(venv)
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    env.pop("PYTHONPATH", None)
    # ./grail's 400 MB of temporary object memory is not enough to compile a
    # big generated test module: idna's UTS46Tests (6,329 methods) stops with
    # AlmostOutOfMemoryError there and imports at 2 GB.
    env.setdefault("GRAIL_TEMPOBJ_KB", "2000000")
    return env


def run_grail(venv, src, tests, timeout, log, max_restarts):
    """{nodeid: outcome}, resuming past every test that kills or stalls the
    session -- each such test is scored CRASH or TIMEOUT."""
    results, notes = {}, []
    env = grail_env(venv)
    skipfile = Path(tempfile.mkstemp(prefix="grail-deselect-", dir=OUTDIR)[1])
    env["GRAIL_TEST_DESELECT"] = str(skipfile)
    try:
        for attempt in range(max_restarts + 1):
            skipfile.write_text("".join(n + "\n" for n in results))
            got, running, how, note = stream(grail_argv(venv, src, tests), ROOT,
                                             env, timeout, log)
            results.update(got)
            if note:
                notes.append(note)
            if how == "exit" or running is None:
                break
            results[running] = "CRASH" if how == "crash" else "TIMEOUT"
            log.write("\n### %s on %s; resuming (%d done)\n"
                      % (results[running], running, len(results)))
    finally:
        skipfile.unlink(missing_ok=True)
    return results, "; ".join(notes)


# --------------------------------------------------------------- scoring

def score(project, version, tests, ref, got, note=""):
    passed = [n for n, o in ref.items() if o == "passed"]
    row = dict(project=project, version=version, tests=" ".join(tests),
               cpython_passed=len(passed), note=note)
    tally = {"passed": 0, "failed": 0, "error": 0, "skipped": 0,
             "CRASH": 0, "TIMEOUT": 0, "not_run": 0}
    for n in passed:
        o = got.get(n, "not_run")
        o = {"xfailed": "failed", "xpassed": "passed"}.get(o, o)
        tally[o if o in tally else "failed"] += 1
    row.update(grail_passed=tally["passed"], grail_failed=tally["failed"],
               grail_error=tally["error"], grail_skipped=tally["skipped"],
               grail_crash=tally["CRASH"], grail_timeout=tally["TIMEOUT"],
               grail_not_run=tally["not_run"],
               grail_only_passed=sum(1 for n, o in got.items()
                                     if o == "passed" and ref.get(n) != "passed"))
    return row


def write_tests(project, ref, got):
    path = OUTDIR / ("%s.tests.tsv" % project)
    with path.open("w") as fh:
        fh.write("nodeid\tcpython\tgrail\n")
        for n in sorted(set(ref) | set(got)):
            fh.write("%s\t%s\t%s\n" % (n, ref.get(n, ""), got.get(n, "")))


def write_tsv(rows):
    with TSV.open("w") as fh:
        fh.write("\t".join(COLUMNS) + "\n")
        for r in rows:
            fh.write("\t".join(str(r.get(c, "")).replace("\t", " ")
                               for c in COLUMNS) + "\n")


def read_tsv():
    lines = TSV.read_text().splitlines()
    return [dict(zip(COLUMNS, ln.split("\t"))) for ln in lines[1:]]


def report(rows):
    print("%-22s %-12s %8s %8s  %s" % ("project", "version", "CPython", "Grail",
                                       "Grail's other outcomes"))
    tot_c = tot_g = 0
    for r in rows:
        c, g = int(r["cpython_passed"] or 0), int(r["grail_passed"] or 0)
        other = ", ".join("%s %s" % (r[k], k[6:]) for k in
                          ("grail_failed", "grail_error", "grail_skipped",
                           "grail_crash", "grail_timeout", "grail_not_run")
                          if str(r.get(k, "0")) not in ("", "0"))
        if r.get("note"):
            other = (other + "; " if other else "") + r["note"]
        print("%-22s %-12s %8s %8s  %s" % (r["project"], r["version"], c, g, other))
        tot_c, tot_g = tot_c + c, tot_g + g
    pct = (100.0 * tot_g / tot_c) if tot_c else 0.0
    print("\nGrail passes %d of the %d tests CPython passes (%.1f%%)"
          % (tot_g, tot_c, pct))


# --------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--venv", help="the venv the census installed")
    ap.add_argument("--only", help="comma-separated projects (default: the census list)")
    ap.add_argument("--timeout", type=int, default=300,
                    help="seconds of silence before a session is called hung")
    ap.add_argument("--max-restarts", type=int, default=20,
                    help="crashed or hung tests to resume past, per project")
    ap.add_argument("--report", action="store_true", help="re-print the last TSV")
    opts = ap.parse_args()
    if opts.report:
        report(read_tsv())
        return 0
    if not opts.venv:
        ap.error("--venv is required")
    venv = Path(opts.venv).resolve()
    OUTDIR.mkdir(parents=True, exist_ok=True)
    versions = installed_versions(venv)
    projects = opts.only.split(",") if opts.only else read_packages()
    with (OUTDIR / "warm.log").open("w") as log:
        if not warm_grail(venv, log):
            sys.exit("could not import pytest under Grail; see %s" % log.name)
    rows = []
    for project in projects:
        version = versions.get(canon(project))
        if version is None:
            rows.append(dict(project=project, note="not installed in the venv"))
            continue
        t0 = time.time()
        try:
            src = fetch_sdist(project, version)
        except Exception as exc:
            rows.append(dict(project=project, version=version,
                             note="sdist fetch failed: %s" % exc))
            continue
        tests = find_tests(src) if src else []
        if not tests:
            rows.append(dict(project=project, version=version,
                             note="no sdist" if src is None else "no tests in the sdist"))
            print("%-22s no tests" % project, flush=True)
            continue
        with (OUTDIR / ("%s.cpython.log" % project)).open("w") as log:
            ref = run_cpython(venv, src, tests, opts.timeout, log)
        if not any(o == "passed" for o in ref.values()):
            rows.append(score(project, version, tests, ref, {},
                              note="CPython passes none"))
            print("%-22s CPython passes none" % project, flush=True)
            continue
        with (OUTDIR / ("%s.grail.log" % project)).open("w") as log:
            got, note = run_grail(venv, src, tests, opts.timeout, log,
                                  opts.max_restarts)
        write_tests(project, ref, got)
        row = score(project, version, tests, ref, got, note=note)
        rows.append(row)
        write_tsv(rows)
        print("%-22s %5d / %-5d  (%ds)" % (project, row["grail_passed"],
                                         row["cpython_passed"], time.time() - t0),
              flush=True)
    write_tsv(rows)
    print()
    report(read_tsv())
    return 0


if __name__ == "__main__":
    sys.exit(main())
