# Upgrading GemStone under a Grail database

A database written by one GemStone 4.0 alpha does not run on the next one's
engine: a 4.0.0.a8 gem refuses an a5 extent with *"The Gem and dbf versions are
incompatible"*. Moving it takes GemStone's own upgrade, then Rowan's, then a
Grail install with the new product. This is how to do it, as measured going from
**4.0.0.a5 to 4.0.0.a8**, and what had to be worked around on the way.
[Releases_and_Rowan.md](Releases_and_Rowan.md) covers the other kind of upgrade:
a newer Grail on the same engine.

## The procedure

Stop every session, and keep a copy of the extent. Then:

```bash
export GEMSTONE=/path/to/GemStone64Bit4.0.0.a8-...   # the NEW product
export GEMSTONE_SRC=~/GemTalk/gemstone               # GemTalk's gemstone repository
scripts/upgrade_engine.sh old/extent0.dbf new-dir/ mystone 4.0.0.a5
```

`scripts/upgrade_engine.sh` copies the extent (never changes it), starts stone
`mystone` on the copy under the new product, and runs:

1. **upgradeImage**: GemStone's kernel upgrade. It recompiles the kernel and
   removes every method of every kernel class. Because the bytecodes changed, it
   also disables each user's session-method policy, and every `GsPackage` in
   DataCurator's symbol list.
2. **upgradeImageRowan.stone**: Rowan's upgrade, with every step GemTalk's own
   conversion test uses. It restores Rowan's kernel extensions, repairs Rowan's
   records of the projects SystemUser can see, and reloads Rowan, the base image
   and those projects from the new product.

Then, as **each** user with a Grail install, run `./install.sh` with the new
product (a `.setenv` naming it and the stone). Rowan's upgrade does not touch
Grail, because Grail is each user's own project and SystemUser cannot see it. So
the install repairs it:

- It drops every Grail LoadedMethod whose compiled method the upgrade removed
  (5,826 of them for one user), so the load compiles them again. Otherwise Rowan
  treats them as loaded and unchanged, and leaves them missing.
- It re-enables the user's `GsPackage`. A disabled package's methods never reach
  a new session, so enabling the policy alone would leave every kernel extension
  missing.

`install.sh`'s redeploy then rebuilds the deployed modules, and the
application's data works as before.

## Measured

`tests/scripts/run_grail_upgrade_test.sh` with
`GRAIL_UPGRADE_FROM_PRODUCT=<a5 product>` runs each case across the engine
change. Grail n is installed and the app writes under a5. The database moves to
a8, then Grail m is installed, the app redeploys, and the checks run.

| case | n | m | result |
| --- | --- | --- | --- |
| `noop` | this checkout | this checkout | 232 passed, 0 failed, 2 known gaps |
| `release=a78e8c03` | GemDB Code's pinned Grail | this checkout | 231 passed, 0 failed, 2 known gaps |

The two known gaps are the namedtuple identity gap that #1833 closes. They
fail the same way without an engine change. `noop.classes_kept` passes, so no
Grail class is a new object after the engine upgrade.

The same procedure was also run by hand on a database an earlier upgrade test
had left, with data from Grail a78e8c03 upgraded to #1799's fix. After
`./install.sh` of this branch under a8, `verify_phase.py` read **105 passed, 0
failed**. Grail's whole `./scripts/run_tests.sh` then passed on that upgraded
database: all 8 shards answered, with 8,450 run and 0 failed. The three
NetLDI-backed tests (`gemdb-conflict`, `contextvars-session`,
`concurrent-import`) passed once the `.setenv` named an a8 NetLDI.

The harness needs both products and a gemstone checkout, so it is a local
check: CI's container has one product.

## The workarounds, and the defects behind them

Each is marked `WORKAROUND` in `scripts/upgrade_engine.sh`. All but the last
two are GemStone or Rowan defects, to report to GemTalk. Each workaround should
go when a release fixes its defect.

1. **4.0 ships no upgradeImage.** `bin/upgradeImage` and
   `upgrade/upgradeImage.topaz` are commented out of
   `build/release/PACKING.be`. The script takes `image/upgradeImage.topaz` from
   the gemstone repository at the new product's tag, and exports `upgradeDir`,
   which the shipped wrapper would have set (GemTalk's BatteryTest sets it the
   same way).
2. **upgradeImage's sub-scripts log in without a password.** Every
   `set user SystemUser` (and DataCurator, GcUser, HostAgentUser) in
   `upgradeImage.topaz`, `sessionmethods.topaz`, `installMonticello.topaz`,
   `gcuser.gs`, `nameless.gs` and `LoadsWithoutRowan.gs` names no password, so
   a non-interactive run fails at the first login. The script runs patched
   copies.
3. **The compiler classes fail to file in: "undefined symbol
   `Bc_SEND_SPECIAL_not_u32`".** The compiler classes have named the class
   variable since a5, but the upgrade path in `bom.c` never adds it to
   `GsCompilerIRNode`. The script adds it after `Filein1A`, with 218, its value
   in a fresh a8 image (`SpecialSendsDict at: #not`).
4. **superdoit_stone refuses every 4.x product.** Its version check rejects
   `4.0.0.a8` (the pattern allows only digits and dots), and its cases name
   3.5–3.9 only. So no `.stone` script runs on 4.0, Rowan's upgrade included.
   The script puts a copy that treats 4.x like 3.7 first on `PATH`.
5. **Rowan's upgrade breaks in Unicode comparison mode, which Grail's base
   turns on.** In that mode, a session looks up `=`, `<`, `>` and the
   `_idxPrimCompare*` selectors of `String`, `MultiByteString` and
   `Unicode7/16/32` through a transient method dictionary that answers the
   `_unicode*` methods. Rowan's repair looks methods up the same way. So it
   attaches those selectors' LoadedMethods to the wrong methods, and the
   persistent methods are left with none. The base-image reload then stops:
   *"Internal error -- no existing LoadedMethod found for the old
   compiledMethod"*, at `MultiByteString >> _idxPrimCompareEqualTo:`.
   - A stock a5 `extent0.rowan3.dbf` upgrades cleanly, and fails the same way
     once the mode is enabled, so this is not Grail's data.
   - Turning the mode off is no answer: a database holding Unicode strings then
     fails its first comparison.
   - The script patches a copy of `upgradeImageRowan.stone` to repoint those 30
     LoadedMethods between repair and reload.
   - The final audit still reports the same lookups: 30 methods not identical,
     21 with the wrong category, and five classes' class variables sorted in a
     different collation. The script accepts a failed audit only when every
     line is one of those.
6. **Rowan's reload cannot find the new product's projects.** An a5 extent
   records Rowan's projects home as `file:$GEMSTONE/projects`, which the reload
   treats as a relative path. It also insists that each project be a git
   repository, which the product's copies are not. The script sets
   `ROWAN_PROJECTS_HOME` to copies of `$GEMSTONE/projects` with one commit
   each, unless it already names clones.
7. **Rowan's upgrade repairs only the projects SystemUser can see.** This is
   by design, not a defect, but it leaves every per-user project as Grail's was
   left. `scripts/install_rowan.gs` and the pre-load doit now handle it for
   Grail (see the end of the procedure above).
8. **`upgradeImage` disables DataCurator's packages.** It does this
   deliberately when bytecodes change (`GsPackagePolicy _previousVersion < 33`).
   The pre-load re-enables Grail's.

Do not file in `upgrade/bootstrap/UpgradeRowanV3.gs` by hand after upgradeImage.
It restores Rowan's kernel extensions but not Rowan's records, and the next
Rowan load stops with the "no existing LoadedMethod" error above.
`upgradeImageRowan.stone` files it in itself, then repairs the records.
