#!/bin/bash
# Which kinds of Grail upgrade need a newer Rowan than the product ships.
#
#   tests/scripts/run_rowan_dependency_matrix.sh --required-extent <extent> [kind...]
#
# Runs run_grail_upgrade_test.sh's synthetic case once per kind of change
# (tests/upgrade/make_variant.py: env1_removal, session_removal, classes, shape;
# default all four), each on two extents at once:
#
#   product    $GEMSTONE/bin/extent0.rowan3.dbf -- the Rowan users have
#   required   <extent>, with the Rowan Grail needs loaded (see below)
#
# and checks each result against what is recorded here:
#
#   NEEDS_ROWAN   kinds the product's Rowan cannot apply (rowan/needs-newer-rowan.txt).
#                 Each must FAIL on the
#                 product and PASS on the required extent. One that passes on the
#                 product means the product now ships the Rowan it needs: raise
#                 install.sh's floor, drop the kind from NEEDS_ROWAN, and let
#                 Grail releases make that kind of change again. Exit status 3.
#   every other   must PASS on both.
#
# Anything else exits 1: a required-extent failure is a Grail defect, and a
# product failure outside NEEDS_ROWAN is one Grail has to work around.
#
# The required extent is the product's extent0.rowan3.dbf with Rowan reloaded from
# a masterV4 checkout at or after REQUIRED_ROWAN. Rowan#977 would let the project
# state that itself.
set -u
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
PROJECT_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)
if [ -f "$PROJECT_ROOT/.setenv" ]; then
    # shellcheck disable=SC1091
    source "$PROJECT_ROOT/.setenv"
fi
: "${GEMSTONE:?GEMSTONE must be set}"

# Rowan masterV4 9b8247a1d: removing an env-1 method on reload (96eb7c01d), and a
# session-method extension's deletion described by the project that has its
# package (9b8247a1d). 4.0.0.a5 ships 7d50ec0c8.
REQUIRED_ROWAN=9b8247a1d
# rowan/needs-newer-rowan.txt is the one list of kinds that need it, shared with
# scripts/check_rowan_floor.py, which refuses a change that makes one.
NEEDS_ROWAN=" $(grep -vE '^\s*(#|$)' "$PROJECT_ROOT/rowan/needs-newer-rowan.txt" | tr '\n' ' ')"

REQUIRED=
KINDS=()
while [ $# -gt 0 ]; do
    case "$1" in
        --required-extent) REQUIRED=$2; shift 2 ;;
        env1_removal|session_removal|classes|shape) KINDS+=("$1"); shift ;;
        *) echo "usage: $0 --required-extent <extent> [env1_removal|session_removal|classes|shape ...]" >&2; exit 2 ;;
    esac
done
[ -n "$REQUIRED" ] && [ -f "$REQUIRED" ] || { echo "matrix: --required-extent must name an extent file" >&2; exit 2; }
[ ${#KINDS[@]} -eq 0 ] && KINDS=(env1_removal session_removal classes shape)
PRODUCT=$GEMSTONE/bin/extent0.rowan3.dbf
WORK=${GRAIL_MATRIX_DIR:-$PROJECT_ROOT/out/rowan-matrix}
mkdir -p "$WORK"

run_one() {     # run_one <kind> <label> <extent> -- PASS or FAIL in $WORK/<kind>-<label>.result
    local kind=$1 label=$2 extent=$3 out=$WORK/$1-$2
    rm -rf "$out"
    GRAIL_UPGRADE_CHANGES=$kind GRAIL_UPGRADE_EXTENT=$extent GRAIL_UPGRADE_STONE=grail_mx_${kind:0:4}_$label \
        GRAIL_UPGRADE_DIR=$out "$SCRIPT_DIR/run_grail_upgrade_test.sh" --keep synthetic > "$out.log" 2>&1
    if grep -q '^upgrade: synthetic: PASS' "$out.log"; then echo PASS > "$out.result"
    else echo FAIL > "$out.result"; fi
}

EXIT=0
SATISFIED=()
printf 'matrix: product %s\nmatrix: required %s (Rowan >= %s)\n' "$PRODUCT" "$REQUIRED" "$REQUIRED_ROWAN"
for kind in "${KINDS[@]}"; do
    run_one "$kind" product "$PRODUCT" &
    run_one "$kind" required "$REQUIRED" &
    wait
    p=$(cat "$WORK/$kind-product.result") r=$(cat "$WORK/$kind-required.result")
    # where the product run stopped, for the record
    why=$(grep -m1 -oE "install failed|UPGRADE FAIL [^:]*" "$WORK/$kind-product.log" || true)
    first=$(grep -m1 -E "^ERROR [0-9]+" "$WORK/$kind-product/grail/install.out" 2>/dev/null | cut -c1-140 || true)
    case "$NEEDS_ROWAN" in *" $kind "*) needs=yes ;; *) needs=no ;; esac
    verdict=ok
    if [ "$r" != PASS ]; then verdict="FAIL: the required extent fails -- a Grail defect (see $WORK/$kind-required.log)"; EXIT=1
    elif [ $needs = yes ] && [ "$p" = PASS ]; then verdict="the product now applies it: raise the floor"; SATISFIED+=("$kind")
    elif [ $needs = no ] && [ "$p" != PASS ]; then verdict="FAIL: the product fails a kind not in NEEDS_ROWAN (see $WORK/$kind-product.log)"; EXIT=1
    fi
    printf 'matrix: %-16s product %-4s required %-4s needs-newer-rowan %-3s %s%s\n' \
        "$kind" "$p" "$r" "$needs" "$verdict" "${why:+  [product: $why${first:+ -- $first}]}"
done
if [ $EXIT -eq 0 ] && [ ${#SATISFIED[@]} -gt 0 ]; then
    echo "matrix: the product's Rowan now applies: ${SATISFIED[*]} -- raise install.sh's floor and update NEEDS_ROWAN"
    EXIT=3
fi
[ $EXIT -eq 0 ] && echo "matrix: PASS" || echo "matrix: exit $EXIT"
exit $EXIT
