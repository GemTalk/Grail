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

* `./install_base.sh` # run ONCE per extent, as SystemUser, BEFORE the first `./install.sh`. Idempotent, and entirely SystemUser, so it does NOT need the per-user login accounts to exist. What it installs is chosen by ONE test, the GemStone version from `$GEMSTONE/version.txt` (never the `$GEMSTONE` path — CI installs to an unversioned `/opt/gemstone/product`, where a `case "$GEMSTONE" in *3.7*` test would silently skip the 3.7 patch): **4.0+** installs **no Grail code at all** — only Unicode comparison mode (extent-global, kernel-enforced SystemUser-only) and the base marker, because MR #6 permits env-1 session methods on the restricted classes (`GsNMethod`/`System`/`SymbolDictionary`) and the 2/3/4-arg `with:…performMethod:` variants are kernel-native, so all five kernel-extension files are per-user session methods filed by `install.sh`. **Requires a 4.0 build of 2026-07-29 or later**; an older 4.0 lacks one or more of those fixes and `install.sh` will fail filing the kernel extensions — upgrade the product rather than reinstating the removed capability probes. **3.7.x** applies `scripts/session_methods_env1_base_37.gs` (stock 3.7 wires session methods for env-0 only) plus `scripts/install_base.gs`, which files all six kernel-extension files as SHARED SystemUser methods — 3.7 is published and cannot be fixed in the base image. On a fresh stone `install_base.sh` MUST run before `install.sh`, or `install.sh` fails with a SecurityError (a per-user session cannot modify SystemUser-owned method dictionaries in objectSecurityPolicyId 1). Grail passes the full SUnit suite on 3.7.5 and on 4.0.
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
