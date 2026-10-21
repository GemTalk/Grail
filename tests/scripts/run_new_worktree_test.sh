#!/bin/bash
# Behavioural test for scripts/new_worktree.sh.
#
# WHAT IT GUARDS.  The script used to carry a stone table naming one machine's
# product directory (/Users/jfoster/...), so on every other machine it refused
# to create a worktree at all.  It now takes the stone, product and NetLDI from
# the MAIN checkout's .setenv -- the per-machine file that already names them --
# and each option overrides one.  It also used to resolve "the main checkout" as
# the directory it was run from, so run inside a worktree it nested the new one
# there and missed the other checkouts' user claims.
#
# Needs no stone: it builds a scratch repository with a fake product directory
# and reads the .setenv / .topazini the script writes.
set -u
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
SCRATCH=$(cd "$(mktemp -d "${TMPDIR:-/tmp}/grail-new-worktree-test.XXXXXX")" && pwd -P)
trap 'rm -rf "$SCRATCH"' EXIT
FAILED=0
ok()  { echo "  ok   - $1"; }
bad() { echo "  FAIL - $1"; FAILED=1; }
check() { if eval "$2"; then ok "$1"; else bad "$1"; fi; }

REPO="$SCRATCH/repo"
WORKTREES="$REPO/.claude/worktrees"
PRODUCT_A="$SCRATCH/GemStone/ProductA"
PRODUCT_B="$SCRATCH/Elsewhere/ProductB"
mkdir -p "$REPO/scripts" "$PRODUCT_A" "$PRODUCT_B"
cp "$ROOT/scripts/new_worktree.sh" "$REPO/scripts/"
printf '.setenv\n.topazini\n.claude/\n' > "$REPO/.gitignore"
git -C "$REPO" init -q -b main
git -C "$REPO" add -A
git -C "$REPO" -c user.name=test -c user.email=test@example.com commit -q -m init

cat > "$REPO/.setenv" <<EOF
export GEMSTONE_GLOBAL_DIR='$SCRATCH/Locks'
export GEMSTONE='$PRODUCT_A'
export PATH="\$GEMSTONE/bin:\$PATH"
export GEMSTONE_NAME='stoneA'
export GRAIL_NETLDI='ldiA'
EOF
printf 'set user Claude0 pass swordfish\nset gemstone stoneA\n' > "$REPO/.topazini"

# Run the copy of the script in checkout $1 with the remaining arguments.
new_worktree() { "$1/scripts/new_worktree.sh" "${@:2}" > "$SCRATCH/out" 2>&1; }
# What worktree $1's generated .setenv exports as $2.
setenv_of() { ( . "$WORKTREES/$1/.setenv" 2>/dev/null; eval "printf '%s' \"\${$2:-}\"" ); }
stone_of() { echo "$(setenv_of "$1" GEMSTONE_NAME)|$(setenv_of "$1" GEMSTONE)|$(setenv_of "$1" GRAIL_NETLDI)"; }
user_of() { sed -n 's/^set user \([^ ]*\).*/\1/p' "$WORKTREES/$1/.topazini" 2>/dev/null; }

# --- 1. by default, the main checkout's stone ------------------------------
new_worktree "$REPO" wt/one
check "it creates the worktree" '[ -d "$WORKTREES/wt/one" ]'
check "with the main checkout's stone, product and NetLDI" \
  '[ "$(stone_of wt/one)" = "stoneA|$PRODUCT_A|ldiA" ]'
check "and its locks directory" '[ "$(setenv_of wt/one GEMSTONE_GLOBAL_DIR)" = "$SCRATCH/Locks" ]'
check ".topazini logs in to that stone" 'grep -qsx "set gemstone stoneA" "$WORKTREES/wt/one/.topazini"'
check "as the first user no checkout claims (the main checkout has Claude0)" \
  '[ "$(user_of wt/one)" = Claude1 ]'

# --- 2. run from inside a worktree -----------------------------------------
new_worktree "$WORKTREES/wt/one" wt/two
check "run from a worktree, the new one goes under the main checkout" \
  '[ -d "$WORKTREES/wt/two" ] && [ ! -e "$WORKTREES/wt/one/.claude/worktrees" ]'
check "with the main checkout's stone" '[ "$(stone_of wt/two)" = "stoneA|$PRODUCT_A|ldiA" ]'
check "and a user no checkout claims" '[ "$(user_of wt/two)" = Claude2 ]'

# --- 3. the options override the main checkout's values ---------------------
new_worktree "$REPO" wt/three --stone stoneB --product "$PRODUCT_B" --netldi ldiB
check "--stone, --product and --netldi override all three" \
  '[ "$(stone_of wt/three)" = "stoneB|$PRODUCT_B|ldiB" ]'
check ".topazini follows --stone" 'grep -qsx "set gemstone stoneB" "$WORKTREES/wt/three/.topazini"'
new_worktree "$REPO" wt/four --stone stoneC --user Claude9
check "--stone alone keeps the main checkout's product and NetLDI" \
  '[ "$(stone_of wt/four)" = "stoneC|$PRODUCT_A|ldiA" ]'

# --- 4. no .setenv in the main checkout --------------------------------------
mv "$REPO/.setenv" "$SCRATCH/setenv.saved"
new_worktree "$REPO" wt/five --stone stoneB --product "$PRODUCT_B" --netldi ldiB --user Claude8
check "the options alone are enough" '[ "$(stone_of wt/five)" = "stoneB|$PRODUCT_B|ldiB" ]'
check "and the locks directory is the product's parent" \
  '[ "$(setenv_of wt/five GEMSTONE_GLOBAL_DIR)" = "$SCRATCH/Elsewhere" ]'
new_worktree "$REPO" wt/six --user Claude7; STATUS=$?
check "without them it refuses" '[ "$STATUS" -ne 0 ]'
check "naming every option it is missing" 'grep -q -- "Pass --stone --product --netldi" "$SCRATCH/out"'
check "and creates nothing" '[ ! -e "$WORKTREES/wt/six" ] && ! git -C "$REPO" show-ref -q refs/heads/wt/six'
mv "$SCRATCH/setenv.saved" "$REPO/.setenv"

# --- 5. a product directory that does not exist ------------------------------
new_worktree "$REPO" wt/seven --product "$SCRATCH/no-such-product" --user Claude6; STATUS=$?
check "a missing product directory is refused" \
  '[ "$STATUS" -ne 0 ] && grep -q "does not exist: $SCRATCH/no-such-product" "$SCRATCH/out"'
check "before anything is created" '[ ! -e "$WORKTREES/wt/seven" ]'

if [ "$FAILED" = 0 ]; then
  echo "new-worktree: all checks passed"
else
  echo "new-worktree: FAILED"
fi
exit "$FAILED"
