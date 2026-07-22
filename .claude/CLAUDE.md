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

* `./install_base.sh` # run ONCE per extent, as SystemUser, BEFORE the first `./install.sh`. Installs the shared, user-independent base (GsPackagePolicy env-1 session-method support, unicode comparison mode, restricted-class base methods). Idempotent. On a fresh stone this MUST run first, or `./install.sh` fails with a SecurityError (a per-user session cannot modify SystemUser-owned method dictionaries in objectSecurityPolicyId 1).
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
