# Releasing Grail, and what Rowan allows

Grail is installed **over** an earlier Grail: GemDB Code bumps its pinned Grail, and a
user's existing database gets the new one by `./install.sh`, with their stored objects
still in it. Two things make that safe, and this document is about keeping both true
release after release:

1. **Grail upgrades in place.** An install keeps Grail's classes, deployed modules
   rebuild into their committed instances and classes, and stored objects keep working
   (docs/Persistent_Modules_and_Classes.md D2, D7). `tests/scripts/run_grail_upgrade_test.sh`
   is the proof.
2. **The Rowan in the user's database can apply the change.** Rowan is what installs
   Grail, and it lives in the *database*, not in the product. Some kinds of change need
   a newer Rowan than a given database has.

## What pins what

| Product | Pins | Where |
|---|---|---|
| GemDB Code | Grail commit | `vendor-pins.sh` `PINNED_GRAIL_REF` |
| | GemStone engine | `src/config.ts` `PINNED_ENGINE_VERSION` (4.0.0.a5) |
| | MCP server commit | `vendor-pins.sh` `PINNED_MCP_REF` |
| GemStone engine | Rowan, in `bin/extent0.rowan3.dbf` | 4.0.0.a5 ships Rowan masterV4 `7d50ec0c8` |
| Grail | the oldest engine it installs on | `install.sh` (4.0.0.a5, build 2026-10-15) |

Two facts follow, and they are what the rest of this is built on:

- **An engine change recreates the database.** GemStone 4.0 ships no `upgradeImage`,
  so GemDB Code refuses a database made by another engine
  (`assertDatabaseMatchesEngine`) and the user starts over. Only a release that keeps
  the engine keeps the user's data.
- **A database keeps the Rowan it was created with.** A newer engine does not change
  the Rowan in an existing database -- and moving to one recreates the database anyway.

So: **a Grail release that GemDB ships without an engine change may rely only on the
Rowan in that engine's extent.** Today that is `7d50ec0c8`.

## What that Rowan cannot do

`rowan/needs-newer-rowan.txt` lists the kinds of change the installed Rowan cannot
apply as an upgrade. Today it is one:

- **`env1_removal` -- removing a method from an environment-1 (`-PyEnv`) package.**
  Rowan before masterV4 `96eb7c01d` looks for it in environment 0 and the install
  fails with `A reference using the non-existent key ...`. Removing the *class* is
  fine; Rowan removes its methods with it.

Measured fine on a5, and why: removing a kernel session method (`Grail-Kernel*`). The
Rowan fix in `9b8247a1d` is for a package that has gone from the project, which an
upgrade of Grail does not do.

The Grail-side workaround for a5's other defect -- its STON reader resolving
`package.st`'s `Package` through the symbol list -- is permanent: `install_rowan.gs`
reads the project with Grail's dictionaries out of the symbol list.

## The three checks

| Check | What it proves | Where it runs |
|---|---|---|
| `scripts/check_rowan_floor.py <base>` | the change removes nothing of a kind in `needs-newer-rowan.txt` | `ci.yml` `scripts` job, every PR and merge-group run |
| `tests/scripts/run_grail_upgrade_test.sh noop release=<ref>` | an install of this tree over `<ref>` keeps stored data working, and binding the app afterwards writes nothing | nightly and on install PRs (`grail-upgrade.yml`), and before a release |
| `tests/scripts/run_rowan_dependency_matrix.sh --required-extent <x>` | each kind in the list fails on the product's Rowan and passes on the required one; and tells you when the product has caught up | when the list or the engine changes |

The matrix's required extent is the product's `extent0.rowan3.dbf` with Rowan reloaded
from masterV4 at or after `9b8247a1d`, as SystemUser. It exits 3, not 0, when the
product's own Rowan passes a kind in the list: that is the signal to move the floor.

## Releasing Grail

1. CI green, and the CPython conformance nightly not regressed (run it by hand on the
   branch -- `gh workflow run cpython-conformance.yml --ref <branch>` -- for a change to
   shared machinery).
2. `check_rowan_floor.py` passes against the previous release (CI does this against the
   PR's base; run it once more against the previous release's tag).
3. The upgrade test, on the engine GemDB pins:
   `run_grail_upgrade_test.sh noop release=<previous release> release=<GemDB's PINNED_GRAIL_REF>`.
   The second matters until GemDB has caught up: it is the upgrade GemDB's users will
   actually do.
4. Tag it `vX.Y.Z`, so GemDB pins a tag and the upgrade test has a name to start from.

## Releasing GemDB Code

1. Bump `PINNED_GRAIL_REF` (and MCP) to a Grail release that passed the above.
2. **Same engine:** users keep their data, so run the upgrade the users will do: a
   database built and filled by the previous GemDB release, then the new one installed
   over it, and its data checked. `run_grail_upgrade_test.sh release=<old PINNED_GRAIL_REF>`
   is that check for Grail; GemDB's own CI should drive it through GemDB's installer.
3. **Engine change:** the database is recreated, so data is lost. Say so in the release
   notes, and move Grail's `install.sh` floor and `needs-newer-rowan.txt` in the same
   round (below).

The first GemDB release after GemDB 1.8 is also the first that moves its users from a
topaz-installed Grail (`a78e8c03`) to a Rowan-installed one. **Measured: it holds**
(`release=a78e8c03`, 167 checks, 0 failures), and `grail-upgrade.yml` runs it nightly.

After installing, `install.sh` rebuilds and commits every deployed module the install
made stale (`scripts/redeployModules.gs`), in every namespace, so an application's
first import after the upgrade binds warm and writes nothing.

## When the Rowan floor moves

When an engine ships a newer Rowan, the matrix reports it (exit 3). Then, together:

- raise `install.sh`'s floor to that engine;
- remove the satisfied kinds from `rowan/needs-newer-rowan.txt`;
- point the matrix's `REQUIRED_ROWAN` at whatever Grail next needs;
- bump GemDB Code's `PINNED_ENGINE_VERSION`, accepting that its users' databases are
  recreated.

## Open decision: getting a newer Rowan to existing databases

A database only ever has the Rowan it was made with, so until an engine change, users
cannot get a newer one. Two ways forward:

- **(a) Wait for the engine.** Simple; every user's database is recreated at that bump.
- **(b) GemDB ships Rowan** as a payload, like Grail and MCP, and loads it into an
  existing database as SystemUser when it upgrades. Data survives, and GemDB becomes
  the place that knows which Rowan a database has -- which is what Rowan#977 (a project
  declaring the Rowan it needs) would then check.

  **Measured: this works on a LIVE database.** `GRAIL_UPGRADE_RELOAD_ROWAN` makes the
  upgrade test reload Rowan masterV4 (`tests/upgrade/reload_rowan.gs`) into the stock
  a5 database after the app has committed its data, and before Grail m: the synthetic
  upgrade -- including the env-1 removal a5's Rowan cannot apply -- passes, 177 checks,
  0 failures. What GemDB would need is that script and the Rowan sources (the GemStone
  build's `externals_st` layout) in its payload, run as SystemUser.

  Every GemStone build since 2026-10-21 already has that Rowan (`build.pl` clones
  `masterV4`'s head for `extent0.rowan3.dbf`), but only a5 is on `dl.gemdb.com`.
