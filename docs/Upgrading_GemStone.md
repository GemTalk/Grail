# Upgrading GemStone under a Grail database

A database written by one GemStone 4.0 alpha does not run on the next one's
engine: a 4.0.0.a8 gem refuses an a5 extent with *"The Gem and dbf versions are
incompatible"*. Moving it takes GemStone's own upgrade, then Rowan's, then a
Grail install with the new product. This is how to do it, as measured going from
**4.0.0.a5 to 4.0.0.a8**, and what had to be worked around on the way.
[Releases_and_Rowan.md](Releases_and_Rowan.md) covers the other kind of upgrade:
a newer Grail on the same engine.

## The procedure

Stop every session and the stone. Then, with the new product:

```bash
export GEMSTONE=/path/to/GemStone64Bit4.0.0.a8-...   # the NEW product
export GEMSTONE_GLOBAL_DIR=...                        # as for any stone
scripts/upgrade_engine.sh --in-place path/to/extent0.dbf upgrade_stone 4.0.0.a5
```

The extent is upgraded where it lies. `scripts/upgrade_engine.sh`:

- refuses if a stone is running on the extent (`lsof`) or a stone named
  `upgrade_stone` is running;
- copies the extent to `extent0.dbf.pre-4.0.0.a5`, and keeps it after a success
  too;
- starts a temporary stone, `upgrade_stone`, on the extent under the new
  product, with `-N`: the old tranlogs are not needed. Its config is the
  product's `system.conf`, then one executable config in `extent0.dbf.upgrade/`
  (in a GemStone config file the last setting of a name wins):
  - the database's own stone config, when `UPGRADE_ENGINE_STONE_CONFIG` names it
    (one file, or several separated by `:` and read in order; for GemDB, its
    `conf/system.conf:conf/gemdb.conf`). Its `KEYFILE`, `DBF_EXTENT_SIZES`,
    `DBF_PRE_GROW`, page cache and so on hold for the upgrade too. Without it,
    the product's key, and `DBF_EXTENT_SIZES` of at least the extent's own size:
    a stone with no size allows only 8,192 MB, and refuses to start on GemDB's
    pre-grown 10,240 MB extent ("Your repository is already of size 10240
    Mbytes, which is larger than your maximum licensed repository size");
  - then what the upgrade needs, overriding the database's: the extent's name,
    its own tranlog directory with partial logging, local passwordless logins
    on, and no statmonitor. `GEMSTONE_SYS_CONF` and `GEMSTONE_EXE_CONF` are
    unset, so a caller's (GemDB exports both) does not configure the upgrade's
    gems;
- checks, with a passwordless login, that the extent was last written by the
  version named;
- runs **upgradeImage**, GemStone's kernel upgrade. It recompiles the kernel and
  removes every method of every kernel class. Because the bytecodes changed, it
  also disables every user's session-method policy (`GsPackagePolicy`), and every
  `GsPackage` in DataCurator's symbol list;
- runs **upgradeImageRowan.stone**, Rowan's upgrade, with every step GemTalk's own
  conversion test uses. It restores Rowan's kernel extensions, repairs Rowan's
  records of the projects SystemUser can see, and reloads Rowan, the base image
  and those projects from the new product;
- stops the stone and exits 0. Nothing is left running; the logs stay in
  `extent0.dbf.upgrade/log`.

On any failure it stops the stone, copies the backup back over the extent and
exits non-zero. Each progress line starts `upgrade_engine: `, and the last line
says what failed. The database's own stone config, tranlog directory and all,
starts the upgraded extent as before, with the new product.

Then, as **each** user with a Grail install, run `./install.sh` with the new
product (a `.setenv` naming it and the stone). Rowan's upgrade does not touch
Grail, because Grail is each user's own project and SystemUser cannot see it. So
the install repairs it:

- It drops every Grail LoadedMethod whose method is gone: the class answers no
  method, or another one, for the selector in the method's own environment,
  session methods included. After a5 to a8 that is Grail's session methods
  (1,568 for one user), which the disabled policy no longer installs. The load
  then compiles them again; otherwise Rowan treats them as loaded and unchanged,
  and leaves them missing. On an ordinary reinstall it finds none.
- After the load it deletes those of them the new source no longer has. Rowan
  has forgotten loading them, so it would not delete them itself.
- Rowan's own audit is no use for this: it looks methods up in environment 0
  only, so it reports every env-1 (Python) method missing on every reinstall.
  Dropping all of those made Rowan forget it had loaded them, and a release that
  removed one left it in place. The upgrade test's `synthetic` case caught it
  (`probe.removed_method`, `probe.removed_session_method`).
- It re-enables the user's `GsPackage` and `GsPackagePolicy`. A disabled
  package's methods never reach a new session, so enabling the policy alone would
  leave every kernel extension missing. upgradeImage disables the package only
  in DataCurator's symbol list; for any other user (GemDB's `gemdb` account, say)
  only the policy, and the install handles both.

`install.sh`'s redeploy then rebuilds the deployed modules, and the
application's data works as before.

## Measured

`tests/scripts/run_grail_upgrade_test.sh` with
`GRAIL_UPGRADE_FROM_PRODUCT=<a5 product>` runs each case across the engine
change. Grail n is installed and the app writes under a5. The stone stops,
`upgrade_engine.sh --in-place` moves the extent to a8 where it lies, and the
stone restarts under a8 with its own config, its a5 tranlogs still beside the
extent. Then Grail m is installed, the app redeploys, and the checks run.
`GRAIL_UPGRADE_USER=gemdb` runs the case as an account DataCurator creates the
way GemDB Code creates its own (own security policy; `CodeModification` and
`CreateOnetimePassword`), instead of as DataCurator.

Measured on Darwin arm64, 2026-10-27, on this branch merged with main
(`#1833` included). The same cases on one engine (a8 to a8, no
`GRAIL_UPGRADE_FROM_PRODUCT`) are the control:

| case | n | m | a5 → a8, DataCurator | a5 → a8, `gemdb` | a8 only, DataCurator | a8 only, `gemdb` |
| --- | --- | --- | --- | --- | --- | --- |
| `noop` | this checkout | this checkout | 244 / 0 | 244 / 0 | 244 / 0 | 244 / 0 |
| `synthetic` | this checkout, varied | this checkout, varied | 253 / 0 | 253 / 0 | 253 / 0 | 253 / 0 |
| `release=c8cbc92` | GemDB Code's pinned Grail | this checkout | 243 / 0 | 243 / 0 | 243 / 0 | 243 / 0 |

(passed / failed.) The install of m recompiled 1,568 (`noop`), 1,571
(`synthetic`) and 1,528 (`release`) methods after the engine upgrade and none on
one engine; in `synthetic` across the engines it deleted the 2 session methods m
removed.

With `GRAIL_UPGRADE_GEMDB_STONE=1` the harness configures the stone as GemDB
Code configures its database's: a `conf` directory with `system.conf` and
`<stone>.conf` named by `GEMSTONE_SYS_CONF`/`GEMSTONE_EXE_CONF`, the key copied
beside it, a pre-grown 10,240 MB extent and a statmonitor. It hands that config
to the upgrade through `UPGRADE_ENGINE_STONE_CONFIG`, and the a8 stone restarts
on the same config, the a5-era key included. As `gemdb`, a5 → a8: `noop`
244 / 0, `synthetic` 253 / 0, `release=c8cbc92` 243 / 0. Without a config, a
copy of that 10,240 MB a5 extent upgraded in 59 s; a failed run on it (wrong
`<from-version>`) restored it byte for byte.

No known gaps are left: the namedtuple identity gap closed with #1833 (before
it, the same runs read 232 and 231 passed, 0 failed, with 2 known gaps).
`noop.classes_kept` passes for both users, so no Grail class is a new object
after the engine upgrade.

`upgrade_engine.sh --in-place` on its own, on a copy of an a5 extent holding
Grail and app data (DataCurator's): about 70 seconds, exit 0, the backup kept. The
upgraded extent started under its ordinary a8 config, and `./install.sh` with
a8 succeeded (1,550 methods recompiled) and the app's data read back. That install warned that the
redeploy could not rebuild 10 modules, because the Grail tree had moved:
the database's modules were deployed from another checkout, with other
source, and Grail's module identity guard refuses that by design. The harness,
which installs n and m into one directory, rebuilds every module.

A failure restores the extent byte for byte. With a bogus product (an a8 copy
whose last upgradeImage input raises an error, after the kernel has been
recompiled and committed) the script exited 1, said so on its last line, and
the extent's SHA-256 matched the original's. So it did after a wrong
`<from-version>`, which the passwordless login's banner catches before
upgradeImage runs. It refuses outright, before any copy, when the extent is
open or a stone of that name is running.

The same procedure was also run by hand on a database an earlier upgrade test
had left, with data from Grail a78e8c03 upgraded to #1799's fix. After
`./install.sh` of this branch under a8, `verify_phase.py` read **105 passed, 0
failed**. Grail's whole `./scripts/run_tests.sh` then passed on that upgraded
database: all 8 shards answered, with 8,450 run and 0 failed. The three
NetLDI-backed tests (`gemdb-conflict`, `contextvars-session`,
`concurrent-import`) passed once the `.setenv` named an a8 NetLDI.

The engine-upgrade harness needs both products, so it is a local check: CI's
container has one product. It no longer needs a gemstone checkout.

## The workarounds, and the defects behind them

Each workaround is marked `WORKAROUND` in `scripts/upgrade_engine.sh`. Items
1 and 3-6 are GemStone or Rowan defects, to report to GemTalk; 2, 7 and 8 are by
design. Each workaround should go when a release fixes its defect.

1. **4.0 ships no upgradeImage.** GemTalk stopped shipping `bin/upgradeImage`
   and `upgrade/upgradeImage.topaz` in the alphas, deliberately (gemstone commit
   `f7cd54f4cf`, "Do not ship upgradeImage scripts in Alpha releases"). As a
   temporary measure (decided 2026-10-27), Grail carries a pinned copy of
   `image/upgradeImage.topaz` from tag `4.0.0.a8`, in
   `scripts/upgrade/4.0.0.a8/` with a README naming the commit. Every file it
   inputs is in the a8 product, so nothing else is bundled. The script prefers
   the product's own copy, so the bundled one goes once GemTalk ships it again.
   It also exports `upgradeDir`, which the shipped wrapper would have set
   (GemTalk's BatteryTest sets it the same way).
2. **upgradeImage logs in without passwords.** Not a defect: GemStone's own
   `upgradeImage.sh` requires local passwordless logins
   (`STN_LOCAL_PASSWORDLESS_LOGINS_ENABLED`: linked topaz, the stone's host and
   OS user, an empty password). The temporary stone's config turns them on, so
   GemStone's scripts run unpatched, and the stone lives only as long as the
   upgrade. (This branch first patched a password into every login of
   `upgradeImage.topaz` and five sub-scripts; that is gone, and with it the need
   to know SystemUser's password.)
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
   each, unless `UPGRADE_ENGINE_PROJECTS_HOME` names clones. (A
   `ROWAN_PROJECTS_HOME` already in the caller's environment is not used: it may
   name something else.)
7. **Rowan's upgrade repairs only the projects SystemUser can see.** This is
   by design, not a defect, but it leaves every per-user project as Grail's was
   left. `scripts/install_rowan.gs` and the pre-load doit now handle it for
   Grail (see the end of the procedure above).
8. **`upgradeImage` disables DataCurator's packages.** It does this
   deliberately when bytecodes change (`GsPackagePolicy _previousVersion < 33`),
   and for every other user disables only the `GsPackagePolicy`. The pre-load
   re-enables Grail's package and policy either way; the harness proves both
   (`GRAIL_UPGRADE_USER`, below).

Do not file in `upgrade/bootstrap/UpgradeRowanV3.gs` by hand after upgradeImage.
It restores Rowan's kernel extensions but not Rowan's records, and the next
Rowan load stops with the "no existing LoadedMethod" error above.
`upgradeImageRowan.stone` files it in itself, then repairs the records.
