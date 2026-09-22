# GemStone Information

**Grail requires GemStone 4.0** (build 2026-07-29 or later). Support for 3.7.x
was removed; `install.sh` and `install_base.sh` refuse a 3.x product up front.

The manuals below are the 3.7 ones because GemTalk has published no 4.0 manual
set yet (the 4.0.x doc URLs 404). They remain the reference for everything that
did not change; where 4.0 differs, the kernel itself is the authority — probe it
in topaz rather than trusting the 3.7 text.

* [Programmer's Guide](https://downloads.gemtalksystems.com/docs/GemStone64/3.7.x/GS64-ProgGuide-3.7/MAIN.htm)
* [GemBuilder for C](https://downloads.gemtalksystems.com/docs/GemStone64/3.7.x/GS64-GemBuilderC-3.7/MAIN.htm)
* [Smalltalk Source](./gemstone)
* [include](~/Documents/GemStone/GemStone64Bit4.0.0-arm64.Darwin/include)

# Install Changes and Run Tests

The install is split into an extent-global base (once per extent, as SystemUser)
plus a per-user layer. This is the standard workflow on `main`: several users can
each install their own Grail (per-user session methods + `Python*` dictionaries)
on one shared stone.

* `./install.sh` # the one command you need. Per-user install (runs as the `.topazini` user): env-1 kernel-extension session methods + the `Python`/`PythonTests` dictionaries. Re-run after every Smalltalk edit. It probes for the extent-global base and, when absent, runs `./install_base.sh` for you — so on a fresh stone this alone is enough.
* `./install_base.sh` # the extent-global base, as SystemUser. Idempotent, entirely SystemUser, so it does NOT need the per-user login accounts to exist. **Run it directly only when you want the base on its own** (provisioning a stone before the accounts exist); otherwise `install.sh` invokes it. It installs **no Grail code at all** — MR #6 permits env-1 session methods on the restricted classes (`GsNMethod`/`System`/`SymbolDictionary`) and the 2/3/4-arg `with:…performMethod:` variants are kernel-native, so every kernel-extension file is a per-user session method filed by `install.sh` (`scripts/kernel_class_extensions.gs`). What is left is the irreducibly SystemUser part: Unicode comparison mode and the `#GrailBaseInstalled` marker. **That split is about PRIVILEGE, not idempotency** — measured on 4.0 as an ordinary user, `CharacterCollection enableUnicodeComparisonMode` answers *"Only SystemUser should execute this method"* and a `Globals at:put:` answers SecurityError 2116. It cannot be folded into `install.sh`'s own login; it needs a separate SystemUser one.
* `./scripts/run_tests.sh` # run all Python-related tests (fresh worker sessions; picks up the install automatically)
* `source .setenv` # needed for stand-alone Topaz scripts

On a brand-new extent (new image): `./create_claude_users.sh` then `./install.sh`
— the second runs the base itself. On a stone whose extent already has the
accounts and the base: just `./install.sh`.

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

### The baseline has been re-measured on 4.0 — one row moved

Dropping 3.7.x moved the conformance nightly from the public `ci-base` image
(which baked a 3.7.5 product) to GemTalk's 4.0 container, the same one `ci.yml`
uses, so every row in `docs/CPython_Suite_Scoreboard.md` had been measured on a
kernel the nightly no longer runs. **That is done.** #945 merged at 02:32 UTC on
2026-09-12, the manual `refresh_baseline=true` run (34670704039) followed at
03:33, and #948 merged its board at 13:05. The committed board is a 4.0
measurement, the gate's verdicts mean something again, and a tier-2 PR can quote
a number the gate can interpret.

**What it found is the part worth keeping.** This section used to say "expect
real movement in that PR — it is a kernel change, not noise." That prediction
was wrong. The whole 4.0 re-measurement moved **one row**, and it was an
improvement:

```
- | test.test_codecs | ERROR | 287 | 21 | 44 | 22 |
+ | test.test_codecs | ERROR | 287 | 18 | 22 | 22 |
```

25 fewer failures in one module, nothing else in the corpus. So the 3.7.5 board
had been a near-perfect predictor of 4.0 behaviour, and the months of nightlies
gated against it were not the noise this section feared. Treat a kernel change
as a reason to re-measure — not as a reason to expect the numbers to move.

The general rule still stands, and is the reason the refresh was needed at all:
a board measured on one kernel cannot gate a run on another. It just turned out
to cost one row rather than a page.

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
one (PR #710). That closed the delta at 14 apiece; the work since has closed the
rest, and as of 2026-09-12 the row is **`OK | 370 | 0 | 0 | 225`** on the
CI-measured board and identical when measured on Darwin arm64. Nothing is left
of the discrepancy that was nearly baselined away.

So treat a stable platform-only delta as an **unexplained defect**, not as noise
to baseline away — the fix is usually reachable, and baselining hides it. Note
too that a Mac tests a different execution mode from CI, so anything derived from
an ip is untested locally. To reproduce it, run GemTalk's
`container.gemtalksystems.com/gemstone/gemstone/main:grail` image under x86_64
emulation (`--platform linux/amd64`) — `docker pull` first, it is a moving tag
rebuilt daily. `tests/github/Dockerfile` used to serve this purpose by baking the
public 3.7.5 download; it went with 3.7.x support, and there is no public 4.0
download to replace it with.

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

## No Grail code goes in the shared base
`install_base.sh` files nothing of Grail's: MR #6 permits env-1 session methods
on `GsNMethod`/`System`/`SymbolDictionary`, and the 2/3/4-arg
`with:…performMethod:` variants are kernel-native. Every kernel-extension file is
a per-user session method (`scripts/kernel_class_extensions.gs`, `input`ed by
`install.gs`), verified isolated: an installed user sees its env-1 methods
entirely in the *transient session* dictionary, and a second user who has not run
`install.sh` sees none of them and has no `Python` dictionary. So several users
can work on one stone without overwriting each other.

**That is what dropping 3.7.x bought.** 3.7 is published and could never be
fixed, so it needed both an env-1 session-method policy patch and a SHARED
SystemUser filing of every kernel extension — and shared filing is exactly what
made two users on one stone overwrite each other's install, in both directions.
Carrying it meant every kernel-extension file had to work both ways.

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
./scripts/new_worktree.sh <branch> [--stone gs40] [--user ClaudeN]
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
| (main checkout) | `main` | `gs40` | `ldi40` | `DataCurator` |
| `.claude/worktrees/wt/a` | `wt/a` | `gs40` | `ldi40` | `Claude0` |
| `.claude/worktrees/wt/b` | `wt/b` | `gs40` | `ldi40` | `Claude1` |
| `.claude/worktrees/wt/c` | `wt/c` | `gs40` | `ldi40` | `Claude2` |
| `.claude/worktrees/wt/d` | `wt/d` | `gs40` | `ldi40` | `Claude3` |

`gs40` is the only stone now — `gs375` went with 3.7.x support. Per-extent
prerequisite: `./create_claude_users.sh` (and the base, which `./install.sh`
installs by itself).

**"Already done" is a property of the EXTENT, not of the stone name.** Rebuild
the extent and the accounts go with it, however long `gs40` has been working.
The symptom is `install.sh` refusing with "the ./.topazini user cannot log in"
in every worktree at once, while `gslist` shows a perfectly healthy stone —
check its *Started* time, and check `AllUsers` for `Claude0`, before
diagnosing anything else. Measured on 2026-09-17: the extent had been rebuilt
and `install_base.sh` re-run, so `GrailBaseInstalled` answered true and only
the accounts were missing. Each worktree still needs its own `install.sh`
afterwards — the per-user Grail layer went with the old extent too.

Build artifacts (`lib/`, `src/c/shim/*.o`, `libcpython_ua.dylib`) are per-worktree,
so the worktrees do not contend over them. Remove a finished worktree with
`git worktree remove .claude/worktrees/<branch>`, which frees its Claude user
for the next one.

## Two worktrees on ONE stone: the session budget

`run_tests.sh` opens `GRAIL_TEST_WORKERS` sessions — **eight** since PR #876 —
and a stone has a max-sessions limit. When that limit is tight the failure mode
is the dangerous kind: the losing shards die with `Login failed: the maximum
number of users are already logged in` and contribute nothing, while the runner
still prints a well-formed, GREEN suite line. It read `4288 run, 4288 passed, 0
failed` where a full run is 6535. A vacuous pass that looks like a pass is worse
than a crash.

**How tight the limit is depends on the LICENSE KEY, so measure it rather than
assuming.** A Community key caps `StnMaxSessions` at 10, which left exactly
eight after the stone's own gems — the same eight a full run wants, with zero
headroom, so a single stray session cost a shard its login. An internal key
lifts the cap and GemStone's default of **40** applies instead, which is room
for four concurrent suites and retires that failure entirely. `run_tests.sh`
prints what it found before it launches (`stone sessions: max=… in-use=…
free-for-shards=… (need …)`), so the number is in every run's output.

Serializing still pays, but for WALL-CLOCK rather than correctness once the
budget is generous — one suite already saturates the performance cores, so a
second concurrent suite competes rather than scaling:

```bash
./scripts/with_stone_lock.sh ./scripts/run_tests.sh
GRAIL_TEST_COLD=1 GRAIL_IR_CODEGEN=1 ./scripts/with_stone_lock.sh ./scripts/run_tests.sh
./scripts/with_stone_lock.sh ./scripts/run_cpython_suite.sh
```

**Wrap the CPython suite too, not just `run_tests.sh`.** It opens
`GRAIL_CPYTHON_WORKERS` sessions of its own (four by default), so on a tight
budget an unlocked four alongside a locked eight exceeds the limit — and the
lock then supplies false confidence rather than exclusion.

The lock is keyed on `GEMSTONE_NAME`. Every worktree is on `gs40` now, so in
practice it serializes all of them; it is opt-in and CI never calls it. Whether or not you use it,
**a suite line is only a gate result once the run accounts for every shard**:

```bash
grep -h GRAIL_SHARD_RESULT out/shard_*.out | wc -l   # must equal the worker count
grep -l 'Login failed' out/shard_*.out               # must be empty
```

### The limit counts the stone's OWN gems

Whatever the key allows, `reclaimgcgem` and `symbolgem` hold two slots from the
moment the stone starts, so the usable figure is always two below the maximum.
That is what made a Community key so tight: 10 − 2 = **8**, exactly what a full
run wants, so an editor's Jasper/MCP session, an `install.sh`, a stray `topaz`
probe or another worktree's framework deploy each cost a SHARD its login. On a
40-session stone the same arithmetic leaves 38 and the problem does not arise.

So the lock is necessary and not sufficient. `run_tests.sh` asks the stone for
its free-slot count immediately before launching shards
(`tests/scripts/checkSessionBudget.gs`) and refuses rather than launching a run
it cannot finish; `GRAIL_ALLOW_TIGHT_SESSIONS=1` overrides, and a run made that
way is explicitly not a gate result. The check costs one session and about a
second, and it is cheap insurance on a generous stone rather than dead weight —
it is what tells you the budget changed.

**The shared page cache is capped by the OS, not by the key.** GemStone
allocates it as a SysV segment, macOS defaults `kern.sysv.shmmax` to 1 GB, and
the segment carries roughly 7% overhead on top of `SHR_PAGE_CACHE_SIZE_KB`. So a
cache at or above 1 GiB makes the stone **fail to start** until that limit is
raised — on this machine by the `shared-memory` LaunchDaemons in
`/Library/LaunchDaemons`, which re-apply at boot. Note also that a bigger cache
is not free speed: raising it from 98 MB to 4 GiB moved the suite 373s → 403s,
because the suite is CPU-bound (8 shards draw 620–760% CPU on 6 performance
cores), not page-cache-bound.

Read the suite line for what it now says. It reports the shards that ANSWERED,
not the ones requested, and an incomplete run says `main suite INCOMPLETE` in
the same breath as its total — because the old line read `sharded: 8 of x8`
whatever happened, and on 2026-09-20 printed `8 of x8: 3408 run, 3408 passed, 0
failed, 0 errors` directly below four `NO RESULT` lines.

### The lock's liveness is the holder's PID

It used to be a pgrep over `topaz.*(runTestsShard|run_one_cpython_module)` plus
a 45-minute age threshold. That is wrong in both directions and the permissive
direction corrupts a run silently:

* `run_tests.sh` matches that pattern only during its SHARD phase. It opens a
  `deployFrameworks` session before the shards and ~14 more sequential topaz
  sessions after them (`cpython-embedded`, `gemdb`, `slot-compaction`,
  `flask-deploy`, …), none of which name `runTestsShard`. Observed live on
  2026-09-20: lock held, `run_tests.sh` alive, pattern matching **zero**
  processes. Full runs have been measured at 4531s, well past the threshold.
* the pattern was GLOBAL, not per-lock, so an unrelated worktree's shards
  vouched for a lock they had nothing to do with.
* conversely, a holder killed one second ago kept its lock for 45 minutes.

`with_stone_lock.sh` now asks whether the PID it already records in
`$LOCK/owner` is alive (confirming the command line, against PID reuse). That
covers every phase, needs no pattern maintenance as phases are added, and
reclaims a dead holder's lock in seconds. `tests/scripts/run_stone_lock_test.sh`
guards it and needs no stone.
