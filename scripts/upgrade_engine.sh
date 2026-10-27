#!/usr/bin/env bash
# Move a GemStone 4.0 database to a newer engine, in place: GemStone's
# upgradeImage, then Rowan's upgradeImageRowan.stone, with the workarounds
# 4.0.0.a5 -> 4.0.0.a8 needs (docs/Upgrading_GemStone.md says what each is for,
# and which GemStone defect it stands in for).
#
#   scripts/upgrade_engine.sh --in-place <extent-path> <stone-name> <from-version>
#
# <extent-path> is the database's extent0.dbf; no stone may be running on it.
# <from-version> is the product that last wrote it, e.g. 4.0.0.a5. The script
#   1. copies the extent to <extent-path>.pre-<from-version>, and keeps it;
#   2. starts a temporary stone <stone-name> on the extent under the new product,
#      with its own config, tranlogs and logs in <extent-path>.upgrade/, and
#      local passwordless logins on (GemStone's upgrade logs in without passwords);
#   3. runs the two upgrades, stops the stone, and exits 0: the extent is now one
#      of the new product's, and nothing is left running.
# On any failure it stops the stone, puts the backup back over the extent, and
# exits non-zero; the last line says what failed. Every progress line starts
# "upgrade_engine: ". Then, as each Grail user, ./install.sh with the new product
# installs Grail over it.
#
# Env: GEMSTONE             the NEW product
#      GEMSTONE_GLOBAL_DIR  as for any stone
#      UPGRADE_ENGINE_PROJECTS_HOME  optional: git clones of the new product's
#                           projects for Rowan's reload (default: copies made here)

set -euo pipefail

usage() { sed -n '2,/^set -e/p' "$0" | sed -e '$d' -e 's/^# \{0,1\}//'; exit 2; }
[ $# -eq 4 ] && [ "$1" = --in-place ] || usage
EXTENT=$2 STONE=$3 FROM=$4

say() { echo "upgrade_engine: $*"; }
die() { say "$*"; exit 1; }      # before the extent is touched: nothing to restore

[ -n "${GEMSTONE:-}" ] && [ -x "$GEMSTONE/bin/startstone" ] \
  || die "GEMSTONE must name the new product (no bin/startstone in '${GEMSTONE:-}')"
[ -n "${GEMSTONE_GLOBAL_DIR:-}" ] || die "GEMSTONE_GLOBAL_DIR must be set"
[ -f "$EXTENT" ] || die "no extent at $EXTENT"
export PATH="$GEMSTONE/bin:$PATH"
EXTENT=$(cd "$(dirname "$EXTENT")" && pwd)/$(basename "$EXTENT")
TO=$(awk 'NR==2{print $1; exit}' "$GEMSTONE/version.txt")
[ "$TO" != "$FROM" ] || die "the extent is already $FROM, the product's own version"

# GemStone's kernel upgrade: the product's own, once GemTalk ships it again;
# until then, the copy Grail carries for this version (scripts/upgrade/<version>/README.md).
SCRIPTS=$(cd "$(dirname "$0")" && pwd)
if [ -f "$GEMSTONE/upgrade/upgradeImage.topaz" ]; then
  UPGRADE_IMAGE=$GEMSTONE/upgrade/upgradeImage.topaz
elif [ -f "$SCRIPTS/upgrade/$TO/upgradeImage.topaz" ]; then
  UPGRADE_IMAGE=$SCRIPTS/upgrade/$TO/upgradeImage.topaz
else
  die "$TO ships no upgrade/upgradeImage.topaz, and Grail carries none for it"
fi

# ---- 0. nothing may be using the extent --------------------------------------
if waitstone "$STONE" -1 > /dev/null 2>&1; then
  die "a stone named $STONE is already running; stop it, or name another"
fi
if command -v lsof > /dev/null 2>&1; then
  holders=$(lsof -t -- "$EXTENT" 2>/dev/null | xargs || true)
  [ -z "$holders" ] || die "the extent is open (pid $holders): stop the stone running on $EXTENT first"
fi

# ---- 1. backup ---------------------------------------------------------------
BACKUP=$EXTENT.pre-$FROM
if [ -e "$BACKUP" ]; then
  # Left by an earlier attempt that failed and restored it: then it is the extent.
  cmp -s "$EXTENT" "$BACKUP" \
    || die "$BACKUP already exists and differs from the extent; move it away first"
  say "backup $BACKUP already matches the extent"
else
  say "backing up the extent to $BACKUP"
  cp -p "$EXTENT" "$BACKUP.partial"
  mv "$BACKUP.partial" "$BACKUP"
fi

WORK=$EXTENT.upgrade
LOG=$WORK/log
STEP="starting"
STARTED=0

stop_stone() {
  [ "$STARTED" = 1 ] || return 0
  stopstone "$STONE" SystemUser '' -i > "$LOG/stopstone.out" 2>&1 || true
  # stopstone returns once the stone has gone; make sure of it before the extent is touched.
  local i=0
  while waitstone "$STONE" -1 > /dev/null 2>&1 && [ $i -lt 60 ]; do sleep 1; i=$((i + 1)); done
  ! waitstone "$STONE" -1 > /dev/null 2>&1 && STARTED=0
}

on_exit() {
  local rc=$?
  trap - EXIT INT TERM
  [ $rc -ne 0 ] || return 0
  stop_stone || { say "FAILED while $STEP, and stone $STONE would not stop: the extent is NOT restored; the original is $BACKUP"; exit $rc; }
  if cp -p "$BACKUP" "$EXTENT" && cmp -s "$BACKUP" "$EXTENT"; then
    say "FAILED while $STEP (logs in $LOG); the extent is restored from $BACKUP"
  else
    say "FAILED while $STEP, and restoring the extent failed: the original is $BACKUP"
  fi
  exit $rc
}
trap on_exit EXIT
trap 'exit 130' INT TERM

fail() { say "$*"; exit 1; }

# ---- 2. temporary stone ------------------------------------------------------
STEP="starting stone $STONE"
[ -d "$WORK" ] && chmod -R u+w "$WORK"
rm -rf "$WORK"
mkdir -p "$LOG" "$WORK/tranlogs" "$WORK/patched/bin"
if [ -f "$GEMSTONE/sys/gemstone.key" ]; then KEYFILE=$GEMSTONE/sys/gemstone.key
else KEYFILE=$GEMSTONE/sys/community.starter.key; fi
# GemStone's upgrade logs in as SystemUser, DataCurator, GcUser and
# HostAgentUser without passwords: it requires local passwordless logins (linked
# topaz, this host, the stone's OS user, an empty password), as its own
# upgradeImage.sh says. On for this stone only, which lives as long as the upgrade.
cat > "$WORK/stone.conf" <<EOF
DBF_EXTENT_NAMES = $EXTENT;
STN_TRAN_LOG_DIRECTORIES = $WORK/tranlogs/, $WORK/tranlogs/;
STN_TRAN_LOG_SIZES = 100, 100;
KEYFILE = $KEYFILE;
STN_LOCAL_PASSWORDLESS_LOGINS_ENABLED = TRUE;
EOF
chmod u+w "$EXTENT"
say "starting stone $STONE on the extent under $TO"
STARTED=1
# The old tranlogs are not needed after a clean shutdown; -N starts without them.
startstone -e "$WORK/stone.conf" -z "$GEMSTONE/data/system.conf" -l "$LOG/stone.log" -N "$STONE" \
  > "$LOG/startstone.out" 2>&1 || fail "startstone $STONE failed: $(tail -1 "$LOG/startstone.out")"
waitstone "$STONE" 60 > /dev/null 2>&1 || fail "stone $STONE did not come up (see $LOG/stone.log)"

# A passwordless login, as GemStone's upgradeImage.sh tests first; its banner
# names the version that last wrote the extent, which must be <from-version>.
STEP="checking the extent's version"
printf 'set user SystemUser gemstone %s\nlogin\nlogout\nexit\n' "$STONE" \
  | topaz -l -I /dev/null > "$LOG/testlogin.out" 2>&1 || true
found=$(sed -n 's/^| Repository Version = \([^,]*\),.*/\1/p' "$LOG/testlogin.out" | head -1)
[ -n "$found" ] || fail "a passwordless login as SystemUser failed (see $LOG/testlogin.out)"
[ "$found" = "$FROM" ] || fail "the extent was last written by $found, not $FROM"

printf 'GEM_TEMPOBJ_CACHE_SIZE = 100000;\nGEM_NATIVE_CODE_ENABLED = 0;\n' > "$LOG/conversion.conf"

# ---- 3. upgradeImage ---------------------------------------------------------
STEP="running upgradeImage"
python3 - "$UPGRADE_IMAGE" "$WORK/patched/upgradeImage.topaz" <<'PY'
import sys
src = open(sys.argv[1]).read()
# WORKAROUND: bom.c's upgrade path does not create GsCompilerIRNode's
# Bc_SEND_SPECIAL_not_u32 class variable, which the compiler classes name since
# a5; the compiler-class filein then fails with "undefined symbol". 218 is its
# value in a fresh a8 image (SpecialSendsDict at: #not).
anchor = 'input $GEMSTONE/upgrade/bootstrap/Filein1A.gs\ncommit\n'
assert anchor in src, 'upgradeImage.topaz: Filein1A anchor moved'
src = src.replace(anchor, anchor + '''run
| irnode |
irnode := (Globals at: #GsCompilerClasses) at: #GsCompilerIRNode.
(irnode _classVars notNil and: [irnode _classVars includesKey: #Bc_SEND_SPECIAL_not_u32])
	ifFalse: [irnode _addInvariantClassVar: #Bc_SEND_SPECIAL_not_u32 value: 218].
true
%
commit
''', 1)
open(sys.argv[2], 'w').write(src)
PY
# upgradeImage.topaz reads these from the environment, as GemStone's
# upgradeImage.sh sets them (upgradeDir: GemTalk's BatteryTest sets it the same way).
say "upgradeImage: recompiling the kernel"
( export upgradeLogDir="$LOG" upgradeDir="$GEMSTONE/upgrade" stoneName="$STONE" \
         GS_TOPAZ_ERROR_LOG_DIR="$LOG" GS_DISABLE_CHARACTER_TABLE_LOAD=1
  topaz -i -l -e "$LOG/conversion.conf" < "$WORK/patched/upgradeImage.topaz" > "$LOG/upgradeImage.out" 2>&1 ) || true
[ "$(awk '/^topaz> errorcount$/{getline; print; exit}' "$LOG/upgradeImage.out")" = 0 ] \
  || fail "upgradeImage failed -- see $LOG/upgradeImage.out and $LOG/upgradeImage*.out"
say "upgradeImage: done"

# ---- 4. upgradeImageRowan.stone ----------------------------------------------
STEP="running upgradeImageRowan.stone"
# Where it reloads Rowan and the base image from: the new product's own copies,
# what a fresh extent of it has. WORKAROUND: the Rowan an a5 extent has recorded
# its projects home as 'file:$GEMSTONE/projects', which the reload takes for a
# relative path, so ROWAN_PROJECTS_HOME has to be set; and the reload insists that
# each project be a git repository, which the product's copies are not. Copies
# that are, each one commit, unless UPGRADE_ENGINE_PROJECTS_HOME names clones.
if [ -n "${UPGRADE_ENGINE_PROJECTS_HOME:-}" ]; then
  export ROWAN_PROJECTS_HOME=$UPGRADE_ENGINE_PROJECTS_HOME
else
  export ROWAN_PROJECTS_HOME="$WORK/projectsHome"
  mkdir -p "$ROWAN_PROJECTS_HOME"
  for p in "$GEMSTONE"/projects/*/; do
    p=${p%/}; n=$(basename "$p")
    cp -R "$p" "$ROWAN_PROJECTS_HOME/$n"
    chmod -R u+w "$ROWAN_PROJECTS_HOME/$n"     # the product's files are read-only
    git -C "$ROWAN_PROJECTS_HOME/$n" init -q
    git -C "$ROWAN_PROJECTS_HOME/$n" add -A
    git -C "$ROWAN_PROJECTS_HOME/$n" -c user.name=upgrade -c user.email=upgrade@localhost \
      commit -q -m "$TO $n"
  done
fi
# upgradeImage removes every method of every kernel class without telling
# Rowan; this restores Rowan's extensions, repairs its metadata and reloads
# Rowan and every project from its recorded repository. A passwordless login.
printf 'set user SystemUser gemstone %s\n' "$STONE" > "$WORK/systemuser.topazini"
# WORKAROUND: superdoit_stone (the interpreter of every .stone script) accepts
# only 3.5-3.9: "4.0.0.a8" fails its version-pattern check, and 4.x matches none
# of its cases. A copy that treats 4.x like 3.7.x, first on PATH for the
# script's #! line.
sed -e "s/awk 'NR==2{print \$1; exit}' \$GEMSTONE\/version.txt\`/awk 'NR==2{print \$1; exit}' \$GEMSTONE\/version.txt | sed 's\/\\.a[0-9]*\$\/\/'\`/" \
    -e 's/3\.7\.\*|3\.8\.\*|3\.9\.\*)/3.7.*|3.8.*|3.9.*|4.*)/' \
    -e 's/3\.5\.\*|3\.6\.\*|3\.7\.\*|3\.8\.\*|3\.9\.\*)/3.5.*|3.6.*|3.7.*|3.8.*|3.9.*|4.*)/' \
    "$GEMSTONE/projects/superDoit/gemstone/productTree/superdoit_stone" > "$WORK/patched/bin/superdoit_stone"
chmod +x "$WORK/patched/bin/superdoit_stone"
# WORKAROUND: in Unicode comparison mode (Grail's base turns it on) a session
# looks up #=, #<, #> and the _idxPrimCompare* selectors of String,
# MultiByteString and Unicode7/16/32 through a transient method dictionary that
# answers the _unicode* methods. Rowan's audit repair looks methods up the same
# way, so it points those selectors' LoadedMethods at the _unicode* methods and
# leaves the persistent methods without one; the gemstoneBaseImage reload then
# stops at the first ("no existing LoadedMethod found for the old
# compiledMethod", MultiByteString >> _idxPrimCompareEqualTo:). A stock a5
# extent with the mode on fails the same way. Turning the mode off is no answer
# -- a database holding Unicode strings then fails its first comparison -- so
# a copy of upgradeImageRowan.stone re-points them between repair and reload.
python3 - "$GEMSTONE/projects/RowanV3/upgrade/bin/upgradeImageRowan.stone" "$WORK/patched/upgradeImageRowan.stone" <<'PYFIX'
import sys
s = open(sys.argv[1]).read()
anchor = "\tself rowanReload\n\t\tifTrue: [ upgrader step_4_reloadRowan ]."
assert anchor in s, 'upgradeImageRowan.stone: step 4 anchor moved'
fix = """\t(CharacterCollection isInUnicodeComparisonMode and: [ self gemstoneBaseReload ]) ifTrue: [
\t\t| mapping project fixed |
\t\tfixed := 0.
\t\tmapping := Unicode16 _unicodeCompareMapping.
\t\tproject := Rowan image loadedProjectNamed: 'gemstoneBaseImage'.
\t\t1 to: mapping size by: 2 do: [:j | | cls |
\t\t\tcls := mapping at: j.
\t\t\t(mapping at: j + 1) do: [:sel | | m |
\t\t\t\tm := cls persistentMethodAt: sel otherwise: nil.
\t\t\t\tm ifNotNil: [
\t\t\t\t\tproject loadedPackages do: [:pkg |
\t\t\t\t\t\t{ pkg loadedClasses. pkg loadedClassExtensions } do: [:d |
\t\t\t\t\t\t\t(d at: cls name asString ifAbsent: [ nil ]) ifNotNil: [:lc |
\t\t\t\t\t\t\t\t(lc loadedInstanceMethods at: sel asString ifAbsent: [
\t\t\t\t\t\t\t\t\tlc loadedInstanceMethods at: sel ifAbsent: [ nil ] ]) ifNotNil: [:lm |
\t\t\t\t\t\t\t\t\tlm handle == m ifFalse: [ lm handle: m. fixed := fixed + 1 ].
\t\t\t\t\t\t\t\t\tm _origin: lm ] ] ] ] ] ] ].
\t\tself stdout nextPutAll: 're-pointed ', fixed printString, ' Unicode-comparison LoadedMethods'; lf.
\t\tself commit ifTrue: [ System commit ] ].
"""
open(sys.argv[2], 'w').write(s.replace(anchor, fix + anchor))
PYFIX
chmod +x "$WORK/patched/upgradeImageRowan.stone"
say "upgradeImageRowan: repairing and reloading Rowan and the base image"
PATH="$WORK/patched/bin:$PATH" "$WORK/patched/upgradeImageRowan.stone" \
  --upgradeFrom="$FROM" --commit --rowanRepair --rowanReload \
  --gemstoneBaseRepair --gemstoneBaseReload --customerRepair --customerReload --audit \
  -- -L -I "$WORK/systemuser.topazini" -e "$LOG/conversion.conf" -T 1000000 \
  < /dev/null > "$LOG/upgradeImageRowan.out" 2>&1 || true
# Steps 1-6 commit as they go; step 7 only audits. In Unicode comparison mode
# the audit reports the comparison methods it looks up through the transient
# dictionary (and five classes' class variables, sorted by a different
# collation) -- the same lookup the repair above corrects for. Accept a failed
# audit only when every line it reports is one of those.
grep -q "^'success'" "$LOG/upgradeImageRowan.out" || python3 - "$LOG/upgradeImageRowan.out" <<'PYAUDIT' || \
  fail "upgradeImageRowan failed: $(grep -m1 -A2 '^Unhandled Error' "$LOG/upgradeImageRowan.out" | tail -1) -- see $LOG/upgradeImageRowan.out"
import re, sys
lines = open(sys.argv[1], errors='replace').read().split('\n')
try:
    start = lines.index('Final Audit') + 1
except ValueError:
    sys.exit(1)                                   # failed before the audit
end = next(i for i in range(start, len(lines)) if lines[i].startswith('---------------------'))
sels = r'(?:<|>|=|_unicode(?:LessThan|GreaterThan|Equal):|_idx(?:Prim|Unicode)Compare(?:LessThan|GreaterThan|EqualTo):)'
cls = r'(?:String|MultiByteString|Unicode7|Unicode16|Unicode32)'
ok = [re.compile(r'^Compiled method is not identical to loaded method: %s>>%s$' % (cls, sels)),
      re.compile(r'^Mismatched method category \(.*\): %s>>%s$' % (cls, sels)),
      re.compile(r'^For class (?:Repository|Module|GsNMethod|GciLibrary|AbstractException) classVars changed '),
      re.compile(r'^=+|^[0-9]+ audit errors$|^\s*$')]
bad = [l for l in lines[start:end] if not any(r.search(l) for r in ok)]
for l in bad[:20]:
    print('upgrade_engine:   unexplained audit failure: ' + l[:200])
sys.exit(1 if bad else 0)
PYAUDIT
fixed=$(grep -m1 '^re-pointed' "$LOG/upgradeImageRowan.out" || true)
say "upgradeImageRowan: done${fixed:+ ($fixed)}"

# ---- 5. stop ---------------------------------------------------------------
STEP="stopping stone $STONE"
say "stopping stone $STONE"
stop_stone || fail "stone $STONE did not stop (see $LOG/stopstone.out)"
STEP="cleaning up"
# The upgrade's tranlogs and project copies are spent; the logs stay.
rm -rf "$WORK/tranlogs" "$WORK/projectsHome" "$WORK/patched" "$WORK/systemuser.topazini"
trap - EXIT INT TERM
say "done: $EXTENT is now a $TO extent; the $FROM original is $BACKUP, the logs are in $LOG"
