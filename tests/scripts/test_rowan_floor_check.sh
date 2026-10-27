#!/bin/bash
# Self-test for scripts/check_rowan_floor.py: in a scratch worktree of HEAD,
# removing a method from an environment-1 package must be refused, removing one
# from an environment-0 package must not, and an unchanged tree passes.
set -u
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
W=$(mktemp -d)/floor
trap 'git -C "$ROOT" worktree remove --force "$W" >/dev/null 2>&1' EXIT
git -C "$ROOT" worktree add -q --detach "$W" HEAD || exit 1
FAIL=0
check() {   # check <want-exit> <label>
    python3 "$W/scripts/check_rowan_floor.py" HEAD > "$W/out.txt" 2>&1
    local got=$?
    if [ "$got" -eq "$1" ]; then echo "  ok   $2"; else echo "  FAIL $2: exit $got, wanted $1"; cat "$W/out.txt"; FAIL=1; fi
}
remove_first() {    # remove_first <tonel file>: drop its first instance method
    python3 - "$1" <<'PY'
import sys
sys.path.insert(0, sys.argv[1].split('/src/')[0] + '/scripts')
from tonel_methods import remove_methods, _BLOCK_START, selector_of
path = sys.argv[1]
text = open(path, encoding='utf-8').read()
victim = None
for m in _BLOCK_START.finditer(text):
    if not m.group(2):
        victim = selector_of(text[m.end():text.index(' [', m.end())] + '\n')
        break
remove_methods(path, lambda meta, sel: meta or sel != victim)
PY
}
check 0 "an unchanged tree"
remove_first "$W/src/Grail-PythonAst/PythonTokenizer.class.st"
check 0 "a method removed from an environment-0 package"
git -C "$W" checkout -q -- src
remove_first "$W/src/Grail-Python-PyEnv/complex.extension.st"
check 1 "a method removed from an environment-1 package is refused"
[ $FAIL -eq 0 ] && echo "check_rowan_floor self-test: PASS" || echo "check_rowan_floor self-test: FAIL"
exit $FAIL
