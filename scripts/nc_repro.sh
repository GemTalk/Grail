#!/bin/bash
# ---------------------------------------------------------------------------
# Repro attempt: SIGSEGV in object memory area "code_methods"
#
#   si_code = 2   SEGV_ACCERR  -- memory is MAPPED, permissions are wrong
#   err     = 0x15 = 0b10101   -- P=1 (page PRESENT, protection violation)
#                                 W=0 (not a write)
#                                 U=1 (user mode)
#                                 I/D=1 (INSTRUCTION FETCH)
#
# i.e. an instruction fetch from a code page that is present but not
# executable.  GemStone resolves the PC itself, e.g.
#     0x7f94f99a88ed in code_gen.methods.meths
#     0x7f94f99a88ed is in GsNMethod oop 45747457
# so the method is INTACT -- only the page protection is wrong at that instant.
#
# Observed 3x in CI (GemStone 4.0.0, Linux x86_64, GEM_NATIVE_CODE_ENABLED=2),
# always while a freshly compiled method is entered for the first time.
#
# WHAT THIS SCRIPT DOES
#   Drives the same shape without any Grail code: thousands of DOITs (each
#   compiled, native-coded into code_doits, executed once, discarded), each of
#   which compiles a METHOD (native code into code_methods) and immediately
#   calls it.  A deliberately small selector pool forces constant RECOMPILATION
#   so native code is freed and its pages reused.
#
# USAGE
#   export GEMSTONE=/path/to/product
#   ./nc_repro.sh <stoneName> [blocks] [perBlock] [passes]
#
#   Defaults: blocks=4000 perBlock=25 passes=1  (~100k compile+call per pass)
#   Use passes>1 to loop; the fault is intermittent.
#
# RUNNING IT UNDER gdb
#   topaz -l is a linked session, so the VM is in-process and gdb just works:
#       gdb --args topaz -l -i
#       (gdb) run < /tmp/nc_repro.tpz
#   Let it fault; `bt` then lands in the code that jumped to the bad page.
#   Useful breakpoints/watchpoints: whatever toggles protection on the
#   code_methods arena (mprotect on the arena range).  A watchpoint on the
#   arena's protection state is more informative than the fault itself, since
#   by then the window has closed.
#
# NOTE ON PLATFORM
#   Must be real Linux x86_64.  Do NOT try this in a linux/amd64 container on
#   Apple Silicon: the x86_64 binary runs under translation there, the code
#   pages are managed by the translator, and 100k cycles did NOT reproduce.
# ---------------------------------------------------------------------------
set -u

STONE="${1:-gs64stone}"
BLOCKS="${2:-4000}"
PER_BLOCK="${3:-25}"
PASSES="${4:-1}"

if [ -z "${GEMSTONE:-}" ] || [ ! -x "$GEMSTONE/bin/topaz" ]; then
    echo "error: set GEMSTONE to a product tree (no $GEMSTONE/bin/topaz)" >&2
    exit 1
fi
export PATH="$GEMSTONE/bin:$PATH"

echo "=== product ==================================================="
cat "$GEMSTONE/version.txt"
echo "=== native code ==============================================="
grep -E "^[[:space:]]*GEM_NATIVE_CODE_ENABLED" \
    "$GEMSTONE/data/system.conf" 2>/dev/null \
    || echo "GEM_NATIVE_CODE_ENABLED not set in system.conf (default is 2 on Linux x86_64)"
echo "  uname: $(uname -m) $(uname -s)"
echo "==============================================================="

TPZ="${TMPDIR:-/tmp}/nc_repro.tpz"

gen() {
    printf '%s\n' \
        "set user SystemUser pass swordfish gems $STONE" \
        "login" \
        "iferr 1 stack" \
        "run" \
        "Object subclass: 'NCChurn'" \
        "  instVarNames: #() classVars: #() classInstVars: #()" \
        "  poolDictionaries: {} inDictionary: UserGlobals." \
        "^ 'ready'" \
        "%"
    b=0
    while [ "$b" -lt "$BLOCKS" ]; do
        base=$(( b * PER_BLOCK ))
        printf '%s\n' \
            "run" \
            "| c |" \
            "c := UserGlobals at: #NCChurn." \
            "1 to: $PER_BLOCK do: [:i |" \
            "  | sel src |" \
            "  sel := ('m' , ((i + $base) \\\\ 400) printString) asSymbol." \
            "  src := sel , '" \
            "  | a |" \
            "  a := ' , i printString , '." \
            "  a := a + 1 - 1." \
            "  ^ a'." \
            "  c compileMethod: src" \
            "    dictionaries: System myUserProfile symbolList" \
            "    category: 'churn'." \
            "  (c new perform: sel) == i ifFalse: [nil error: 'wrong answer']]." \
            "^ true" \
            "%"
        b=$(( b + 1 ))
        if [ $(( b % 200 )) -eq 0 ]; then
            printf '%s\n' \
                "run" \
                "System commit." \
                "GsFile stdout nextPutAll: 'block $b ok'; lf." \
                "^ true" \
                "%"
        fi
    done
    printf '%s\n' "logout" "exit"
}

gen > "$TPZ"
echo "generated $TPZ ($(wc -l < "$TPZ") lines, $(( BLOCKS * PER_BLOCK )) compile+call per pass)"

p=1
while [ "$p" -le "$PASSES" ]; do
    LOG="${TMPDIR:-/tmp}/nc_repro_pass$p.log"
    echo "--- pass $p/$PASSES -> $LOG"
    topaz -l -i < "$TPZ" > "$LOG" 2>&1
    rc=$?
    if grep -qa "SIGSEGV\|code_methods" "$LOG"; then
        echo "*** REPRODUCED on pass $p (exit $rc) -- see $LOG"
        grep -a -m1 -A25 "SIGSEGV in object memory area" "$LOG"
        exit 2
    fi
    echo "    pass $p clean (exit $rc)"
    p=$(( p + 1 ))
done

echo "no reproduction in $PASSES pass(es)"
exit 0
