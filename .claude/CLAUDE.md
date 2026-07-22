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

* `./install_base.sh` # run ONCE per extent, as SystemUser, BEFORE the first `./install.sh`. Installs the shared, user-independent base (GsPackagePolicy env-1 session-method support, unicode comparison mode, restricted-class base methods). Idempotent. Chooses the env-1 session-method support by GemStone version (from `$GEMSTONE/version.txt`) plus a capability probe: **3.7.x** always applies `scripts/session_methods_env1_base_37.gs` (stock 3.7 wires session methods for env-0 only). **4.0+** feature-probes for GemStone **MR #6** ("Support session methods in environments other than 0") via `scripts/detect_env1_session_methods.gs` (marker: `GsPackagePolicy>>permitSessionMethodFor:selector:environmentId:`) — if MR #6 is present, env-1 routing is **native** and **no patch is applied**; if absent (stock pre-MR#6 4.0), it falls back to `scripts/session_methods_env1_base_40.gs`, which recompiles `Behavior>>compileMethod:` to route env-1 through GsPackagePolicy (stock pre-MR#6 4.0 gates that consult on env-0 only, so env-1 kernel-class methods otherwise fail with SecurityError 2257 on the class's SystemUser-owned policy). A version alone can't tell an MR#6 4.0 from a stock 4.0 (both report 4.0.x), hence the probe. On a fresh stone `install_base.sh` MUST run first, or `./install.sh` fails with a SecurityError (a per-user session cannot modify SystemUser-owned method dictionaries in objectSecurityPolicyId 1). Grail passes the full SUnit suite on 3.7.5 and on 4.0 (both stock+patch and MR#6-native).
* `./install.sh` # per-user install (runs as the `.topazini` user, no SystemUser step). Installs this user's Grail: env-1 kernel-extension session methods + the `Python`/`PythonTests` dictionaries. Re-run after every Smalltalk edit.
* `./scripts/run_tests.sh` # run all Python-related tests (fresh worker sessions; picks up the install automatically)
* `source .setenv` # needed for stand-alone Topaz scripts

On a brand-new / freshly-restarted stone: `./install_base.sh` then `./install.sh`.
For iterating on edits after the base exists: just `./install.sh`.
NOTE: an older checkout predating this split has a MONOLITHIC `install.sh` that
commits Grail as SystemUser into objectSecurityPolicyId 1; running it against an
extent set up the split way corrupts it (per-user re-install then fails with
SecurityError 2116 modifying a policy-1 method dictionary). If you check out such
an old commit, use a fresh stone.

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
