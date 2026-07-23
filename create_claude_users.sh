#!/bin/bash

# ===========================================================================
# Create Claude1..Claude4 GemStone users, mirroring DataCurator.
# ===========================================================================
# Each user gets DataCurator's privileges + group memberships and its OWN
# write-isolated object security policy (ClaudeNObjectSecurityPolicy;
# owner=write, world=read), plus the login password 'swordfish'.  This lets
# several "Claude" developers each run ./install.sh (per-user Grail) on one
# shared stone without clobbering one another -- see .claude/CLAUDE.md.
#
# Runs as SystemUser (the .gs script logs in as SystemUser).  Idempotent:
# users that already exist are skipped.  Assumes the stone is running.
# ===========================================================================

T0=$SECONDS
trap 'printf "TIMING | %-26s | %4ds\n" "TOTAL create_claude_users.sh" "$((SECONDS - T0))"' EXIT

# Auto-source .setenv when $GEMSTONE isn't in the environment (see install.sh).
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
if [ -z "$GEMSTONE" ] && [ -f "$SCRIPT_DIR/.setenv" ]; then
    # shellcheck disable=SC1091
    source "$SCRIPT_DIR/.setenv"
fi

if [ -z "$GEMSTONE" ]; then
    echo "Error: \$GEMSTONE is not set. Set it to your GemStone installation directory (e.g., /path/to/GemStone64Bit3.7.x-arch.Darwin)."
    exit 1
fi

if ! command -v topaz &>/dev/null; then
    echo "Error: 'topaz' is not on your \$PATH. Add \$GEMSTONE/bin to your PATH (e.g., export PATH=\$GEMSTONE/bin:\$PATH)."
    exit 1
fi

cd "$SCRIPT_DIR" || exit 1

echo "Creating Claude0..Claude3 (mirroring DataCurator) as SystemUser..."
LC_ALL=C topaz -lq -S scripts/create_claude_users.gs || {
    echo "Error: create_claude_users.gs failed."; exit 1; }
