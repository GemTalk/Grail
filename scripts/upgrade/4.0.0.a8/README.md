# GemStone's upgrade script for 4.0.0.a8 (temporary copy)

`upgradeImage.topaz` here is GemStone's own kernel upgrade script, unchanged:
`image/upgradeImage.topaz` from GemTalk's gemstone repository at tag
**`4.0.0.a8`** (commit `78ceb9c462a283a6066c93639bab64c93130b08b`; the file last
changed in `7a9d9156253c4005d5eca1b0d85b71814b37526c`).

It is here because the 4.0 alpha products do not ship it: gemstone commit
`f7cd54f4cf` ("Do not ship upgradeImage scripts in Alpha releases") comments
`upgradeImage.topaz` and `bin/upgradeImage` out of `build/release/PACKING.be`,
deliberately. Without it an a5 database cannot be moved to the a8 engine, and
GemDB Code, which bundles Grail, has no gemstone checkout to take it from.

**This is a temporary measure (decided 2026-10-27).** Delete this directory once
GemTalk ships `upgrade/upgradeImage.topaz` in the product again:
`scripts/upgrade_engine.sh` already prefers `$GEMSTONE/upgrade/upgradeImage.topaz`
when the product has one, and uses this copy only for a product whose version
names this directory and that lacks it.

Every file the script inputs (`$GEMSTONE/upgrade/...`, `upgrade/bootstrap/...`)
is in the a8 product, so this is the only file bundled. Checked with:

```bash
grep -o 'input \$GEMSTONE/[^ ]*' upgradeImage.topaz | sed 's/input \$GEMSTONE\///' \
  | sort -u | while read f; do [ -e "$GEMSTONE/$f" ] || echo "missing $f"; done
```

`scripts/upgrade_engine.sh` runs a patched copy of it (one `WORKAROUND`, the
`Bc_SEND_SPECIAL_not_u32` class variable); see `docs/Upgrading_GemStone.md`.
