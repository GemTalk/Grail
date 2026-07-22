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

* `./install_base.sh` # run ONCE per extent, as SystemUser, BEFORE the first `./install.sh`. Installs the shared, user-independent base (GsPackagePolicy env-1 session-method support, unicode comparison mode, restricted-class base methods). Idempotent. Selects the env-1 session-method patch by `$GEMSTONE/version.txt`: 3.7.x → `scripts/session_methods_env1_base_37.gs`; 4.0.x → `scripts/session_methods_env1_base_40.gs` (4.0's `Behavior>>compileMethod:` only routes env-0 through GsPackagePolicy, so the 4.0 patch recompiles it to route env-1 too — otherwise env-1 kernel-class methods fail with SecurityError 2257 on the class's SystemUser-owned policy). On a fresh stone this MUST run first, or `./install.sh` fails with a SecurityError (a per-user session cannot modify SystemUser-owned method dictionaries in objectSecurityPolicyId 1). Grail passes the full SUnit suite on both 3.7.5 and 4.0.
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
