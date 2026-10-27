#!/usr/bin/env bash
# Move a GemStone 4.0 database to a newer engine: GemStone's upgradeImage, then
# Rowan's upgradeImageRowan.stone, with the workarounds 4.0.0.a5 -> 4.0.0.a8
# needs (docs/Upgrading_GemStone.md says what each is for, and which GemStone
# defect it stands in for).
#
#   scripts/upgrade_engine.sh <extent> <work-dir> <stone> <from-version>
#
# <extent> is copied, never changed: the upgraded copy is <work-dir>/extent0.dbf,
# left running under the new product as stone <stone>. <from-version> is the
# product that last wrote it, e.g. 4.0.0.a5. Then, as each Grail user,
# ./install.sh with the new product installs Grail over it.
#
# Env: GEMSTONE       the NEW product
#      GEMSTONE_SRC   a checkout of GemTalk's gemstone repository: 4.0 ships no
#                     upgradeImage, so its image/upgradeImage.topaz is taken from
#                     the tag of the new product (GEMSTONE_TAG, default the
#                     product's own version)
#      GEMSTONE_GLOBAL_DIR, as for any stone
#      GS_PASS        SystemUser's (and DataCurator's, GcUser's, HostAgentUser's)
#                     password, default swordfish

set -euo pipefail

[ $# -eq 4 ] || { sed -n '2,/^set -e/p' "$0" | sed '$d'; exit 2; }
SRC=$1 WORK=$2 STONE=$3 FROM=$4
: "${GEMSTONE:?}" "${GEMSTONE_SRC:?}"
TAG=${GEMSTONE_TAG:-$(awk 'NR==2{print $1; exit}' "$GEMSTONE/version.txt")}
PASS=${GS_PASS:-swordfish}
export PATH="$GEMSTONE/bin:$PATH"

if [ -f "$GEMSTONE/sys/gemstone.key" ]; then KEYFILE=$GEMSTONE/sys/gemstone.key
else KEYFILE=$GEMSTONE/sys/community.starter.key; fi
mkdir -p "$WORK/log" "$WORK/patched"
WORK=$(cd "$WORK" && pwd)

# ---- 1. stone ---------------------------------------------------------------
stopstone "$STONE" SystemUser "$PASS" >/dev/null 2>&1 || true
rm -f "$WORK"/extent0.dbf "$WORK"/tranlog*.dbf
cp "$SRC" "$WORK/extent0.dbf"
chmod u+w "$WORK/extent0.dbf"
cat > "$WORK/stone.conf" <<EOF
DBF_EXTENT_NAMES = $WORK/extent0.dbf;
STN_TRAN_LOG_DIRECTORIES = $WORK/, $WORK/;
STN_TRAN_LOG_SIZES = 100, 100;
KEYFILE = $KEYFILE;
EOF
# A converted repository does not need its old tranlogs; -N starts without them.
startstone -e "$WORK/stone.conf" -z "$GEMSTONE/data/system.conf" -l "$WORK/stone.log" -N "$STONE" > "$WORK/log/startstone.out"

printf 'GEM_TEMPOBJ_CACHE_SIZE = 100000;\nGEM_NATIVE_CODE_ENABLED = 0;\n' > "$WORK/log/conversion.conf"

# ---- 2. upgradeImage --------------------------------------------------------
git -C "$GEMSTONE_SRC" show "$TAG:image/upgradeImage.topaz" > "$WORK/upgradeImage.orig.topaz"
python3 - "$WORK" "$GEMSTONE" "$PASS" <<'PY'
import re, sys, pathlib
work, gs, pw = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3]
login = re.compile(r'^(\s*set\s+(?:user|u)\s+\w+)\s*$', re.M | re.I)

# WORKAROUND: every login in the upgrade scripts is passwordless; only a
# repository whose system users have no password can be upgraded unpatched.
def with_pass(text):
    return login.sub(lambda m: '%s pass %s' % (m.group(1), pw), text)

src = (work / 'upgradeImage.orig.topaz').read_text()
for sub in ('sessionmethods.topaz', 'installMonticello.topaz', 'gcuser.gs',
            'nameless.gs', 'LoadsWithoutRowan.gs'):
    (work / 'patched' / sub).write_text(with_pass(pathlib.Path(gs, 'upgrade', sub).read_text()))
    src = src.replace('input $GEMSTONE/upgrade/' + sub, 'input %s/patched/%s' % (work, sub))

# WORKAROUND: bom.c's upgrade path does not create GsCompilerIRNode's
# Bc_SEND_SPECIAL_not_u32 class variable, which the compiler classes name since
# a5; the compiler-class filein then fails with "undefined symbol". 218 is its
# value in a fresh a8 image (SpecialSendsDict at: #not).
anchor = 'input $GEMSTONE/upgrade/bootstrap/Filein1A.gs\ncommit\n'
assert anchor in src, 'Filein1A anchor moved'
src = src.replace(anchor, anchor + '''run
| irnode |
irnode := (Globals at: #GsCompilerClasses) at: #GsCompilerIRNode.
(irnode _classVars notNil and: [irnode _classVars includesKey: #Bc_SEND_SPECIAL_not_u32])
	ifFalse: [irnode _addInvariantClassVar: #Bc_SEND_SPECIAL_not_u32 value: 218].
true
%
commit
''', 1)
(work / 'upgradeImage.topaz').write_text(with_pass(src))
PY

# upgradeImage.topaz reads these from the environment (upgradeDir: GemTalk's
# BatteryTest sets it the same way; the shipped script would have).
export upgradeLogDir="$WORK/log" upgradeDir="$GEMSTONE/upgrade" stoneName="$STONE" \
       GS_TOPAZ_ERROR_LOG_DIR="$WORK/log" GS_DISABLE_CHARACTER_TABLE_LOAD=1
topaz -i -l -e "$WORK/log/conversion.conf" < "$WORK/upgradeImage.topaz" > "$WORK/log/upgradeImage.out" 2>&1
[ "$(awk '/^topaz> errorcount$/{getline; print; exit}' "$WORK/log/upgradeImage.out")" = 0 ] || {
  echo "upgradeImage: FAILED -- see $WORK/log/upgradeImage.out"; exit 1; }
echo "upgradeImage: done"

# ---- 3. upgradeImageRowan.stone ---------------------------------------------
# Where it reloads Rowan and the base image from: the new product's own copies,
# what a fresh extent of it has. WORKAROUND: the Rowan an a5 extent has recorded
# its projects home as 'file:$GEMSTONE/projects', which the reload takes for a
# relative path, so ROWAN_PROJECTS_HOME has to be set; and the reload insists that
# each project be a git repository, which the product's copies are not. Copies
# that are, each one commit, unless ROWAN_PROJECTS_HOME names clones already.
if [ -z "${ROWAN_PROJECTS_HOME:-}" ]; then
  export ROWAN_PROJECTS_HOME="$WORK/projectsHome"
  [ -d "$ROWAN_PROJECTS_HOME" ] && chmod -R u+w "$ROWAN_PROJECTS_HOME"
  rm -rf "$ROWAN_PROJECTS_HOME"; mkdir -p "$ROWAN_PROJECTS_HOME"
  for p in "$GEMSTONE"/projects/*/; do
    p=${p%/}; n=$(basename "$p")
    cp -R "$p" "$ROWAN_PROJECTS_HOME/$n"
    chmod -R u+w "$ROWAN_PROJECTS_HOME/$n"     # the product's files are read-only
    git -C "$ROWAN_PROJECTS_HOME/$n" init -q
    git -C "$ROWAN_PROJECTS_HOME/$n" add -A
    git -C "$ROWAN_PROJECTS_HOME/$n" -c user.name=upgrade -c user.email=upgrade@localhost \
      commit -q -m "$TAG $n"
  done
fi
# upgradeImage removes every method of every kernel class without telling
# Rowan; this restores Rowan's extensions, repairs its metadata and reloads
# Rowan and every project from its recorded repository.
printf 'set user SystemUser pass %s gemstone %s\n' "$PASS" "$STONE" > "$WORK/systemuser.topazini"
# WORKAROUND: superdoit_stone (the interpreter of every .stone script) accepts
# only 3.5-3.9: "4.0.0.a8" fails its version-pattern check, and 4.x matches none
# of its cases. A copy that treats 4.x like 3.7.x, first on PATH for the
# script's #! line.
mkdir -p "$WORK/patched/bin"
sed -e "s/awk 'NR==2{print \$1; exit}' \$GEMSTONE\/version.txt\`/awk 'NR==2{print \$1; exit}' \$GEMSTONE\/version.txt | sed 's\/\\.a[0-9]*\$\/\/'\`/" \
    -e 's/3\.7\.\*|3\.8\.\*|3\.9\.\*)/3.7.*|3.8.*|3.9.*|4.*)/' \
    -e 's/3\.5\.\*|3\.6\.\*|3\.7\.\*|3\.8\.\*|3\.9\.\*)/3.5.*|3.6.*|3.7.*|3.8.*|3.9.*|4.*)/' \
    "$GEMSTONE/projects/superDoit/gemstone/productTree/superdoit_stone" > "$WORK/patched/bin/superdoit_stone"
chmod +x "$WORK/patched/bin/superdoit_stone"
export PATH="$WORK/patched/bin:$PATH"
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
"$WORK/patched/upgradeImageRowan.stone" \
  --upgradeFrom="$FROM" --commit --rowanRepair --rowanReload \
  --gemstoneBaseRepair --gemstoneBaseReload --customerRepair --customerReload --audit \
  -- -L -I "$WORK/systemuser.topazini" -e "$WORK/log/conversion.conf" -T 1000000 \
  < /dev/null > "$WORK/log/upgradeImageRowan.out" 2>&1 || true
# Steps 1-6 commit as they go; step 7 only audits. In Unicode comparison mode
# the audit reports the comparison methods it looks up through the transient
# dictionary (and five classes' class variables, sorted by a different
# collation) -- the same lookup the repair above corrects for. Accept a failed
# audit only when every line it reports is one of those.
grep -q "^'success'" "$WORK/log/upgradeImageRowan.out" || python3 - "$WORK/log/upgradeImageRowan.out" <<'PYAUDIT' || {
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
    print('  unexplained audit failure: ' + l[:200])
sys.exit(1 if bad else 0)
PYAUDIT
  echo "upgradeImageRowan: FAILED -- $(grep -m1 -A2 '^Unhandled Error' "$WORK/log/upgradeImageRowan.out" | tail -1)"; exit 1; }
grep '^re-pointed' "$WORK/log/upgradeImageRowan.out" || true
echo "upgradeImageRowan: done"
