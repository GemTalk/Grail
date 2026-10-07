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
#  Note: this test will fail or hang if the topaz -l of grail is configured with GEM_LISTEN_FOR_DEBUG=TRUE
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

# --- an uncaught exception reports a traceback on stderr and exits 1 -------

printf "print('some output')\nraise ValueError('boom')\n" > "$TMP/raise.py"
if run "uncaught exception exits 1" 1 -- "$TMP/raise.py"; then
    # python3 raise.py writes, on stderr:
    #   Traceback (most recent call last):
    #     File "/.../raise.py", line 2, in <module>
    #       raise ValueError('boom')
    #   ValueError: boom
    # The frames come from BaseException>>pythonTracebackString (Grail-Embedding),
    # which grail.tpz sends to the exception it catches; before it, only the
    # last line was printed.  The header, the frame and the last line are
    # checked; the source line depends on linecache reading the file.
    if [ "$(head -1 "$ERR_FILE")" != "Traceback (most recent call last):" ]; then
        bad "uncaught exception traceback header" "got: [$(cat "$ERR_FILE")]"
    elif ! grep -q "^  File \".*raise.py\", line 2, in <module>\$" "$ERR_FILE"; then
        bad "uncaught exception traceback frame" "got: [$(cat "$ERR_FILE")]"
    elif [ "$(tail -1 "$ERR_FILE")" != "ValueError: boom" ]; then
        bad "uncaught exception last line" "got: [$(cat "$ERR_FILE")]"
    elif grep -q 'ERROR 2702\|GsNMethod\|topaz >' "$OUT_FILE"; then
        bad "uncaught exception leaks a topaz stack to stdout" \
            "stdout: $(cat "$OUT_FILE")"
    elif [ "$(cat "$OUT_FILE")" != "some output" ]; then
        bad "uncaught exception keeps prior stdout" "got: [$(cat "$OUT_FILE")]"
    else
        ok
    fi
fi

# --- the REPL names its frames <stdin>, as CPython's REPL does -------------

# python3 fed the same three lines on stdin writes, on stderr:
#   Traceback (most recent call last):
#     File "<stdin>", line 1, in <module>
#     File "<stdin>", line 2, in f
#   ValueError: boom
# Every frame used to read  File "<grail>"  -- the placeholder codegen stamps
# when nothing named the source -- because ModuleAst's evaluate entry points
# had no filename parameter for the REPL to pass.
printf 'def f():\n    raise ValueError("boom")\n\nf()\n' \
    | ./grail >"$OUT_FILE" 2>"$ERR_FILE"
if [ "$(head -1 "$ERR_FILE")" != "Traceback (most recent call last):" ]; then
    bad "REPL traceback header" "got: [$(cat "$ERR_FILE")]"
elif ! grep -q '^  File "<stdin>", line 1, in <module>$' "$ERR_FILE"; then
    bad "REPL traceback names <stdin> for the module frame" \
        "got: [$(cat "$ERR_FILE")]"
elif ! grep -q '^  File "<stdin>", line 2, in f$' "$ERR_FILE"; then
    bad "REPL traceback names <stdin> for a def made at the prompt" \
        "got: [$(cat "$ERR_FILE")]"
elif grep -q '<grail>' "$ERR_FILE"; then
    bad "REPL traceback leaves no <grail> frame" "got: [$(cat "$ERR_FILE")]"
elif [ "$(tail -1 "$ERR_FILE")" != "ValueError: boom" ]; then
    bad "REPL traceback last line" "got: [$(cat "$ERR_FILE")]"
else
    ok
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

# A script's OWN "--" must survive into sys.argv (issue #850).  ./grail emits
# exactly one "--" of its own, so a second one belongs to the script; the scan
# used to take the LAST one, which handed the script's separator to the launcher
# and made it try to run the argument after it -- "can't open file 'x'", with
# app.py never running.  CPython: ['argv.py', '--', 'x'].
printf 'import sys\nprint(sys.argv[1:])\n' > "$TMP/argv.py"
if run "script's own -- survives" 0 -- "$TMP/argv.py" -- x; then
    if [ "$(cat "$OUT_FILE")" = "['--', 'x']" ]; then ok; else
        bad "script -- argv" "want: ['--', 'x']" "got:  $(cat "$OUT_FILE")"
    fi
fi

if run "several script -- survive" 0 -- "$TMP/argv.py" -- a -- b; then
    if [ "$(cat "$OUT_FILE")" = "['--', 'a', '--', 'b']" ]; then ok; else
        bad "script -- argv (several)" "want: ['--', 'a', '--', 'b']" \
            "got:  $(cat "$OUT_FILE")"
    fi
fi

# --- __main__ is session-local (issue #851) --------------------------------
# A script is loaded under the one fixed name __main__.  Filing it persistently
# (PythonModules + the canonical registries) put every session's script under
# the same key: the session was dirty before the script's first line, so
# ``with gemdb.transaction():`` as the first statement was refused, and two
# sessions running scripts wrote the same entries -- a commit conflict.  The
# measured writes were PythonModules plus three Rc registry buckets; now zero.

printf 'import gemstone\nprint(gemstone.needs_commit)\n' > "$TMP/first_line.py"
if run "script is clean on its first line" 0 -- "$TMP/first_line.py"; then
    if [ "$(cat "$OUT_FILE")" = "False" ]; then ok; else
        bad "first-line needs_commit" "want: False" "got:  $(cat "$OUT_FILE")"
    fi
fi

# Classes (with methods reading module globals), a decorator and a closure --
# every class-build path a script takes -- and then a transaction block.  Only
# gemdb is imported: install.sh deploys it, so no cold import can dirty the run.
cat > "$TMP/defines.py" <<'PY'
import gemdb
LIMIT = 10
def helper(x):
    return x + LIMIT
class Widget:
    def __init__(self, n):
        self.n = n
    def scaled(self):
        return helper(self.n)
class Sub(Widget):
    pass
def deco(f):
    def inner(*a):
        return f(*a) + 1
    return inner
@deco
def plus(a, b):
    return a + b
assert Sub(3).scaled() == 13 and plus(1, 2) == 4
print(gemdb.needs_commit())
with gemdb.transaction():
    gemdb.root["grail_launcher_851"] = Widget.__name__
with gemdb.transaction():
    del gemdb.root["grail_launcher_851"]
print("committed")
PY
if run "defining classes leaves a script clean" 0 -- "$TMP/defines.py"; then
    if [ "$(cat "$OUT_FILE")" = "$(printf 'False\ncommitted')" ]; then ok; else
        bad "script defining classes" "want: False / committed" \
            "got:  $(cat "$OUT_FILE")" "stderr: $(cat "$ERR_FILE")"
    fi
fi

# The same script on the TEXT codegen path.  There a class-body method is
# compiled at RUNTIME against the user profile's symbol list, which holds
# PythonModules but not the session dictionary __main__ now lives in -- so a
# method reaching the script's class by name compiled to a NameError stub
# until Behavior >> ___grailRuntimeCompileDictionaries___ added it.  The IR
# path above never compiles that way, which is why it needs its own case.
if GRAIL_IR_CODEGEN=0 run "defining classes leaves a script clean (text codegen)" 0 -- "$TMP/defines.py"; then
    if [ "$(cat "$OUT_FILE")" = "$(printf 'False\ncommitted')" ]; then ok; else
        bad "script defining classes (text codegen)" "want: False / committed" \
            "got:  $(cat "$OUT_FILE")" "stderr: $(cat "$ERR_FILE")"
    fi
fi

# Two sessions, each running a script that defines a class, both commit.  They
# run in parallel and meet at a barrier before committing, so both transactions
# overlap -- the case that used to conflict on __main__'s shared entries.
cat > "$TMP/race.py" <<'PY'
import sys, os, time, gemdb
role, bar = sys.argv[1], sys.argv[2]
class Local:
    pass
def touch(n):
    open(os.path.join(bar, n), "w").close()
def wait(n):
    t = time.time()
    while not os.path.exists(os.path.join(bar, n)):
        if time.time() - t > 120:
            print("timeout"); sys.exit(3)
        time.sleep(0.1)
touch("ready_" + role)
wait("ready_" + ("B" if role == "A" else "A"))
try:
    gemdb.commit()
    print("ok")
except gemdb.ConflictError as e:
    print("conflict: " + str(e))
PY
mkdir -p "$TMP/bar"
./grail "$TMP/race.py" A "$TMP/bar" >"$TMP/raceA" 2>&1 &
pa=$!
./grail "$TMP/race.py" B "$TMP/bar" >"$TMP/raceB" 2>&1 &
pb=$!
wait "$pa" "$pb"
if [ "$(cat "$TMP/raceA")" = "ok" ] && [ "$(cat "$TMP/raceB")" = "ok" ]; then ok; else
    bad "two concurrent scripts both commit" \
        "A: $(cat "$TMP/raceA")" "B: $(cat "$TMP/raceB")"
fi

# --- --namespace / GEMDB_NAMESPACE: run in a GemDB namespace ----------------
# docs/App_Namespaces_Design.md §4: the launcher chooses the namespace before
# the script's first line, so gemdb.namespace() already answers it.  The script
# never commits, so the namespace it creates is gone when it exits.
NS="grail_launcher_ns_$$"
printf 'import gemdb\nprint(gemdb.namespace())\n' > "$TMP/ns.py"
if run "--namespace NAME" 0 -- --namespace "$NS" "$TMP/ns.py"; then
    if [ "$(cat "$OUT_FILE")" = "$NS" ]; then ok; else
        bad "--namespace NAME sets the namespace" "want: $NS" "got:  $(cat "$OUT_FILE")"
    fi
fi
if run "--namespace=NAME" 0 -- "--namespace=$NS" "$TMP/ns.py"; then
    if [ "$(cat "$OUT_FILE")" = "$NS" ]; then ok; else
        bad "--namespace=NAME sets the namespace" "want: $NS" "got:  $(cat "$OUT_FILE")"
    fi
fi
GEMDB_NAMESPACE="$NS" ./grail "$TMP/ns.py" >"$OUT_FILE" 2>"$ERR_FILE"
if [ "$(cat "$OUT_FILE")" = "$NS" ]; then ok; else
    bad "GEMDB_NAMESPACE sets the namespace" "want: $NS" "got:  $(cat "$OUT_FILE")" "stderr: $(cat "$ERR_FILE")"
fi
if run "no namespace" 0 -- "$TMP/ns.py"; then
    if [ "$(cat "$OUT_FILE")" = "None" ]; then ok; else
        bad "without --namespace there is none" "got: $(cat "$OUT_FILE")"
    fi
fi
if run "--namespace without a name" 2 -- --namespace; then
    if grep -q -- "--namespace requires an argument" "$ERR_FILE"; then ok; else
        bad "--namespace without a name says so" "stderr: $(cat "$ERR_FILE")"
    fi
fi

# --- a namespace's top file keeps its globals across runs --------------------
# docs/Persistent_Modules_and_Classes.md D11.  Each script counts its runs in a
# global and commits from its own body, the only place a Python program can.
# Two defects made every run print "runs 1":
#  * __main__ was recorded as the namespace's globals only AFTER its body, so
#    the program's own commit left it out -- with --namespace too;
#  * gemdb.use_namespace() as the first statement came too late: __main__ was
#    already built session-local.  Now the file restarts in the namespace.
# CPython has no counterpart; the expectations are the design's.
NSF="grail_launcher_first_$$"
NSG="grail_launcher_flag_$$"
cat > "$TMP/count_first.py" <<'PY'
"""A docstring and imports may come before the call."""
import gemdb
import sys
gemdb.use_namespace(sys.argv[1])
runs = globals().get("runs", 0) + 1
print("runs", runs, gemdb.namespace())
gemdb.commit()
PY
cat > "$TMP/count_flag.py" <<'PY'
import gemdb
runs = globals().get("runs", 0) + 1
print("runs", runs, gemdb.namespace())
gemdb.commit()
PY
for n in 1 2; do
    if run "use_namespace first, run $n" 0 -- "$TMP/count_first.py" "$NSF"; then
        if [ "$(cat "$OUT_FILE")" = "runs $n $NSF" ]; then ok; else
            bad "use_namespace() first gives persistent globals (run $n)" \
                "want: runs $n $NSF" "got:  $(cat "$OUT_FILE")"
        fi
    fi
    if run "--namespace, run $n" 0 -- --namespace "$NSG" "$TMP/count_flag.py"; then
        if [ "$(cat "$OUT_FILE")" = "runs $n $NSG" ]; then ok; else
            bad "--namespace gives persistent globals (run $n)" \
                "want: runs $n $NSG" "got:  $(cat "$OUT_FILE")"
        fi
    fi
done
# Anywhere but first, the globals could no longer be the namespace's: refused,
# not silently left per-run.  The statement before it ran once.
printf 'import gemdb\nprint("before")\ngemdb.use_namespace("%s")\nprint("after")\n' \
    "grail_launcher_late_$$" > "$TMP/late.py"
if run "use_namespace not first" 1 -- "$TMP/late.py"; then
    if [ "$(cat "$OUT_FILE")" = "before" ] \
            && grep -q "must be the top file's first statement" "$ERR_FILE"; then ok; else
        bad "use_namespace() not first is refused" \
            "stdout: $(cat "$OUT_FILE")" "stderr: $(cat "$ERR_FILE")"
    fi
fi
cat > "$TMP/drop.py" <<'PY'
import sys
import gemdb.admin
for name in sys.argv[1:]:
    if name in gemdb.admin.namespaces():
        gemdb.admin.drop_namespace(name)
PY
if ! run "drop the namespaces" 0 -- "$TMP/drop.py" "$NSF" "$NSG"; then :; fi

# --- report ----------------------------------------------------------------

echo "grail launcher: $pass passed, $fail failed"
[ "$fail" -eq 0 ] || exit 1
