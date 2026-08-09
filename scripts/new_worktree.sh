#!/bin/bash
# ===========================================================================
# Create a git worktree wired up for an independent Grail install.
# ===========================================================================
# Usage:
#   ./scripts/new_worktree.sh <branch> [--stone gs375|gs40] [--user ClaudeN]
#                                      [--base <ref>] [--force-user]
#
# Example:
#   ./scripts/new_worktree.sh fix/dict-repr --stone gs40
#
# Why this exists
# ---------------
# `git worktree add` alone is NOT enough for Grail.  A worktree starts with no
# .setenv / .topazini (both gitignored, per-checkout) and no built C shim, and
# -- most importantly -- ./install.sh installs a PER-USER Grail (session
# methods + Python* dictionaries) into a shared stone.  Two worktrees that log
# in as the SAME GemStone user would overwrite each other's install, in both
# directions.  So every worktree gets its own Claude* user; see .claude/CLAUDE.md.
#
# This script therefore:
#   1. creates the worktree under .claude/worktrees/<branch> on a new branch;
#   2. assigns it an unused Claude* user (or the one you pass via --user);
#   3. writes that worktree's own .setenv + .topazini for the chosen stone;
#   4. copies .claude/settings.local.json across, if the main checkout has one.
#
# It does NOT run ./install.sh -- do that inside the worktree (it builds the C
# shim there, which takes a while and is what the agent working in it wants to
# control).
# ===========================================================================

set -euo pipefail

# --- stone table: stone-name -> product dir + netldi -------------------------
# Edit these when you install a new GemStone version.
GEMSTONE_GLOBAL_DIR_DEFAULT='/Users/jfoster/Documents/GemStone'
PRODUCT_gs375="$GEMSTONE_GLOBAL_DIR_DEFAULT/GemStone64Bit3.7.5-arm64.Darwin"
NETLDI_gs375='ldi375'
PRODUCT_gs40="$GEMSTONE_GLOBAL_DIR_DEFAULT/GemStone64Bit4.0.0-arm64.Darwin"
NETLDI_gs40='ldi40'

CLAUDE_USERS=(Claude0 Claude1 Claude2 Claude3)
CLAUDE_PASSWORD='swordfish'

# --- locate an unversioned python3-config -----------------------------------
# src/c/shim/Makefile's `dynmods` target uses `python3-config --includes` to find
# Python.h.  Homebrew's python@3.x formulae are keg-only for the UNVERSIONED
# names (they would shadow the system python3), linking only python3.13-config
# into /opt/homebrew/bin -- the plain name exists solely in libexec/bin.  If that
# directory is not on PATH, PYTHON_INCLUDES expands to empty and dynmods dies
# with "'Python.h' file not found".  Find it once, bake it into the worktree's
# .setenv.  Empty is tolerated: the worktree still works for everything except
# the dynmods target.
detect_python_bin_dir() {
    if command -v python3-config >/dev/null 2>&1; then
        dirname "$(command -v python3-config)"; return
    fi
    for d in /opt/homebrew/opt/python@3.*/libexec/bin /usr/local/opt/python@3.*/libexec/bin; do
        [ -x "$d/python3-config" ] && { echo "$d"; return; }
    done
    echo ''
}
PYTHON_BIN_DIR=$(detect_python_bin_dir)

REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$REPO_ROOT"

# --- args -------------------------------------------------------------------
BRANCH=''
STONE='gs375'
USER_ID=''
BASE_REF=''
FORCE_USER=0

usage() {
    sed -n '2,32p' "$0" | sed 's/^# \{0,1\}//'
    exit "${1:-1}"
}

while [ $# -gt 0 ]; do
    case "$1" in
        --stone)      STONE="${2:?--stone needs a value}"; shift 2 ;;
        --user)       USER_ID="${2:?--user needs a value}"; shift 2 ;;
        --base)       BASE_REF="${2:?--base needs a value}"; shift 2 ;;
        --force-user) FORCE_USER=1; shift ;;
        -h|--help)    usage 0 ;;
        -*)           echo "Error: unknown option '$1'" >&2; usage ;;
        *)
            [ -z "$BRANCH" ] || { echo "Error: more than one branch name given ('$BRANCH', '$1')." >&2; usage; }
            BRANCH="$1"; shift ;;
    esac
done

[ -n "$BRANCH" ] || { echo "Error: no branch name given." >&2; usage; }

# --- resolve the stone ------------------------------------------------------
eval "PRODUCT=\${PRODUCT_${STONE}:-}"
eval "NETLDI=\${NETLDI_${STONE}:-}"
if [ -z "$PRODUCT" ]; then
    echo "Error: unknown stone '$STONE'. Known stones: gs375, gs40." >&2
    echo "  (Add new ones to the stone table at the top of $0.)" >&2
    exit 1
fi
if [ ! -d "$PRODUCT" ]; then
    echo "Error: product dir for '$STONE' does not exist: $PRODUCT" >&2
    exit 1
fi

# Warn (don't fail) if the stone/netldi aren't currently running -- you may well
# be setting up a worktree before starting them.
if command -v "$PRODUCT/bin/gslist" >/dev/null 2>&1; then
    running=$("$PRODUCT/bin/gslist" -c 2>/dev/null || true)
    echo "$running" | grep -qw "$STONE" || echo "Note: stone '$STONE' does not appear to be running."
    echo "$running" | grep -qw "$NETLDI" || echo "Note: netldi '$NETLDI' does not appear to be running."
fi

# --- pick a GemStone user ---------------------------------------------------
# Every existing worktree's .topazini claims one; take the first one free.
WORKTREE_ROOT="$REPO_ROOT/.claude/worktrees"

claimed_users() {
    # Includes the main checkout, so its user is never handed to a worktree.
    # Every branch must succeed: this runs under `set -e -o pipefail`, and a
    # missing .topazini / not-yet-created worktree root is normal, not an error.
    {
        [ -f "$REPO_ROOT/.topazini" ] && cat "$REPO_ROOT/.topazini"
        [ -d "$WORKTREE_ROOT" ] &&
            find "$WORKTREE_ROOT" -maxdepth 3 -name .topazini -exec cat {} \; 2>/dev/null
        true
    } | sed -n 's/^[[:space:]]*set user \([^[:space:]]*\).*/\1/p'
}

if [ -z "$USER_ID" ]; then
    taken=$(claimed_users)
    for u in "${CLAUDE_USERS[@]}"; do
        if ! echo "$taken" | grep -qx "$u"; then USER_ID="$u"; break; fi
    done
    if [ -z "$USER_ID" ]; then
        echo "Error: all of ${CLAUDE_USERS[*]} are already claimed by a checkout." >&2
        echo "  Remove an unused worktree ('git worktree remove <path>'), or pass" >&2
        echo "  --user <id> for a user you have created yourself." >&2
        exit 1
    fi
elif [ "$FORCE_USER" -eq 0 ]; then
    if claimed_users | grep -qx "$USER_ID"; then
        echo "Error: user '$USER_ID' is already claimed by another checkout." >&2
        echo "  Two checkouts sharing a user will clobber each other's install." >&2
        echo "  Pass --force-user if you really mean it." >&2
        exit 1
    fi
fi

# --- create the worktree ----------------------------------------------------
WT_PATH="$WORKTREE_ROOT/$BRANCH"

if [ -e "$WT_PATH" ]; then
    echo "Error: $WT_PATH already exists." >&2
    exit 1
fi

if [ -z "$BASE_REF" ]; then
    # Prefer origin/main so worktrees start from upstream, not from whatever is
    # checked out here.  Fall back to local main, then HEAD.
    if git rev-parse --verify -q origin/main >/dev/null; then BASE_REF='origin/main'
    elif git rev-parse --verify -q main >/dev/null; then BASE_REF='main'
    else BASE_REF='HEAD'; fi
fi

mkdir -p "$WORKTREE_ROOT"

if git show-ref --verify -q "refs/heads/$BRANCH"; then
    echo "Branch '$BRANCH' already exists; checking it out in the new worktree."
    git worktree add "$WT_PATH" "$BRANCH"
else
    git worktree add -b "$BRANCH" "$WT_PATH" "$BASE_REF"
fi

# --- write the per-worktree config -----------------------------------------
cat > "$WT_PATH/.setenv" <<EOF
# source ./.setenv   -- generated by scripts/new_worktree.sh
#
# Worktree: $BRANCH
# Stone:    $STONE      GemStone user: $USER_ID
#
# This worktree installs its OWN Grail as $USER_ID.  Do not point another
# checkout at the same (stone, user) pair -- their installs would overwrite
# each other.  Keep GEMSTONE_NAME in step with 'set gemstone' in ./.topazini.

export GEMSTONE_GLOBAL_DIR='$GEMSTONE_GLOBAL_DIR_DEFAULT'
export GEMSTONE='$PRODUCT'
export GEMSTONE_NAME='$STONE'
export GRAIL_NETLDI='$NETLDI'

${PYTHON_BIN_DIR:+# src/c/shim/Makefile builds its \'dynmods\' target with \`python3-config --includes\`.
# Homebrew python@3.x is keg-only for the UNVERSIONED names, linking only
# python3.13-config into /opt/homebrew/bin; plain python3-config lives here.
# Without this, dynmods fails with \"\'Python.h\' file not found\".
}export PATH="${PYTHON_BIN_DIR:+$PYTHON_BIN_DIR:}\$GEMSTONE/bin:\$GEMSTONE/seaside/bin:\$PATH"
EOF

cat > "$WT_PATH/.topazini" <<EOF
! default initialization for Topaz session -- generated by scripts/new_worktree.sh
! Worktree: $BRANCH
! Keep 'set gemstone' in step with GEMSTONE_NAME in ./.setenv
set user $USER_ID pass $CLAUDE_PASSWORD
set gemstone $STONE
EOF

if [ -f "$REPO_ROOT/.claude/settings.local.json" ]; then
    mkdir -p "$WT_PATH/.claude"
    cp "$REPO_ROOT/.claude/settings.local.json" "$WT_PATH/.claude/settings.local.json"
    echo "Copied .claude/settings.local.json into the worktree."
fi

# --- done -------------------------------------------------------------------
cat <<EOF

===============================================
 Worktree ready
   path:   $WT_PATH
   branch: $BRANCH  (from $BASE_REF)
   stone:  $STONE  ($NETLDI)
   user:   $USER_ID
   product:$PRODUCT

 Next, inside the worktree:
   cd $WT_PATH
   ./install.sh          # builds the C shim + installs this user's Grail
   ./scripts/run_tests.sh

 If this is the first Grail install on stone '$STONE', run ./install_base.sh
 there first (once per extent, as SystemUser).
===============================================
EOF
