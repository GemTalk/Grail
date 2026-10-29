#!/usr/bin/env python3
"""Rewrite tests/scripts/shard_timings.txt from measured per-class SUnit times.

The SUnit gate places whole test classes on shards by measured cost
(GrailShardPlan, read by tests/scripts/runTestsShard.gs).  The costs come
from this file; every shard prints one line per class it ran,

    GRAIL_CLASS_TIME|<shard>|<class>|<ms>|<tests>

and this script collects them.  The numbers that matter are CI's -- the
gate's wall-clock is CI's -- so by default it downloads the logs of a CI run:

    scripts/refresh_shard_timings.py                 # latest green merge-queue run
    scripts/refresh_shard_timings.py 40562863481     # that run (several: averaged)
    scripts/refresh_shard_timings.py --local         # out/shard_*.out of a local run
    scripts/refresh_shard_timings.py --logs DIR...   # any directory of shard logs

A class seen more than once (both arms of a CI run, or several runs) gets the
mean.  Classes that no longer exist simply drop out; new classes are absent
until the next refresh, and GrailShardPlan costs them by test count meanwhile,
so nothing is ever dropped from a run.

After writing, it prints the plan the file gives for --workers shards
(default 16, with --reserve seconds on shard 0, default the CI value) so a
refresh can be judged before it is committed.  This preview ignores the
order-of-classes effects a real run has, so treat it as a forecast.
"""

import argparse
import glob
import os
import re
import subprocess
import sys
import tempfile
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TIMINGS = os.path.join(ROOT, "tests", "scripts", "shard_timings.txt")
REPO = "GemTalk/Grail"
LINE = re.compile(r"^GRAIL_CLASS_TIME\|(\d+)\|([^|]+)\|(\d+)\|(\d+)\s*$")
CI_RESERVE_S = 0


def ci_reserve_default():
    """GRAIL_TEST_SHARD0_RESERVE_S as ci.yml sets it, so the preview matches CI."""
    try:
        with open(os.path.join(ROOT, ".github", "workflows", "ci.yml")) as f:
            m = re.search(r"GRAIL_TEST_SHARD0_RESERVE_S=(\d+)", f.read())
            return int(m.group(1)) if m else CI_RESERVE_S
    except OSError:
        return CI_RESERVE_S


def latest_run():
    out = subprocess.run(
        ["gh", "run", "list", "--repo", REPO, "--workflow", "ci.yml",
         "--event", "merge_group", "--status", "success", "--limit", "1",
         "--json", "databaseId", "-q", ".[0].databaseId"],
        check=True, capture_output=True, text=True).stdout.strip()
    if not out:
        sys.exit("no successful merge-queue CI run found; pass a run id")
    return out


def download(run_id, dest):
    d = os.path.join(dest, run_id)
    os.makedirs(d)
    print(f"downloading shard logs of run {run_id} ...", file=sys.stderr)
    subprocess.run(["gh", "run", "download", run_id, "--repo", REPO,
                    "-p", "grail-ci-logs-*", "-D", d], check=True)
    return d


def collect(dirs):
    samples = defaultdict(list)
    tests = {}
    files = 0
    for d in dirs:
        for path in glob.glob(os.path.join(d, "**", "shard_*.out"), recursive=True):
            files += 1
            with open(path, errors="replace") as f:
                for line in f:
                    m = LINE.match(line)
                    if m:
                        samples[m.group(2)].append(int(m.group(3)))
                        tests[m.group(2)] = int(m.group(4))
    return samples, tests, files


def plan(costs, workers, reserve_ms):
    """GrailShardPlan's rule: longest first, to the least-loaded shard."""
    loads = [0] * workers
    if reserve_ms:
        loads[0] = reserve_ms
    for name in sorted(costs, key=lambda n: (-costs[n], n)):
        i = min(range(workers), key=lambda k: (loads[k], k))
        loads[i] += costs[name]
    return loads


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("runs", nargs="*", help="CI run id(s); default the latest green merge-queue run")
    ap.add_argument("--local", action="store_true", help="read out/shard_*.out of a local run")
    ap.add_argument("--logs", nargs="+", metavar="DIR", help="read shard logs under these directories")
    ap.add_argument("--workers", type=int, default=16, help="preview the plan for this many shards")
    ap.add_argument("--reserve", type=int, default=None, help="preview reserve on shard 0, seconds")
    ap.add_argument("--dry-run", action="store_true", help="print the preview, do not write the file")
    args = ap.parse_args()

    with tempfile.TemporaryDirectory() as tmp:
        if args.local:
            dirs, source = [os.path.join(ROOT, "out")], "a local run (out/shard_*.out)"
        elif args.logs:
            dirs, source = args.logs, "shard logs in " + " ".join(args.logs)
        else:
            runs = args.runs or [latest_run()]
            dirs = [download(r, tmp) for r in runs]
            source = "CI run(s) " + " ".join(runs)
        samples, tests, files = collect(dirs)

    if not samples:
        sys.exit(f"no GRAIL_CLASS_TIME lines in {files} shard log(s) from {source}")
    costs = {n: round(sum(v) / len(v)) for n, v in samples.items()}
    total = sum(costs.values())

    if not args.dry_run:
        with open(TIMINGS, "w") as f:
            f.write(
                "# Measured per-class SUnit times, in milliseconds: '<ClassName> <ms>'.\n"
                "# GrailShardPlan places whole classes on the gate's shards by these numbers\n"
                "# (longest first, to the least-loaded shard); a class missing from here is\n"
                "# costed by its test count, so nothing is ever dropped.\n"
                "#\n"
                "# GENERATED -- do not edit by hand.  Refresh with\n"
                "#     scripts/refresh_shard_timings.py [CI run id ...]\n"
                f"# Source: {source}; {len(costs)} classes, {total / 1000:.0f}s in all\n"
                "# (the mean of every sample, so both arms of a CI run count).\n")
            for name in sorted(costs):
                f.write(f"{name} {costs[name]}\n")
        print(f"wrote {os.path.relpath(TIMINGS, ROOT)}: {len(costs)} classes, "
              f"{sum(tests.values())} tests, {total / 1000:.0f}s", file=sys.stderr)

    reserve = ci_reserve_default() if args.reserve is None else args.reserve
    loads = plan(costs, args.workers, reserve * 1000)
    s = sorted(loads)
    print(f"preview, {args.workers} shards, {reserve}s reserve on shard 0: "
          f"max {s[-1] / 1000:.0f}s, median {s[len(s) // 2] / 1000:.0f}s, "
          f"min {s[0] / 1000:.0f}s, ideal {(total + reserve * 1000) / args.workers / 1000:.0f}s; "
          f"heaviest class {max(costs.values()) / 1000:.0f}s", file=sys.stderr)


if __name__ == "__main__":
    main()
