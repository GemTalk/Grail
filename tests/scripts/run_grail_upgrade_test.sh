#!/bin/bash
# Upgrade test: an application using Grail n is upgraded to Grail m.
#
#   tests/scripts/run_grail_upgrade_test.sh [--keep] [noop] [synthetic] [release=<ref>]
#
# Each case gets a fresh stone of its own, from $GEMSTONE/bin/extent0.rowan3.dbf:
#
#   1. install Grail n                         (./install.sh, as on a real machine)
#   2. the app writes: tests/upgrade/write_phase.py imports tests/upgrade/upgrade_app.py
#      in a transaction and commits its objects under gemdb.root['upgrade']
#   3. install Grail m over it                 (./install.sh again: the upgrade)
#   4. the app reads: tests/upgrade/verify_phase.py checks that the data is intact,
#      that hashed containers still find fresh keys, that every stored object is an
#      instance of the CURRENT class, and that old objects run with the app's code;
#      tests/upgrade/check_classes.gs checks the same from Smalltalk, for every
#      class reachable from the stored objects
#
# The cases (default: noop synthetic):
#
#   noop          n = m = this checkout. An upgrade that changes nothing must also
#                 keep every Grail class (tests/upgrade/snapshot.gs before and after
#                 are identical): what tells an upgrade from a reinstall.
#   synthetic     n and m are this checkout plus tests/upgrade/make_variant.py's
#                 edits -- a changed, a removed and an added method and class, and a
#                 shape change -- and verify_phase.py also checks the stored objects
#                 run m's code.
#   release=REF   n = git REF (a previous release), m = this checkout.
#
# "This checkout" is the working tree, uncommitted edits included. Grail is installed
# into one directory for both n and m, as an upgrade in place would be, and the app
# lives outside it, so neither its path nor Grail's changes between the installs.
#
# Needs: $GEMSTONE (4.0.0.a5 or later) and $GEMSTONE_GLOBAL_DIR, from ./.setenv or
# the environment. Starts and stops its own stone (GRAIL_UPGRADE_STONE, default
# grail_upgrade); touches no other stone. Work goes in GRAIL_UPGRADE_DIR (default
# out/upgrade), removed at the end unless --keep or a case failed.
set -u
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
PROJECT_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)
if [ -f "$PROJECT_ROOT/.setenv" ]; then
    # shellcheck disable=SC1091
    source "$PROJECT_ROOT/.setenv"
fi
: "${GEMSTONE:?GEMSTONE must be set}"
: "${GEMSTONE_GLOBAL_DIR:?GEMSTONE_GLOBAL_DIR must be set}"
export PATH="$GEMSTONE/bin:$PATH"

STONE=${GRAIL_UPGRADE_STONE:-grail_upgrade}
WORK=${GRAIL_UPGRADE_DIR:-$PROJECT_ROOT/out/upgrade}
KEEP=0
CASES=()
for arg in "$@"; do
    case "$arg" in
        --keep) KEEP=1 ;;
        noop|synthetic|release=?*) CASES+=("$arg") ;;
        *) echo "usage: $0 [--keep] [noop] [synthetic] [release=<ref>]" >&2; exit 2 ;;
    esac
done
[ ${#CASES[@]} -eq 0 ] && CASES=(noop synthetic)

if [ -f "$GEMSTONE/sys/gemstone.key" ]; then
    KEYFILE="$GEMSTONE/sys/gemstone.key"
else
    KEYFILE="$GEMSTONE/sys/community.starter.key"
fi

log() { echo "upgrade: $*"; }

stop_stone() {
    stopstone "$STONE" SystemUser swordfish -i > /dev/null 2>&1
}

fresh_stone() {     # a new stone from the product's Rowan extent
    local d=$WORK/stone
    stop_stone
    rm -rf "$d"
    mkdir -p "$d"
    cp "$GEMSTONE/bin/extent0.rowan3.dbf" "$d/extent0.dbf"
    chmod 644 "$d/extent0.dbf"
    cat > "$d/stone.conf" <<EOF
DBF_EXTENT_NAMES = $d/extent0.dbf;
STN_TRAN_LOG_DIRECTORIES = $d/, $d/;
STN_TRAN_LOG_SIZES = 100, 100;
KEYFILE = $KEYFILE;
EOF
    startstone -e "$d/stone.conf" -l "$d/stone.log" "$STONE" > "$d/startstone.out" 2>&1 \
        && waitstone "$STONE" 60 > /dev/null 2>&1 \
        || { echo "upgrade: startstone $STONE failed:"; tail -20 "$d/startstone.out"; return 1; }
}

tree_from_checkout() {  # tree_from_checkout <dir> -- the working tree, without build output
    rm -rf "$1"
    mkdir -p "$1"
    (cd "$PROJECT_ROOT" && git ls-files -z --cached --others --exclude-standard) \
        | (cd "$PROJECT_ROOT" && rsync -a --from0 --files-from=- ./ "$1/")
}

tree_from_ref() {       # tree_from_ref <dir> <ref>
    rm -rf "$1"
    mkdir -p "$1"
    git -C "$PROJECT_ROOT" archive "$2" | tar -x -C "$1"
}

install_tree() {        # install_tree <tree> <log> -- install it in place, over what is there
    local g=$WORK/grail
    mkdir -p "$g"
    rsync -a --delete --exclude .setenv --exclude .topazini "$1/" "$g/"
    cat > "$g/.setenv" <<EOF
export GEMSTONE='$GEMSTONE'
export GEMSTONE_GLOBAL_DIR='$GEMSTONE_GLOBAL_DIR'
export GEMSTONE_NAME='$STONE'
export PATH='$PATH'
EOF
    printf 'set user DataCurator pass swordfish gemstone %s\n' "$STONE" > "$g/.topazini"
    (cd "$g" && ./install.sh) > "$2" 2>&1 || {
        echo "upgrade: install failed; the end of $2:"
        tail -30 "$2"
        return 1
    }
}

in_grail() {            # in_grail <cmd...> -- run in the installed Grail, with the app on the path
    (cd "$WORK/grail" && PYTHONPATH="$WORK/app" "$@")
}

run_case() {            # run_case <case> -- 0 if every check passed
    local name=$1 d=$WORK/$1 probe=()
    rm -rf "$d"
    mkdir -p "$d"
    log "=== $name"
    fresh_stone || return 1

    case "$name" in
        noop)       tree_from_checkout "$d/n"; tree_from_checkout "$d/m" ;;
        synthetic)  tree_from_checkout "$d/n"; tree_from_checkout "$d/m"
                    python3 "$PROJECT_ROOT/tests/upgrade/make_variant.py" "$d/n" n > /dev/null || return 1
                    python3 "$PROJECT_ROOT/tests/upgrade/make_variant.py" "$d/m" m > /dev/null || return 1
                    probe=(--probe m) ;;
        release=*)  tree_from_ref "$d/n" "${name#release=}" || return 1; tree_from_checkout "$d/m" ;;
    esac

    log "install n"
    install_tree "$d/n" "$d/install-n.log" || return 1
    log "write"
    in_grail ./grail "$WORK/app/write_phase.py" "$d/expected.json" > "$d/write.log" 2>&1 \
        && grep -q 'write phase: stored' "$d/write.log" || {
        echo "upgrade: the write phase failed:"; tail -30 "$d/write.log"; return 1; }

    # After the write: the app's import deployed its modules, and an upgrade must keep those too.
    in_grail topaz -lq -S "$PROJECT_ROOT/tests/upgrade/snapshot.gs" < /dev/null \
        | grep '^SNAPSHOT' > "$d/snapshot-n.txt"
    log "install m (the upgrade)"
    install_tree "$d/m" "$d/install-m.log" || return 1
    in_grail topaz -lq -S "$PROJECT_ROOT/tests/upgrade/snapshot.gs" < /dev/null \
        | grep '^SNAPSHOT' > "$d/snapshot-m.txt"

    log "verify"
    in_grail ./grail "$WORK/app/verify_phase.py" "$d/expected.json" ${probe[@]+"${probe[@]}"} > "$d/verify.log" 2>&1
    in_grail topaz -lq -S "$PROJECT_ROOT/tests/upgrade/check_classes.gs" < /dev/null > "$d/classes.log" 2>&1
    grep -h '^UPGRADE \|^verify phase\|^check_classes' "$d/verify.log" "$d/classes.log" > "$d/results.txt"

    if [ "$name" = noop ]; then
        if diff "$d/snapshot-n.txt" "$d/snapshot-m.txt" > "$d/snapshot.diff"; then
            echo "UPGRADE PASS noop.classes_kept" >> "$d/results.txt"
        else
            echo "UPGRADE FAIL noop.classes_kept: $(grep -c '^>' "$d/snapshot.diff") of" \
                "$(wc -l < "$d/snapshot-n.txt" | tr -d ' ') Grail classes are new objects after" \
                "an upgrade that changed nothing (see $d/snapshot.diff)" >> "$d/results.txt"
        fi
    fi

    local pass fail
    pass=$(grep -c '^UPGRADE PASS' "$d/results.txt")
    fail=$(grep -c '^UPGRADE FAIL' "$d/results.txt")
    if ! grep -q '^verify phase:' "$d/results.txt" || ! grep -q '^check_classes: [0-9]* failed' "$d/results.txt"; then
        echo "upgrade: a verify step did not finish; see $d/verify.log and $d/classes.log"
        tail -20 "$d/verify.log" "$d/classes.log"
        fail=$((fail + 1))
    fi
    grep '^UPGRADE FAIL' "$d/results.txt" | sed 's/^/  /'
    log "$name: $pass passed, $fail failed"
    [ "$fail" -eq 0 ]
}

mkdir -p "$WORK"
rm -rf "$WORK/app"
mkdir -p "$WORK/app"
cp "$PROJECT_ROOT"/tests/upgrade/*.py "$WORK/app/"

EXIT=0
SUMMARY=()
for c in "${CASES[@]}"; do
    if run_case "$c"; then
        SUMMARY+=("$c: PASS")
    else
        SUMMARY+=("$c: FAIL")
        EXIT=1
    fi
done
stop_stone
for s in "${SUMMARY[@]}"; do log "$s"; done
if [ "$KEEP" -eq 0 ] && [ "$EXIT" -eq 0 ]; then
    rm -rf "$WORK"
else
    log "work kept in $WORK"
fi
exit $EXIT
