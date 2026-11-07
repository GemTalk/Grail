#!/bin/bash

# Self-test for scripts/cancel_stale_merge_group.sh, which cancels a
# merge-queue build whose group is gone.  Needs no network: a fake curl on PATH
# answers each request with a status the case chooses.
#
# The direction that matters is the FALSE cancel: cancelling a live group
# ejects its PRs from the queue.  So every answer except a 404 for a
# gh-readonly-queue ref must leave the run alone, and only that 404 may
# reach the cancel endpoint.
#
# Usage: tests/scripts/test_cancel_stale_merge_group.sh

set -uo pipefail

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
SCRIPT="$ROOT/scripts/cancel_stale_merge_group.sh"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

pass=0
fail=0
ok()  { pass=$((pass + 1)); }
bad() { echo "FAIL $*"; fail=$((fail + 1)); }

# The fake curl logs "METHOD URL" for each call and prints the status the case
# set for that endpoint: FAKE_REF for the ref lookup, FAKE_CANCEL for the
# cancel.  The status "fail" makes it exit 7 printing 000, as curl does when
# it cannot connect.
mkdir -p "$TMP/bin"
cat > "$TMP/bin/curl" <<'EOF'
#!/bin/bash
method=GET url=
while [ $# -gt 0 ]; do
    case "$1" in
        -X) method=$2; shift 2 ;;
        -o|-w|-H) shift 2 ;;
        -*) shift ;;
        *) url=$1; shift ;;
    esac
done
echo "$method $url" >> "$FAKE_LOG"
case "$url" in
    */cancel) code=$FAKE_CANCEL ;;
    *)        code=$FAKE_REF ;;
esac
if [ "$code" = fail ]; then printf 000; exit 7; fi
printf '%s' "$code"
EOF
chmod +x "$TMP/bin/curl"

QREF=refs/heads/gh-readonly-queue/main/pr-2202-0123abcd
API=https://api.example/repos/GemTalk/Grail

# run CASE REF FAKE_REF FAKE_CANCEL -- sets OUTPUT, RC and CALLS (the log)
run() {
    : > "$TMP/$1.calls"
    OUTPUT=$(PATH="$TMP/bin:$PATH" FAKE_LOG="$TMP/$1.calls" \
        FAKE_REF="$3" FAKE_CANCEL="$4" GRAIL_STALE_CANCEL_WAIT=0 \
        GITHUB_REF="$2" GITHUB_REPOSITORY=GemTalk/Grail GITHUB_RUN_ID=42 \
        GITHUB_API_URL=https://api.example GH_TOKEN=t \
        "$SCRIPT" 2>&1)
    RC=$?
    CALLS=$(cat "$TMP/$1.calls")
}

# --- a live group runs on, and is never cancelled ----------------------------
run live "$QREF" 200 202
[ "$RC" -eq 0 ] && ok || bad "a live group exits $RC: $OUTPUT"
[ "$CALLS" = "GET $API/git/ref/heads/gh-readonly-queue/main/pr-2202-0123abcd" ] \
    && ok || bad "a live group made the wrong calls: $CALLS"

# --- a gone group is cancelled, and the job fails ----------------------------
run gone "$QREF" 404 202
[ "$RC" -eq 1 ] && ok || bad "a gone group exits $RC: $OUTPUT"
printf '%s\n' "$CALLS" | grep -qx "POST $API/actions/runs/42/cancel" \
    && ok || bad "a gone group was not cancelled: $CALLS"

# --- a refused cancel still fails the job, so nothing after it starts --------
run refused "$QREF" 404 403
[ "$RC" -eq 1 ] && ok || bad "a refused cancel exits $RC: $OUTPUT"
printf '%s\n' "$OUTPUT" | grep -q 'refused (HTTP 403)' \
    && ok || bad "a refused cancel does not say so: $OUTPUT"

# --- every other answer runs on, without touching the cancel endpoint --------
for code in 401 403 422 500 502 fail; do
    run "other-$code" "$QREF" "$code" 202
    [ "$RC" -eq 0 ] && ok || bad "a ref lookup answering $code exits $RC: $OUTPUT"
    case "$CALLS" in
        *cancel*) bad "a ref lookup answering $code cancelled the run: $CALLS" ;;
        *) ok ;;
    esac
done

# --- a ref outside the merge queue is never looked up -------------------------
for ref in refs/heads/main refs/pull/2202/merge refs/heads/gh-readonly-queue; do
    run "not-queue" "$ref" 404 202
    [ "$RC" -eq 0 ] && ok || bad "$ref exits $RC: $OUTPUT"
    [ -z "$CALLS" ] && ok || bad "$ref made calls: $CALLS"
done

echo "cancel_stale_merge_group self-test: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
