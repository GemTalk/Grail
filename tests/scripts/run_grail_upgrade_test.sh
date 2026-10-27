#!/bin/bash
# Upgrade test: an application using Grail n is upgraded to Grail m.
#
#   tests/scripts/run_grail_upgrade_test.sh [--keep] [noop] [synthetic] [release=<ref>]
#
# Each case gets a fresh stone of its own, from $GEMSTONE/bin/extent0.rowan3.dbf:
#
#   1. install Grail n                         (./install.sh, as on a real machine)
#   2. the app writes: tests/upgrade/write_phase.py imports tests/upgrade/upgrade_app.py
#      in a transaction and commits its objects under gemdb.root['upgrade']. A second
#      app, in the namespace grail_upgrade_ns (docs/App_Namespaces_Design.md), does
#      the same: tests/upgrade/upgrade_ns_main.py, its top file, deploys its own
#      modules there and commits its objects through gemdb.root, which in a
#      namespace is the top file's globals
#   3. install Grail m over it                 (./install.sh again: the upgrade)
#   4. the apps redeploy: tests/upgrade/redeploy_phase.py imports the app in a
#      transaction and commits, which rebuilds its modules (and the stdlib's) under m;
#      the namespaced app runs and commits. Skipped with GRAIL_UPGRADE_SKIP_REDEPLOY=1,
#      which leaves it to install.sh's own redeploy (scripts/redeployModules.gs, in
#      every namespace); verify then checks that binding each app wrote nothing
#   5. the app reads: tests/upgrade/verify_phase.py checks that the data is intact,
#      that hashed containers still find fresh keys, that every stored object is an
#      instance of the CURRENT class, and that old objects run with the app's code;
#      tests/upgrade/check_classes.gs checks the same from Smalltalk, for every
#      class reachable from the stored objects; tests/upgrade/upgrade_ns_phases.py
#      checks the namespaced app's as ns.<check>
#
# The cases (default: noop synthetic):
#
#   noop          n = m = this checkout. An upgrade that changes nothing must also
#                 keep every Grail class (tests/upgrade/snapshot.gs before and after
#                 are identical): what tells an upgrade from a reinstall.
#   synthetic     n and m are this checkout plus tests/upgrade/make_variant.py's
#                 edits -- a changed, a removed and an added method and class, removed
#                 kernel session methods, and a shape change -- and verify_phase.py
#                 also checks the stored objects run m's code. GRAIL_UPGRADE_CHANGES
#                 picks which kinds of change (make_variant.py; default all).
#   release=REF   n = git REF (a previous release), m = this checkout.
#
# "This checkout" is the working tree, uncommitted edits included. Grail is installed
# into one directory for both n and m, as an upgrade in place would be, and the app
# lives outside it, so neither its path nor Grail's changes between the installs.
#
# Needs: $GEMSTONE (4.0.0.a5 or later) and $GEMSTONE_GLOBAL_DIR, from ./.setenv or
# the environment. GRAIL_UPGRADE_RELOAD_ROWAN names an externals directory (a Rowan
# masterV4 checkout as RowanV3, beside RowanClientServicesV3 and the rest) to reload
# Rowan from into the live database, data and all, between installing n and m:
# whether an existing database can get a newer Rowan without being recreated.
# GRAIL_UPGRADE_EXTENT names another extent to start from (default
# $GEMSTONE/bin/extent0.rowan3.dbf) -- one with a newer Rowan loaded, say. Starts and stops its own stone (GRAIL_UPGRADE_STONE, default
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
EXTENT=${GRAIL_UPGRADE_EXTENT:-$GEMSTONE/bin/extent0.rowan3.dbf}
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

fresh_stone() {     # a new stone from $EXTENT
    local d=$WORK/stone
    stop_stone
    rm -rf "$d"
    mkdir -p "$d"
    cp "$EXTENT" "$d/extent0.dbf"
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
    # Python rather than rsync, which GemTalk's CI container does not have. A file
    # git still lists but the working tree has deleted is skipped.
    (cd "$PROJECT_ROOT" && git ls-files -z --cached --others --exclude-standard) \
        | python3 -c '
import os, shutil, sys
src, dst = sys.argv[1], sys.argv[2]
for rel in sys.stdin.buffer.read().decode().split("\0"):
    s = os.path.join(src, rel)
    if not rel or not os.path.lexists(s):
        continue
    d = os.path.join(dst, rel)
    os.makedirs(os.path.dirname(d), exist_ok=True)
    if os.path.islink(s):
        os.symlink(os.readlink(s), d)
    else:
        shutil.copy2(s, d)
' "$PROJECT_ROOT" "$1"
}

tree_from_ref() {       # tree_from_ref <dir> <ref>
    rm -rf "$1"
    mkdir -p "$1"
    git -C "$PROJECT_ROOT" archive "$2" | tar -x -C "$1"
}

install_tree() {        # install_tree <tree> <log> -- install it in place, over what is there
    local g=$WORK/grail
    mkdir -p "$g"
    # Emptied and copied whole, keeping only this directory's .setenv and .topazini.
    # A full copy cannot mistake m's files for n's -- they can differ by one
    # character in a file written the same second -- and needs no rsync, which
    # GemTalk's CI container does not have. The build output goes too; install.sh
    # rebuilds it.
    find "$g" -mindepth 1 -maxdepth 1 ! -name .setenv ! -name .topazini -exec rm -rf {} +
    cp -a "$1/." "$g/"
    cat > "$g/.setenv" <<EOF
export GEMSTONE='$GEMSTONE'
export GEMSTONE_GLOBAL_DIR='$GEMSTONE_GLOBAL_DIR'
export GEMSTONE_NAME='$STONE'
export PATH='$PATH'
EOF
    printf 'set user DataCurator pass swordfish gemstone %s\n' "$STONE" > "$g/.topazini"
    # The install's own topaz logs (install.out, redeployModules.out, ...) beside
    # its log: the next install in this directory starts by deleting them.
    local logs=${2%.log}-out
    (cd "$g" && ./install.sh) > "$2" 2>&1
    local rc=$?
    mkdir -p "$logs" && cp "$g"/*.out "$logs/" 2>/dev/null
    [ $rc -eq 0 ] || {
        echo "upgrade: install failed; the end of $2:"
        tail -30 "$2"
        return 1
    }
}

in_grail() {            # in_grail <cmd...> -- run in the installed Grail, with the app on the path
    (cd "$WORK/grail" && PYTHONPATH="$WORK/app" "$@")
}

NS_APP=grail_upgrade_ns
in_ns_app() {           # in_ns_app <phase> [args...] -- run the namespaced app's top file
    in_grail ./grail --namespace "$NS_APP" "$WORK/app/upgrade_ns_main.py" "$@"
}

run_case() {            # run_case <case> -- 0 if every check passed
    local name=$1 d=$WORK/$1 probe=() probe_m=
    rm -rf "$d"
    mkdir -p "$d"
    rm -f "$WORK/app/ns_main_ran_without_phase"
    log "=== $name"
    fresh_stone || return 1

    case "$name" in
        noop)       tree_from_checkout "$d/n"; tree_from_checkout "$d/m" ;;
        synthetic)  tree_from_checkout "$d/n"; tree_from_checkout "$d/m"
                    python3 "$PROJECT_ROOT/tests/upgrade/make_variant.py" "$d/n" n > /dev/null || return 1
                    python3 "$PROJECT_ROOT/tests/upgrade/make_variant.py" "$d/m" m > /dev/null || return 1
                    probe=(--probe m); probe_m=m ;;
        release=*)  tree_from_ref "$d/n" "${name#release=}" || return 1; tree_from_checkout "$d/m" ;;
    esac

    log "install n"
    install_tree "$d/n" "$d/install-n.log" || return 1
    log "write"
    in_grail ./grail "$WORK/app/write_phase.py" "$d/expected.json" > "$d/write.log" 2>&1 \
        && grep -q 'write phase: stored' "$d/write.log" || {
        echo "upgrade: the write phase failed:"; tail -30 "$d/write.log"; return 1; }
    in_ns_app write "$d/expected-ns.json" > "$d/write-ns.log" 2>&1 \
        && grep -q 'write ns phase: stored' "$d/write-ns.log" || {
        echo "upgrade: the namespaced app's write phase failed:"; tail -30 "$d/write-ns.log"; return 1; }

    # After the write: the app's import deployed its modules, and an upgrade must keep those too.
    in_grail topaz -lq -S "$PROJECT_ROOT/tests/upgrade/snapshot.gs" < /dev/null \
        | grep '^SNAPSHOT' > "$d/snapshot-n.txt"
    if [ -n "${GRAIL_UPGRADE_RELOAD_ROWAN:-}" ]; then
        # A newer Rowan into the live database, data and all, before Grail m.
        log "reload Rowan from $GRAIL_UPGRADE_RELOAD_ROWAN"
        (cd "$WORK/grail" && EXTERNALS_ST_BASE=$GRAIL_UPGRADE_RELOAD_ROWAN \
            ROWAN_PROJECTS_HOME=${ROWAN_PROJECTS_HOME:-$GRAIL_UPGRADE_RELOAD_ROWAN} \
            topaz -lq -S "$PROJECT_ROOT/tests/upgrade/reload_rowan.gs") < /dev/null > "$d/reload-rowan.log" 2>&1 \
            && grep -q 'reload_rowan: reloaded' "$d/reload-rowan.log" || {
            echo "upgrade: the Rowan reload failed; the end of $d/reload-rowan.log:"
            tail -30 "$d/reload-rowan.log"; return 1; }
    fi
    log "install m (the upgrade)"
    install_tree "$d/m" "$d/install-m.log" || return 1
    in_grail topaz -lq -S "$PROJECT_ROOT/tests/upgrade/snapshot.gs" < /dev/null \
        | grep '^SNAPSHOT' > "$d/snapshot-m.txt"

    if [ "${GRAIL_UPGRADE_SKIP_REDEPLOY:-0}" = 1 ]; then
        log "redeploy skipped: the app relies on the install's own redeploy"
    else
        log "redeploy"
        in_grail ./grail "$WORK/app/redeploy_phase.py" > "$d/redeploy.log" 2>&1 \
            && grep -q 'redeploy phase:' "$d/redeploy.log" || {
            echo "upgrade: the redeploy phase failed:"; tail -30 "$d/redeploy.log"; return 1; }
        in_ns_app redeploy > "$d/redeploy-ns.log" 2>&1 \
            && grep -q 'redeploy ns phase:' "$d/redeploy-ns.log" || {
            echo "upgrade: the namespaced app's redeploy phase failed:"; tail -30 "$d/redeploy-ns.log"; return 1; }
    fi

    log "verify"
    in_grail ./grail "$WORK/app/verify_phase.py" "$d/expected.json" ${probe[@]+"${probe[@]}"} > "$d/verify.log" 2>&1
    in_ns_app verify "$d/expected-ns.json" > "$d/verify-ns.log" 2>&1
    GRAIL_UPGRADE_PROBE=$probe_m in_grail topaz -lq -S "$PROJECT_ROOT/tests/upgrade/check_classes.gs" \
        < /dev/null > "$d/classes.log" 2>&1
    grep -h '^UPGRADE \|^verify phase\|^verify ns phase\|^check_classes' \
        "$d/verify.log" "$d/verify-ns.log" "$d/classes.log" > "$d/results.txt"

    if [ "$name" = noop ]; then
        if diff "$d/snapshot-n.txt" "$d/snapshot-m.txt" > "$d/snapshot.diff"; then
            echo "UPGRADE PASS noop.classes_kept" >> "$d/results.txt"
        else
            echo "UPGRADE FAIL noop.classes_kept: $(grep -c '^>' "$d/snapshot.diff") of" \
                "$(wc -l < "$d/snapshot-n.txt" | tr -d ' ') Grail classes are new objects after" \
                "an upgrade that changed nothing (see $d/snapshot.diff)" >> "$d/results.txt"
        fi
    fi

    local pass fail known
    pass=$(grep -c '^UPGRADE PASS' "$d/results.txt")
    fail=$(grep -c '^UPGRADE FAIL' "$d/results.txt")
    known=$(grep -c '^UPGRADE KNOWN' "$d/results.txt")
    if ! grep -q '^verify phase:' "$d/results.txt" || ! grep -q '^verify ns phase:' "$d/results.txt" \
            || ! grep -q '^check_classes: [0-9]* failed' "$d/results.txt"; then
        echo "upgrade: a verify step did not finish; see $d/verify.log, $d/verify-ns.log and $d/classes.log"
        tail -20 "$d/verify.log" "$d/verify-ns.log" "$d/classes.log"
        fail=$((fail + 1))
    fi
    grep '^UPGRADE \(FAIL\|KNOWN\)' "$d/results.txt" | sed 's/^/  /'
    log "$name: $pass passed, $fail failed, $known known gaps"
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
