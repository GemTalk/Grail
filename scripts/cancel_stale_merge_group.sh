#!/bin/bash

# Cancel this workflow run if it is a merge-queue build whose group is gone.
#
# When the merge queue rebuilds or drops a group it deletes that group's
# gh-readonly-queue/... branch, but the run it started keeps going: the per-ref
# concurrency group in ci.yml never cancels it, because each rebuild gets a new
# ref.  Measured 2026-11-06: 12 of 17 waiting merge_group runs belonged to
# groups that no longer existed, each wanting the full test matrix.
#
# ci.yml calls this twice: from queue-current, before the matrix is scheduled,
# and from each test-main shard, as its first step after checkout -- because the
# usual stale build is a group BEHIND one that failed, which started alongside
# it and passed queue-current long before its branch was deleted.
#
# Only a 404 for a gh-readonly-queue ref cancels.  Anything else -- a live ref,
# any other HTTP status, no network -- lets the run go ahead: cancelling a live
# group ejects its PRs from the queue, which is far worse than one wasted build.
#
# Uses curl, not gh: test-main runs in GemTalk's container, which has no gh.
#
# Needs GITHUB_REF, GITHUB_REPOSITORY, GITHUB_RUN_ID and GH_TOKEN (a token with
# contents: read, to see the ref, and actions: write, to cancel).  Exits 0 to
# run on, 1 once it has asked for the run to be cancelled.
#
# Usage: scripts/cancel_stale_merge_group.sh
# Self-test: tests/scripts/test_cancel_stale_merge_group.sh

set -uo pipefail

ref="${GITHUB_REF:?}"
case "$ref" in
    refs/heads/gh-readonly-queue/*) ;;
    *) echo "$ref is not a merge-queue ref; nothing to check"; exit 0 ;;
esac

api="${GITHUB_API_URL:-https://api.github.com}/repos/${GITHUB_REPOSITORY:?}"
headers=(-H "Authorization: Bearer ${GH_TOKEN:?}"
         -H "Accept: application/vnd.github+json"
         -H "X-GitHub-Api-Version: 2022-11-28")

# status METHOD URL -- the HTTP status, or 000 when there was no answer.
status() {
    local code
    code=$(curl -sS -o /dev/null -w '%{http_code}' -X "$1" "${headers[@]}" "$2") || code=000
    printf '%s' "${code:-000}"
}

code=$(status GET "$api/git/ref/${ref#refs/}")
case "$code" in
    200) echo "$ref is live; running"; exit 0 ;;
    404) ;;
    *)   echo "could not check $ref (HTTP $code); running anyway"; exit 0 ;;
esac

echo "$ref is gone: this merge group is stale, cancelling run ${GITHUB_RUN_ID:?}"
code=$(status POST "$api/actions/runs/$GITHUB_RUN_ID/cancel")
if [ "$code" != 202 ]; then
    echo "::warning::the cancel was refused (HTTP $code); failing this job instead"
    exit 1
fi
# The cancel takes effect asynchronously.  Fail if it has not by now, so the
# work after this step still never starts.
sleep "${GRAIL_STALE_CANCEL_WAIT:-120}"
exit 1
