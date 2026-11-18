#!/usr/bin/env python3
"""Rewrite tests/scripts/shard_timings.txt from measured per-class SUnit costs.

The SUnit gate places whole test classes on shards by measured cost
(GrailShardPlan, read by tests/scripts/runTestsShard.gs).  The costs come
from this file; every shard prints one line per class it ran,

    GRAIL_CLASS_TIME|<shard>|<class>|<ms>|<tests>

and this script collects them.  The numbers that matter are CI's -- the
gate's wall-clock is CI's -- so by default it downloads the logs of a CI run:

    scripts/refresh_shard_timings.py                 # latest 3 green merge-queue runs
    scripts/refresh_shard_timings.py 40562863481 ... # those runs
    scripts/refresh_shard_timings.py --local         # out/shard_*.out of a local run
    scripts/refresh_shard_timings.py --logs DIR...   # any directory of shard logs

Within one run a class's samples (one per arm) are averaged.  Across several
runs a class gets its LARGEST per-run figure, because per-class costs are not
additive: the first class in a session to import a shared module (flask,
pickle, ...) pays for compiling it and the classes after it ride free, so one
class measured 49s on one run and 116s on the next, and another 20s and 0.3s,
purely by what ran before them.  The largest figure is roughly the class's cost
when nothing before it shared its imports -- which is what it costs on a shard
of its own -- and over-costing a class that does share only makes its shard
finish early.  So refresh from two or three runs, ideally of different
partitions.  Classes that no longer exist simply drop out; new classes are absent
until the next refresh, and GrailShardPlan costs them by test count meanwhile,
so nothing is ever dropped from a run.

MEMORY is the file's optional third column.  Every shard also prints

    GRAIL_CLASS_MEM|<shard>|<class>|<KB>|<liveKB>

the KB a class added to what its shard holds live (in use after a mark
sweep) -- but only when GRAIL_SHARD_CLASS_MEM is set, because the sweep per
class costs a few percent of a shard.  ci.yml sets it on the scheduled nightly
and on a manual dispatch, so memory comes from the latest scheduled runs
unless the logs read for times already have it (--memory-runs ID ... names
others, --no-memory writes times only).  A shard is one session with a capped memory: a time-only plan once
gave one shard enough to end at 91-94% of it, where the gem's AlmostOutOfMemory
failed whichever test was running.  These figures depend on what ran first
even more than times do -- the first class to import django pays for it --
but here the LARGEST is the wrong summary: it tends to a class's cost alone,
and those, summed over a shard, came to about twice what shards held.  So a
class's memory is the MEAN of its per-run figures (negative ones count as 0).
Runs from before the measurement have no such lines; a class absent from all
of them has no third column, and GrailShardPlan costs it at the mean per test.

After writing, it prints the plan the file gives for --workers shards
(default 8, with --reserve seconds on shard 0, default the CI value) so a
refresh can be judged before it is committed -- and, when the file has
memory, the time-only plan beside it with the memory each of its shards would
hold.  This preview ignores the
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
MEM_LINE = re.compile(r"^GRAIL_CLASS_MEM\|(\d+)\|([^|]+)\|(-?\d+)\|(\d+)\s*$")
CI_RESERVE_S = 0


def ci_reserve_default():
    """GRAIL_TEST_SHARD0_RESERVE_S as ci.yml sets it, so the preview matches CI."""
    try:
        with open(os.path.join(ROOT, ".github", "workflows", "ci.yml")) as f:
            m = re.search(r"GRAIL_TEST_SHARD0_RESERVE_S=(\d+)", f.read())
            return int(m.group(1)) if m else CI_RESERVE_S
    except OSError:
        return CI_RESERVE_S


def latest_runs(n=3, event="merge_group"):
    out = subprocess.run(
        ["gh", "run", "list", "--repo", REPO, "--workflow", "ci.yml",
         "--event", event, "--status", "success", "--limit", str(n),
         "--json", "databaseId", "-q", ".[].databaseId"],
        check=True, capture_output=True, text=True).stdout.split()
    if not out:
        sys.exit(f"no successful {event} CI run found; pass a run id")
    return out


def download(run_id, dest):
    d = os.path.join(dest, run_id)
    os.makedirs(d)
    print(f"downloading shard logs of run {run_id} ...", file=sys.stderr)
    subprocess.run(["gh", "run", "download", run_id, "--repo", REPO,
                    "-p", "grail-ci-logs-*", "-D", d], check=True)
    return d


def collect(dirs):
    """Per class: time, the largest over the given runs of its mean within a
    run; memory, the mean over the runs that measured it of the same."""
    best = {}
    tests = {}
    mem_runs = defaultdict(list)
    files = 0
    for d in dirs:
        samples = defaultdict(list)
        mem_samples = defaultdict(list)
        for path in glob.glob(os.path.join(d, "**", "shard_*.out"), recursive=True):
            files += 1
            with open(path, errors="replace") as f:
                for line in f:
                    m = LINE.match(line)
                    if m:
                        samples[m.group(2)].append(int(m.group(3)))
                        tests[m.group(2)] = int(m.group(4))
                        continue
                    m = MEM_LINE.match(line)
                    if m:
                        mem_samples[m.group(2)].append(max(0, int(m.group(3))))
        for name, v in samples.items():
            best[name] = max(best.get(name, 0), round(sum(v) / len(v)))
        for name, v in mem_samples.items():
            mem_runs[name].append(sum(v) / len(v))
    memory = {name: round(sum(v) / len(v)) for name, v in mem_runs.items()}
    return best, tests, memory, files


def mean_filled(costs, tests, values):
    """Every timed class, with GrailShardPlan's mean-per-test figure for one
    that has no value of its own."""
    known = [n for n in costs if n in values]
    known_tests = sum(tests.get(n, 1) for n in known)
    per_test = sum(values[n] for n in known) / known_tests if known_tests else 0
    return {n: values.get(n, round(tests.get(n, 1) * per_test)) for n in costs}


def plan(costs, workers, reserve_ms, mems=None):
    """GrailShardPlan's rule, answering (time loads, memory loads).

    Time only (no mems): longest first, to the least-loaded shard; mems, if
    given with time_only, are only tallied.  With memory: a class is ranked
    by the larger of its two shares and goes to the shard where the larger of
    the resulting two shares is smallest, compared as integer cross-products
    exactly as the Smalltalk does."""
    loads = [0] * workers
    mem_loads = [0] * workers
    if reserve_ms:
        loads[0] = reserve_ms
    total_kb = sum(mems.values()) if mems else 0
    if not total_kb:
        for name in sorted(costs, key=lambda n: (-costs[n], n)):
            i = min(range(workers), key=lambda k: (loads[k], k))
            loads[i] += costs[name]
        return loads, mem_loads
    total_ms = (sum(costs.values()) + loads[0]) or 1
    rank = {n: max(costs[n] * total_kb, mems[n] * total_ms) for n in costs}
    for name in sorted(costs, key=lambda n: (-rank[n], n)):
        i = min(range(workers), key=lambda k: (
            max((loads[k] + costs[name]) * total_kb, (mem_loads[k] + mems[name]) * total_ms), k))
        loads[i] += costs[name]
        mem_loads[i] += mems[name]
    return loads, mem_loads


def time_only_memory(costs, workers, reserve_ms, mems):
    """The memory each shard of the TIME-ONLY plan would hold."""
    loads = [0] * workers
    mem_loads = [0] * workers
    if reserve_ms:
        loads[0] = reserve_ms
    for name in sorted(costs, key=lambda n: (-costs[n], n)):
        i = min(range(workers), key=lambda k: (loads[k], k))
        loads[i] += costs[name]
        mem_loads[i] += mems[name]
    return loads, mem_loads


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("runs", nargs="*", help="CI run id(s); default the latest 3 green merge-queue runs")
    ap.add_argument("--local", action="store_true", help="read out/shard_*.out of a local run")
    ap.add_argument("--logs", nargs="+", metavar="DIR", help="read shard logs under these directories, one run each")
    ap.add_argument("--workers", type=int, default=8, help="preview the plan for this many shards")
    ap.add_argument("--reserve", type=int, default=None, help="preview reserve on shard 0, seconds")
    ap.add_argument("--dry-run", action="store_true", help="print the preview, do not write the file")
    ap.add_argument("--memory-runs", nargs="+", metavar="ID", help="CI run(s) to read memory from; default the latest 3 scheduled ones")
    ap.add_argument("--no-memory", action="store_true", help="write times only")
    args = ap.parse_args()

    with tempfile.TemporaryDirectory() as tmp:
        if args.local:
            dirs, source = [os.path.join(ROOT, "out")], "a local run (out/shard_*.out)"
        elif args.logs:
            dirs, source = args.logs, "shard logs in " + " ".join(args.logs)
        else:
            runs = args.runs or latest_runs()
            dirs = [download(r, tmp) for r in runs]
            source = "CI run(s) " + " ".join(runs)
        costs, tests, memory, files = collect(dirs)
        mem_source = source
        if args.no_memory:
            memory, mem_source = {}, "none"
        elif args.memory_runs or not (memory or args.local or args.logs):
            mruns = args.memory_runs or latest_runs(3, "schedule")
            mdirs = [download(r, tmp) for r in mruns]
            memory = collect(mdirs)[2]
            mem_source = "CI run(s) " + " ".join(mruns)

    if not costs:
        sys.exit(f"no GRAIL_CLASS_TIME lines in {files} shard log(s) from {source}")
    total = sum(costs.values())

    if not args.dry_run:
        with open(TIMINGS, "w") as f:
            f.write(
                "# Measured per-class SUnit costs: '<ClassName> <ms> [<KB>]'.\n"
                "# GrailShardPlan places whole classes on the gate's shards by these numbers\n"
                "# (longest first, to the least-loaded shard, by time and -- where the KB\n"
                "# column is there -- by memory); a class missing from here is costed by\n"
                "# its test count, so nothing is ever dropped.\n"
                "#\n"
                "# GENERATED -- do not edit by hand.  Refresh with\n"
                "#     scripts/refresh_shard_timings.py [CI run id ...]\n"
                f"# Source: {source}; {len(costs)} classes, {total / 1000:.0f}s in all\n"
                "# (per run, the mean of a class's samples, so both arms count; across\n"
                "# runs, the largest -- see the script for why).\n"
                "# Third column, where measured: KB the class added to its shard's live\n"
                f"# memory (GRAIL_CLASS_MEM), the mean over runs; from {mem_source}.\n")
            for name in sorted(costs):
                kb = f" {memory[name]}" if name in memory else ""
                f.write(f"{name} {costs[name]}{kb}\n")
        print(f"wrote {os.path.relpath(TIMINGS, ROOT)}: {len(costs)} classes, "
              f"{sum(tests.values())} tests, {total / 1000:.0f}s, "
              f"memory for {sum(1 for n in costs if n in memory)}", file=sys.stderr)
    if not memory and not args.no_memory:
        print(f"no GRAIL_CLASS_MEM lines in {mem_source}: the plan stays time-only", file=sys.stderr)

    reserve = ci_reserve_default() if args.reserve is None else args.reserve
    mems = mean_filled(costs, tests, memory) if memory else {}
    previews = [("time + memory" if mems else "time only", plan(costs, args.workers, reserve * 1000, mems))]
    if mems:
        previews.append(("time only, for comparison", time_only_memory(costs, args.workers, reserve * 1000, mems)))
    for label, (loads, mem_loads) in previews:
        s = sorted(loads)
        print(f"preview, {label}, {args.workers} shards, {reserve}s reserve on shard 0: "
              f"max {s[-1] / 1000:.0f}s, median {s[len(s) // 2] / 1000:.0f}s, "
              f"min {s[0] / 1000:.0f}s, ideal {(total + reserve * 1000) / args.workers / 1000:.0f}s; "
              f"heaviest class {max(costs.values()) / 1000:.0f}s", file=sys.stderr)
        if mems:
            print("    per shard (s / MB added): " + "  ".join(
                f"{i}={loads[i] / 1000:.0f}/{mem_loads[i] // 1024}" for i in range(args.workers)),
                file=sys.stderr)


if __name__ == "__main__":
    main()
