#!/bin/bash
# Usage:
#   ./scripts/evaluate.sh '1 + 1'
#   echo '1 + 1' | ./scripts/evaluate.sh

set -uo pipefail
source .setenv || exit 1

if [ $# -ge 1 ]; then
    SNIPPET="$*"
else
    SNIPPET=$(</dev/stdin)
fi

# printf '%s\n' "$SNIPPET" avoids shell-expanding `$` inside the snippet (e.g. `$a` character literals).
{
    printf 'login\nlevel 0\niferr 1 stk\niferr 2 exit 1\nrun\n'
    printf '%s\n' "$SNIPPET"
    printf '%%\nlogout\nexit 0\n'
} | topaz -lq 2>&1 | awk '
    /^%$/                                              { p = 1; next }
    p && /^topaz [0-9>] exec iferr/                    { next }
    p && /^Logging out/                                { exit err }
    p && /^topaz [0-9>]/                               { exit err }
    p && /^ERROR |^GemStone Smalltalk Compiler/        { err = 1 }
    p && err                                           { print > "/dev/stderr"; next }
    p                                                  { print }
    END                                                { exit err }
'
