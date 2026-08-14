#!/bin/bash

# Self-test for scripts/check_python_fixtures.sh -- the CPython fixture gate.
# Text-in / exit-code-out against synthetic fixture directories: no stone, no
# gem, runs in ~a second.
#
# The gate is what stands between a fixture that pins Grail's behaviour and a
# green CI run, so a bug in it is silent by construction -- it turns a wrong
# fixture into evidence of conformance.  Two of its rules are subtle enough to
# have been got wrong on the way in, and both are pinned here:
#
#   * the status word is read from field 1 OR field 2, never by grepping the
#     line, because live_frames.py prints a separator containing the word
#     "FAIL" and a grep-based gate fails on a clean tree;
#   * only a COLUMN-ZERO __main__ block counts, because
#     module_higher_arity_def.py has that string inside a function and its
#     checks assert __name__ == 'module_higher_arity_def' -- running it as a
#     script would falsify the very thing it tests.
#
# Usage: tests/scripts/test_python_fixture_gate.sh

set -uo pipefail

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
GATE="$ROOT/scripts/check_python_fixtures.sh"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

pass=0
fail=0

# run_case <name> <expected-exit> -- fixture files are already in $DIR
run_case() {
    local name=$1 want=$2
    local out rc
    out=$(GRAIL_FIXTURE_DIR="$DIR" "$GATE" 2>&1)
    rc=$?
    if [ "$rc" -eq "$want" ]; then
        pass=$((pass + 1))
    else
        fail=$((fail + 1))
        echo "FAIL $name: expected exit $want, got $rc"
        echo "$out" | sed 's/^/       /'
        return
    fi
    # Optional extra assertion: remaining args must all appear in the output.
    shift 2
    for needle in "$@"; do
        if ! echo "$out" | grep -q -- "$needle"; then
            fail=$((fail + 1))
            echo "FAIL $name: output missing '$needle'"
            echo "$out" | sed 's/^/       /'
            return
        fi
        pass=$((pass + 1))
    done
}

fresh() { DIR=$(mktemp -d "$TMP/case.XXXXXX"); }

# --------------------------------------------------------------- a clean pass
fresh
cat > "$DIR/clean.py" <<'EOF'
def a_true_check():
    return True


if __name__ == '__main__':
    for fn in [a_true_check]:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
EOF
run_case "a passing fixture passes" 0 "1 OK"

# ------------------------------------------------------------- a failing check
fresh
cat > "$DIR/bad.py" <<'EOF'
def a_wrong_expectation():
    return False


if __name__ == '__main__':
    for fn in [a_wrong_expectation]:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
EOF
run_case "a FAIL line fails the gate" 1 "a_wrong_expectation"

# --------------------------------------------- the other output convention
fresh
cat > "$DIR/diffy.py" <<'EOF'
if __name__ == '__main__':
    print('%-12s %s %s' % ('thecase', 'DIFF', [1, 2]))
EOF
run_case "a DIFF line fails the gate" 1 "thecase"

fresh
cat > "$DIR/oktoo.py" <<'EOF'
if __name__ == '__main__':
    print('%-12s %s %s' % ('thecase', 'OK ', [1, 2]))
EOF
run_case "status in field 2 is recognised as OK" 0 "1 OK"

# ------------------------------------------------------------------ XFAIL/XPASS
fresh
cat > "$DIR/xf.py" <<'EOF'
if __name__ == '__main__':
    print('OK    a_real_check')
    print('--- documented Grail limits: CPython is expected to differ ---')
    print('XFAIL a_documented_grail_limit')
EOF
run_case "XFAIL is not a failure" 0 "1 OK, 1 XFAIL"

fresh
cat > "$DIR/xp.py" <<'EOF'
if __name__ == '__main__':
    print('XPASS a_limit_that_is_gone')
EOF
run_case "XPASS fails the gate (the check is stale)" 1 "a_limit_that_is_gone"

# ------------------------------- the separator trap: prose containing "FAIL"
fresh
cat > "$DIR/sep.py" <<'EOF'
if __name__ == '__main__':
    print('OK   a_check')
    print('--- expected to FAIL under CPython (Grail-specific limits) ---')
    print('--- nothing below should FAIL ---')
EOF
run_case "prose containing FAIL is not counted as a result" 0 "1 OK"

# ------------------------------------------------- a crash and a silent block
fresh
cat > "$DIR/boom.py" <<'EOF'
if __name__ == '__main__':
    raise SystemExit('exploded')
EOF
run_case "a fixture that exits nonzero fails the gate" 1 "exploded"

fresh
cat > "$DIR/silent.py" <<'EOF'
if __name__ == '__main__':
    pass
EOF
run_case "a fixture printing no results fails the gate" 1 "printed no check results"

# --------------------------------- an INDENTED __main__ must not be collected
fresh
cat > "$DIR/indented.py" <<'EOF'
def name_main_guard():
    if __name__ == '__main__':
        return 'is_main'
    return 'not_main'
EOF
cat > "$DIR/real.py" <<'EOF'
if __name__ == '__main__':
    print('OK   the_only_collected_check')
EOF
run_case "an indented __main__ is not collected" 0 "1 OK"

# ----------------------------------------- an empty dir is an error, not a pass
fresh
run_case "no self-running fixtures is an error, not a silent pass" 2

# ------------------------------------------------------------------- one failure
# among several still fails, and the passing ones are not reported as failures.
fresh
cat > "$DIR/good.py" <<'EOF'
if __name__ == '__main__':
    print('OK   fine')
EOF
cat > "$DIR/bad.py" <<'EOF'
if __name__ == '__main__':
    print('FAIL broken')
EOF
run_case "one bad fixture among several fails the gate" 1 "broken"

echo
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ] || exit 1
echo "check_python_fixtures.sh behaves as documented"
