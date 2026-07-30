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

On a brand-new extent (new image): `./create_claude_users.sh`, THEN
`./install_base.sh`, THEN `./install.sh`. On a freshly-restarted stone whose
extent already has the accounts: `./install_base.sh` then `./install.sh`.

**The user-creation step comes FIRST, before `install_base.sh`** — not between it
and `install.sh`, as the ordering intuitively suggests. `install_base.sh`'s
capability probes (`detect_modern_kernel.gs`,
`detect_env1_restricted_classes.gs`) log in **as the `.topazini` user**, because
what they measure is what a *non-SystemUser* installer may do. On a fresh extent
that account does not exist yet, both probes print nothing, and a missing line
reads the same as a capability answer of "no" — so `install_base.sh` would
silently drop to the **legacy shared-base tier** and file all six
kernel-extension files as SystemUser methods. That is the opposite of the right
answer on 4.0, and every later per-user `./install.sh` then fails with
SecurityError 2116 clearing a policy-1 method dictionary. `install_base.sh` now
guards against this (`scripts/check_topazini_user.gs`) and fails with the fix
rather than mis-tiering.

## 4.0 needs NO Grail code in the shared base
As of the 2026-07-29 4.0 build, `detect_modern_kernel.gs` reports
`GRAIL_MODERN=yes`: MR #6 permits env-1 session methods on the restricted classes
(`GsNMethod` / `System` / `SymbolDictionary`), and the 2/3/4-arg
`with:…performMethod:` variants are kernel-native (category `Message Handling`).
So `install_base.sh` files **no Grail code at all** — only Unicode comparison
mode (extent-global, kernel-enforced SystemUser) and the base marker. All five
kernel-extension files are per-user session methods, verified isolated: an
installed user sees its env-1 methods entirely in the transient session
dictionary, and a second user who has not run `install.sh` sees none of them.
3.7.x still needs the shared base (`scripts/session_methods_env1_base_37.gs` plus
`scripts/install_base.gs`).
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
