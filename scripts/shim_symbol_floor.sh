#!/bin/bash
# shim_symbol_floor.sh -- which CPython C-API symbols does a prebuilt extension
# need, and how many of them does the shim really provide?
#
#   ./scripts/shim_symbol_floor.sh <extension.so> [--list]
#
# Compares the extension's undefined Py*/_Py* imports against the symbols
# exported by src/c/shim/libcpython_ua.dylib (build it first: make -C src/c/shim),
# and splits the exported ones into REAL and STUB.  A STUB is an export whose
# body is a log-once diagnostic (STUBLOG("name") in any shim source) -- it links,
# but it does nothing, so it is not coverage.
#
# Why DATA is counted separately: a missing DATA symbol (a type object, an
# exception, a singleton) fails dlopen, which Grail turns into ImportError.  A
# missing FUNCTION binds lazily on macOS and ABORTS THE PROCESS the first time it
# is called.  Both have to reach zero before anything past dlopen is measurable.
# The data/function split is by name (*_Type, PyExc_*, _Py_*Struct, ...), which
# is right for every symbol seen so far but is a heuristic, not a read of the
# Mach-O bind tables.
#
# Written for docs/Support_Pydantic.md; works for any extension (numpy too).

set -euo pipefail
SO=${1:?usage: $0 <extension.so> [--list]}
LIST=${2:-}
HERE=$(cd "$(dirname "$0")/.." && pwd)
SHIM=$HERE/src/c/shim
LIB=$SHIM/libcpython_ua.dylib
[ -f "$LIB" ] || { echo "no $LIB -- run: make -C src/c/shim" >&2; exit 1; }

TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
nm -u "$SO" | sed 's/^_//' | grep -E '^_?Py' | sort -u > "$TMP/need"
nm -gU "$LIB" | awk '{print $3}' | sed 's/^_//' | sort -u > "$TMP/have"
comm -12 "$TMP/need" "$TMP/have" > "$TMP/present"
comm -23 "$TMP/need" "$TMP/have" > "$TMP/missing"
: > "$TMP/stub"
while read -r s; do
    if grep -q "STUBLOG(\"$s\")" "$SHIM"/*.c "$SHIM"/*.cc 2>/dev/null; then echo "$s"; fi
done < "$TMP/present" > "$TMP/stub"
comm -23 "$TMP/present" "$TMP/stub" > "$TMP/real"
is_data='_Type$|^PyExc_|^_Py_[A-Za-z]+(Struct|Object)$'
grep -E "$is_data" "$TMP/missing" > "$TMP/missing_data" || true
grep -vE "$is_data" "$TMP/missing" > "$TMP/missing_fn" || true

n() { wc -l < "$1" | tr -d ' '; }
echo "extension: $SO"
echo "needs:            $(n "$TMP/need") CPython API symbols"
echo "  real in shim:   $(n "$TMP/real")"
echo "  stub in shim:   $(n "$TMP/stub")"
echo "  missing:        $(n "$TMP/missing")  ($(n "$TMP/missing_data") data -> dlopen fails; $(n "$TMP/missing_fn") functions -> process abort on first call)"
if [ "$LIST" = "--list" ]; then
    for k in missing_data missing_fn stub; do
        echo; echo "== $k"; tr '\n' ' ' < "$TMP/$k"; echo
    done
fi
