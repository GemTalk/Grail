#!/bin/bash
# Regression coverage for the ./grail launcher -- the shell wrapper plus
# scripts/grail.tpz.  Both defects it guards are in the LAUNCHER, not in
# Smalltalk, so neither is reachable from SUnit: the only way to see them is to
# run the command and look at the bytes and the exit status it produced.
#
#   Defect 1 -- console encoding.  grail.tpz did  Transcript := GsFile stdout ,
#   and a GsFile takes BYTES: nextPutAll: wrote a Unicode16's code units
#   straight through, so print('café • 日') came out UTF-16BE (a NUL between
#   every ASCII character, U+2022 truncated to its low byte).  Pure-ASCII lines
#   were fine, which is exactly why it survived so long -- so this file checks
#   the non-ASCII bytes, not that something was printed.
#
#   Defect 2 -- exit status.  grail.tpz caught  on: Error , and Grail's Python
#   exceptions descend from BaseException, which is NOT under Error.  So every
#   sys.exit() escaped to topaz: ERROR 2702, a ~27-frame Smalltalk stack on
#   STDOUT, and exit 1 whatever the requested status.
#
# Every expectation here was measured against python3 3.14.6 first; the CPython
# reading is quoted beside each case.  Needs a running stone and an installed
# Grail (mirrors run_tests.sh); no NetLDI, since ./grail is linked topaz.
#
# Usage: tests/scripts/test_grail_launcher.sh

set -uo pipefail

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$ROOT" || exit 1

TMP=$(mktemp -d "${TMPDIR:-/tmp}/grail-launcher-XXXXXX")
trap 'rm -rf "$TMP"' EXIT

pass=0
fail=0

ok() { pass=$((pass + 1)); }
bad() {
    fail=$((fail + 1))
    echo "FAIL $1"
    shift
    while [ "$#" -gt 0 ]; do echo "     $1"; shift; done
}

# --- helpers ---------------------------------------------------------------

# run NAME EXPECTED_EXIT -- <grail args...>   ; leaves stdout in $OUT_FILE and
# stderr in $ERR_FILE, and reports a wrong exit status itself.
OUT_FILE="$TMP/out"
ERR_FILE="$TMP/err"
run() {
    local name="$1" want="$2"; shift 3   # shift past the literal --
    local rc
    ./grail "$@" >"$OUT_FILE" 2>"$ERR_FILE"
    rc=$?
    if [ "$rc" != "$want" ]; then
        bad "$name" "exit $rc, want $want" \
            "stdout: $(cat "$OUT_FILE")" "stderr: $(cat "$ERR_FILE")"
        return 1
    fi
    return 0
}

# hexdump of a file as lowercase space-separated bytes, on one line.
hexof() { od -An -v -tx1 "$1" | tr -s ' \n' ' ' | sed 's/^ //; s/ $//'; }

# --- defect 1: the console writes UTF-8, not UTF-16 ------------------------

printf "print('cafe-ascii-ok')\nprint('caf\xc3\xa9 \xe2\x80\xa2 \xe6\x97\xa5')\n" \
    > "$TMP/utf8.py"
# python3 -c "print('café • 日')" writes exactly these bytes.
want_bytes='63 61 66 65 2d 61 73 63 69 69 2d 6f 6b 0a 63 61 66 c3 a9 20 e2 80 a2 20 e6 97 a5 0a'
if run "utf8 console runs" 0 -- "$TMP/utf8.py"; then
    got_bytes=$(hexof "$OUT_FILE")
    if [ "$got_bytes" = "$want_bytes" ]; then
        ok
    else
        bad "non-ASCII print is UTF-8 on stdout" \
            "want: $want_bytes" "got:  $got_bytes"
    fi
    # The UTF-16 signature, stated separately so a future encoding bug that is
    # not byte-identical to the old one still names itself.
    # Read off the hex dump: bash cannot carry a NUL in a string, so grepping
    # for one silently searches for the empty pattern and always matches.
    case " $got_bytes " in
        *" 00 "*) bad "no NUL bytes on stdout" \
                      "output contains NUL -- UTF-16 code units" ;;
        *)        ok ;;
    esac
fi

# The same sink is what a warning and a bare repr echo reach, and the REPL
# reads its source as bytes: a non-ASCII line has to survive the round trip.
printf "print('caf\xc3\xa9')\n" | ./grail >"$OUT_FILE" 2>"$ERR_FILE"
if [ "$(hexof "$OUT_FILE")" = "3e 3e 3e 20 63 61 66 c3 a9 0a 3e 3e 3e 20 0a" ]; then
    ok
else
    bad "REPL echoes UTF-8" "got: $(hexof "$OUT_FILE")"
fi

# --- defect 2: sys.exit() ---------------------------------------------------

# exit_case CODE_EXPRESSION EXPECTED_EXIT EXPECTED_STDERR
# The right-hand column is what python3 3.14.6 does, measured.
exit_case() {
    local expr="$1" want="$2" want_err="$3"
    printf 'import sys\n%s\n' "$expr" > "$TMP/exit.py"
    if run "sys.exit: $expr" "$want" -- "$TMP/exit.py"; then
        local err
        err=$(cat "$ERR_FILE")
        if [ "$err" != "$want_err" ]; then
            bad "sys.exit stderr: $expr" "want: [$want_err]" "got:  [$err]"
        elif [ -s "$OUT_FILE" ]; then
            bad "sys.exit stdout: $expr" "want nothing, got: $(cat "$OUT_FILE")"
        else
            ok
        fi
    fi
}

exit_case "sys.exit(3)"                   3   ""
exit_case "sys.exit()"                    0   ""
exit_case "sys.exit(None)"                0   ""
exit_case "sys.exit(0)"                   0   ""
exit_case "sys.exit('fatal: bad input')"  1   "fatal: bad input"
exit_case "sys.exit(256)"                 0   ""     # the OS truncates: 256 % 256
exit_case "sys.exit(300)"                44   ""     # 300 % 256
exit_case "sys.exit(-1)"                255   ""     # -1 % 256
exit_case "sys.exit(True)"                1   ""     # bool is an int in CPython
exit_case "sys.exit(1.5)"                 1   "1.5"  # non-int: str() to stderr

# A SystemExit the script itself catches must not exit at all.
cat > "$TMP/caught.py" <<'EOF'
import sys
try:
    sys.exit(7)
except SystemExit as e:
    print("caught", e.code)
print("still here")
EOF
if run "caught SystemExit does not exit" 0 -- "$TMP/caught.py"; then
    if [ "$(cat "$OUT_FILE")" = "caught 7
still here" ]; then ok; else
        bad "caught SystemExit output" "got: $(cat "$OUT_FILE")"
    fi
fi

# --- an uncaught exception reports on stderr and exits 1 -------------------

printf "print('some output')\nraise ValueError('boom')\n" > "$TMP/raise.py"
if run "uncaught exception exits 1" 1 -- "$TMP/raise.py"; then
    # CPython's traceback ENDS with this line; Grail has no frames to put above
    # it here (__traceback__ is nil on this path), so the last line is what we
    # check -- and it must be on stderr, where CPython puts the whole traceback.
    if [ "$(cat "$ERR_FILE")" != "ValueError: boom" ]; then
        bad "uncaught exception stderr" "got: [$(cat "$ERR_FILE")]"
    elif grep -q 'ERROR 2702\|GsNMethod\|topaz >' "$OUT_FILE"; then
        bad "uncaught exception leaks a topaz stack to stdout" \
            "stdout: $(cat "$OUT_FILE")"
    elif [ "$(cat "$OUT_FILE")" != "some output" ]; then
        bad "uncaught exception keeps prior stdout" "got: [$(cat "$OUT_FILE")]"
    else
        ok
    fi
fi

# --- CPython-shaped launcher behaviour -------------------------------------

# python3 nosuch.py -> "<argv0>: can't open file '<abs path>': [Errno 2] No such
# file or directory", exit 2.
if run "missing script exits 2" 2 -- "$TMP/no-such-file.py"; then
    want="grail: can't open file '$TMP/no-such-file.py': [Errno 2] No such file or directory"
    if [ "$(cat "$ERR_FILE")" = "$want" ]; then ok; else
        bad "missing script message" "want: $want" "got:  $(cat "$ERR_FILE")"
    fi
fi

# python3 -c 'code' args -> sys.argv is ['-c', ...args]; the temp file grail
# writes the code into must not show up there.
if run "-c runs a string" 0 -- -c 'import sys; print(sys.argv)' a b; then
    if [ "$(cat "$OUT_FILE")" = "['-c', 'a', 'b']" ]; then ok; else
        bad "-c sys.argv" "want: ['-c', 'a', 'b']" "got:  $(cat "$OUT_FILE")"
    fi
fi

# -c has to carry an exit status out too -- it is the same path, but it is the
# spelling a shell script is most likely to use.
run "-c carries the exit status" 4 -- -c 'import sys; sys.exit(4)' && ok

run "-c with no argument exits 2" 2 -- -c && ok

if run "-V prints a version" 0 -- -V; then
    if grep -q '^Grail ' "$OUT_FILE"; then ok; else
        bad "-V output" "want a line starting 'Grail ', got: $(cat "$OUT_FILE")"
    fi
fi

if run "-h prints usage" 0 -- -h; then
    if grep -q 'grail -m pkg.mod' "$OUT_FILE"; then ok; else
        bad "-h output" "got: $(cat "$OUT_FILE")"
    fi
fi

# --- report ----------------------------------------------------------------

echo "grail launcher: $pass passed, $fail failed"
[ "$fail" -eq 0 ] || exit 1
