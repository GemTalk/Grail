#!/bin/bash
# The CPython shim across a logout and a login in ONE gem process
# (docs/Support_Pydantic.md, Phase 6, W8).
#
# A linked topaz keeps its gem -- and with it libcpython_ua and every
# extension it dlopen'd -- across ``logout'' / ``login''.  The extension's C
# statics outlive the session that initialised them, while the Grail objects
# they point at do not, so initialising the module a second time used to
# SEGFAULT the gem (PyO3's module cell held a dead session's pointers).  The
# shim now refuses that with an ImportError, and resets its own per-session
# state (buffer cache, module tables, dict-walk snapshots) so the shim's
# BUILT-IN modules keep working in the new session.
#
# Session 1 loads lib/_grail_demo.so (a real dlopen'd CPython extension) and
# uses re, which runs the built-in _sre module; session 2 asks for the
# extension again and must get the ImportError, and must still be able to use
# re.  (Reached from Smalltalk the refusal is a GrailShimError carrying the
# ImportError text; a Python ``import'' raises the ImportError itself.)
# Needs lib/_grail_demo.so (``make dynmods''); skips without it.
set -u
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
PROJECT_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)
if [ -f "$PROJECT_ROOT/.setenv" ]; then
    # shellcheck disable=SC1091
    source "$PROJECT_ROOT/.setenv"
fi
SO="$PROJECT_ROOT/lib/_grail_demo.so"
if [ ! -f "$SO" ]; then
    echo "shim-relogin: SKIP ($SO not built)"
    exit 0
fi

WORK=$(mktemp -d "${TMPDIR:-/tmp}/grail_relogin.XXXXXX")
trap 'rm -rf "$WORK"' EXIT

cat > "$WORK/relogin.gs" <<EOF
login
run
| mod |
mod := CPythonShim loadDynamicModule: '_grail_demo' fromPath: '$SO'.
GsFile stdout nextPutAll: 'S1-ADD ' , (mod @env1:_add: { 3 . 4 } kw: nil) printString; lf.
true
%
run
| moduleScope scope module |
moduleScope := SymbolDictionary new.
scope := importlib ___grailCompileSymbolList___.
scope insertObject: moduleScope at: 1.
module := ModuleAst parseSource: 'import re
re.sub(r"(\\d+)", r"<\\1>", "a1b22")'.
module useTempsForBlock: false.
module ensureModuleScope: moduleScope.
GsFile stdout nextPutAll: 'S1-RE ' , (module evaluateWithScope: scope) asString; lf.
true
%
logout
login
run
GsFile stdout nextPutAll: ([CPythonShim loadDynamicModule: '_grail_demo' fromPath: '$SO'.
 'S2-LOAD no error']
	on: Error do: [:e | e return: 'S2-LOAD ' , e messageText asString]); lf.
true
%
run
| moduleScope scope module |
moduleScope := SymbolDictionary new.
scope := importlib ___grailCompileSymbolList___.
scope insertObject: moduleScope at: 1.
module := ModuleAst parseSource: 'import re
re.sub(r"(\\d+)", r"<\\1>", "c333d")'.
module useTempsForBlock: false.
module ensureModuleScope: moduleScope.
GsFile stdout nextPutAll: 'S2-RE ' , (module evaluateWithScope: scope) asString; lf.
true
%
logout
exit 0
EOF

(cd "$PROJECT_ROOT" && LC_ALL=C topaz -lq -S "$WORK/relogin.gs" < /dev/null) > "$WORK/out" 2>&1
STATUS=$?

fail=0
expect() {
    if grep -q -- "$1" "$WORK/out"; then
        echo "  ok   $2"
    else
        echo "  FAIL $2 (no '$1' in the output)"
        fail=1
    fi
}
echo "shim-relogin: topaz exited $STATUS"
expect "S1-ADD 7"                         "session 1 calls the dlopen'd extension"
expect "S1-RE a<1>b<22>"                  "session 1 runs the built-in _sre"
expect "S2-LOAD .*earlier session of this gem process" \
                                           "session 2 refuses to re-initialise the extension"
expect "S2-RE c<333>d"                    "session 2 still runs the built-in _sre"
if [ $STATUS -ne 0 ] || [ $fail -ne 0 ]; then
    echo "shim-relogin: FAILED"
    sed 's/^/    | /' "$WORK/out" | tail -40
    exit 1
fi
echo "shim-relogin: all checks passed"
