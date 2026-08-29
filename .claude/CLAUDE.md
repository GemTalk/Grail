# GemStone Information
* [Programmer's Guide](https://downloads.gemtalksystems.com/docs/GemStone64/3.7.x/GS64-ProgGuide-3.7/MAIN.htm)
* [GemBuilder for C](https://downloads.gemtalksystems.com/docs/GemStone64/3.7.x/GS64-GemBuilderC-3.7/MAIN.htm)
* [Smalltalk Source](./gemstone)
* [include](~/Documents/GemStone/GemStone64Bit3.7.5-arm64.Darwin/include)

# Install Changes and Run Tests

The install is split into a shared base (installed once, as SystemUser) plus a
per-user layer. This is the standard workflow on `main`: several users can each
install their own Grail (per-user session methods + `Python*` dictionaries) on
one shared stone.

* `./install_base.sh` # run ONCE per extent, as SystemUser, BEFORE the first `./install.sh`. Idempotent, and entirely SystemUser, so it does NOT need the per-user login accounts to exist. What it installs is chosen by ONE test, the GemStone version from `$GEMSTONE/version.txt` (never the `$GEMSTONE` path — CI installs to an unversioned `/opt/gemstone/product`, where a `case "$GEMSTONE" in *3.7*` test would silently skip the 3.7 patch): **4.0+** installs **no Grail code at all** — only Unicode comparison mode (extent-global, kernel-enforced SystemUser-only) and the base marker, because MR #6 permits env-1 session methods on the restricted classes (`GsNMethod`/`System`/`SymbolDictionary`) and the 2/3/4-arg `with:…performMethod:` variants are kernel-native, so all five kernel-extension files are per-user session methods filed by `install.sh`. **Requires a 4.0 build of 2026-07-29 or later**; an older 4.0 lacks one or more of those fixes and `install.sh` will fail filing the kernel extensions — upgrade the product rather than reinstating the removed capability probes. **3.7.x** applies `scripts/session_methods_env1_base_37.gs` (stock 3.7 wires session methods for env-0 only) plus `scripts/install_base37.gs`, which files all six kernel-extension files as SHARED SystemUser methods — 3.7 is published and cannot be fixed in the base image. On a fresh stone `install_base.sh` MUST run before `install.sh`, or `install.sh` fails with a SecurityError (a per-user session cannot modify SystemUser-owned method dictionaries in objectSecurityPolicyId 1). Grail passes the full SUnit suite on 3.7.5 and on 4.0.
* `./install.sh` # per-user install (runs as the `.topazini` user, no SystemUser step). Installs this user's Grail: env-1 kernel-extension session methods + the `Python`/`PythonTests` dictionaries. Re-run after every Smalltalk edit.
* `./scripts/run_tests.sh` # run all Python-related tests (fresh worker sessions; picks up the install automatically)
* `source .setenv` # needed for stand-alone Topaz scripts

On a brand-new extent (new image): `./create_claude_users.sh`, `./install_base.sh`,
`./install.sh` — the first two in either order, since `install_base.sh` is entirely
SystemUser. On a stone whose extent already has the accounts:
`./install_base.sh` then `./install.sh`.

**A fresh extent has no per-user login accounts**, so `create_claude_users.sh` is
easy to miss: `.topazini` names a user (e.g. `Claude1`) that does not exist yet.
`install.sh` now checks for it up front (`scripts/check_topazini_user.gs`) and
fails with that instruction, instead of building the C shim and then dying on
topaz's bare "userId/password is invalid". CI is unaffected — it logs in as
`DataCurator`, which every extent has.

## How much CPython suite to run before a PR

Two tiers, chosen by WHAT THE CHANGE TOUCHES, not by how big it feels. The full
suite is ~6 minutes and grows as modules are added; a single module is ~26s and
stays flat, so tiering keeps the common case cheap while still covering the
changes that can actually reach across modules.

* **Tier 1 — targeted module + `./scripts/run_tests.sh`.** The change is
  confined to one stdlib module or its Smalltalk peer (`enum.gs`,
  `PyEnumTypes.gs`, `operator.py`, …). Nothing outside that module can plausibly
  move, so a full run buys nothing the nightly won't give you. Most conformance
  work lands here.
* **Tier 2 — full `./scripts/run_cpython_suite.sh`, then
  `./scripts/check_cpython_regressions.sh`, before opening the PR.** The change
  touches SHARED MACHINERY, where the blast radius is the whole corpus by
  construction: `Object.gs`, anything in `PythonAst/` (codegen runs for every
  module), `importlib.gs`, builtins, the attribute/descriptor path. Quote the
  "0 regressions" result in the PR body — for a change that fires on every class
  definition, the number is the evidence, not a reassurance.

Why tiered rather than always-full: over PRs #327–#347 the full suite caught
exactly ONE out-of-module regression — #333, where giving `object.__repr__` a
real address broke three `test_operator` tests. That change was tier 2. The nine
quiet runs were all tier 1. The signal tracks the file, not the luck.

The nightly GitHub action (plus a manual on-demand run) covers what tier 1
skips. Its one real cost is attribution: a nightly diff is a day of merges wide,
so budget for the occasional bisect rather than assuming it is free.

### The committed baseline is CI-measured; do not commit a local one

`check_cpython_regressions.sh` gates against `git show HEAD:docs/CPython_Suite_Scoreboard.md`,
and the only thing that ever runs that gate is the nightly, on **Linux x86_64**.
A local full-suite run is measured on whatever this machine is, and the two need
not agree. So committing a locally-regenerated board can make the nightly report
a REGRESSION on a row nobody touched — it did, for 11 nightlies running — and a
local run reporting a row as IMPROVED may be reporting the machine, not a win.

**The long-standing example of that is now FIXED, and how it ended is the more
useful lesson.** `test.test_traceback` read 14 fail+err on Darwin arm64 and 16 in
CI, deterministically in both, and was treated for months as an inherent platform
delta to be absorbed into the baseline. It was not: `GEM_NATIVE_CODE_ENABLED` is
on by default on Linux x86_64 and unavailable on Darwin arm64, and a `_gsStack`
capture holds a NATIVE ip that Grail was feeding to lookups wanting a PORTABLE
one (PR #710). Both platforms now read **14**, and the committed row is right.

So treat a stable platform-only delta as an **unexplained defect**, not as noise
to baseline away — the fix is usually reachable, and baselining hides it. Note
too that a Mac tests a different execution mode from CI, so anything derived from
an ip is untested locally: a Linux x86_64 container built from
`tests/github/Dockerfile` runs under emulation and reproduces it.

**Run the suite locally as the tiering rule says; just do not commit the board it
rewrites.** `git checkout -- docs/CPython_Suite_Scoreboard.md` before committing,
and quote the gate's verdict in the PR body instead. To move the baseline:

* it moves **on its own** after a nightly that finds improvements and no
  regressions — `.github/workflows/cpython-conformance.yml` opens a PR with the
  CI-measured board;
* for anything else (a platform-only delta, a deliberate acceptance), run that
  workflow manually with `refresh_baseline=true` and merge the PR it opens.

### The conformance gate is not in the pre-merge pipeline

`ci.yml` (pull_request / merge_group) runs `check_python_fixtures.sh` and the
SUnit shards. It contains no reference to `run_cpython_suite.sh` or
`check_cpython_regressions.sh`. A green PR therefore says nothing about the
CPython scoreboard, and a scoreboard regression is first seen in the nightly — a
day of merges wide. That is the trade the tiering rule above exists to cover.

Two traps in this harness, both of which look like a passing run:

* **The module name is `test.test_enum`, not `test_enum`.** A bare name scores
  `IMPORTERROR` ("no file on search path") and writes `out/cpython/test_enum.out`
  — leaving the previous `out/cpython/test.test_enum.out` in place, so the
  obvious next command reads a STALE result that looks fine.
* **`check_cpython_regressions.sh` does NOT run the suite.** It compares
  `out/cpython/scoreboard.json` against the checked-in scoreboard, so it happily
  passes against whatever the last run left behind. Run the suite first.

## 4.0 needs NO Grail code in the shared base
On 4.0 (build 2026-07-29 or later) `install_base.sh` files nothing of Grail's:
MR #6 permits env-1 session methods on `GsNMethod`/`System`/`SymbolDictionary`,
and the 2/3/4-arg `with:…performMethod:` variants are kernel-native. All five
kernel-extension files are per-user session methods, verified isolated: an
installed user sees its env-1 methods entirely in the *transient session*
dictionary, and a second user who has not run `install.sh` sees none of them and
has no `Python` dictionary. So several users can work on one stone without
overwriting each other — which shared filing did, in both directions.

3.7.x still needs the shared base and always will (published, unfixable).

## Selecting the stone + NetLDI (two files, per checkout)
Both are gitignored (per-machine); when switching GemStone versions edit BOTH so
they agree:
* `.setenv` — `GEMSTONE` (product dir) + `GEMSTONE_NAME` (stone) + `GRAIL_NETLDI`
  (netldi). Sourced by install/test scripts; the RPC concurrency test
  (`tests/scripts/run_concurrent_import_test.sh`) reads `GEMSTONE_NAME`/`GRAIL_NETLDI`
  and fails fast if unset — there is no hardcoded stone/netldi default.
* `./.topazini` — credentials (`set user … pass …`) + `set gemstone <stone>`.
  Linked topaz (install.sh, install_base.sh, run_tests.sh, …) reads this to log
  in. Keep its `set gemstone` in step with `GEMSTONE_NAME` in `.setenv`.

CI does not use these local files: `tests/github/setup-testing-env.sh` writes its
own `~/.topazini`, and the workflows export `GEMSTONE_NAME`/`GRAIL_NETLDI` inline.

## After `install.sh`, refresh a long-lived MCP/topaz session
A session that stays logged in across an `install.sh` will NOT see rebuilt
built-in/canonical Python modules just from an `abort`. `install.sh` bumps
`GrailRuntimeGeneration`, but the per-session generation check is memoized in
`SessionTemps` (`#GrailCanonicalGenChecked`), and already-imported module
instances stay cached in `sys.modules` (also session-local). `abort` refreshes
the DB view (so recompiled *Smalltalk methods* — AST codegen, `Object`, … — ARE
picked up) but touches neither cache, so `import operator` etc. keep serving the
old code. After each `install.sh`, run this in the MCP session:

```smalltalk
importlib resetSessionForReinstall
```

It aborts, un-memoizes + re-runs the generation guard (drops stale canonical
registries), and evicts every non-bootstrap module from `sys.modules` so the
next import rebuilds from disk. (Fresh `run_tests.sh` workers don't need it —
they log in with empty `SessionTemps`.)

# Parallel agents: one worktree = one GemStone user

Several Claude agents can work at once on different branches, each in its own
git worktree under `.claude/worktrees/<branch>` (gitignored). Create them with:

```bash
./scripts/new_worktree.sh <branch> [--stone gs375|gs40] [--user ClaudeN]
```

**The rule that matters: a worktree must never share a (stone, user) pair with
another checkout.** `install.sh` installs a PER-USER Grail — env-1 session
methods plus the `Python*` dictionaries — into a shared stone, so two checkouts
logging in as the same user overwrite each other's install, in both directions.
That is exactly what the `Claude0..Claude3` users from `create_claude_users.sh`
are for. `new_worktree.sh` enforces this: it scans every existing `.topazini`
(including the main checkout's) and hands out the first unclaimed user, refusing
`--user` for one already taken unless you pass `--force-user`.

`git worktree add` on its own is NOT sufficient. A bare worktree has no
`.setenv` / `.topazini` (both gitignored, per-checkout) and no built C shim.
`new_worktree.sh` writes both config files for the chosen stone and copies
`.claude/settings.local.json` across; it deliberately does not run `install.sh`,
which each agent should run itself inside its worktree.

Current layout on this machine:

| worktree | branch | stone | netldi | user |
| --- | --- | --- | --- | --- |
| (main checkout) | `main` | `gs375` | `ldi375` | `DataCurator` |
| `.claude/worktrees/wt/a` | `wt/a` | `gs375` | `ldi375` | `Claude0` |
| `.claude/worktrees/wt/b` | `wt/b` | `gs375` | `ldi375` | `Claude1` |
| `.claude/worktrees/wt/c` | `wt/c` | `gs40` | `ldi40` | `Claude2` |
| `.claude/worktrees/wt/d` | `wt/d` | `gs40` | `ldi40` | `Claude3` |

Per-stone prerequisites, both already done on `gs375` and `gs40`:
`./create_claude_users.sh` then `./install_base.sh` (once per extent).

Build artifacts (`lib/`, `src/c/shim/*.o`, `libcpython_ua.dylib`) are per-worktree,
so the worktrees do not contend over them. Remove a finished worktree with
`git worktree remove .claude/worktrees/<branch>`, which frees its Claude user
for the next one.
