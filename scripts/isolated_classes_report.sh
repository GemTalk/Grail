#!/bin/bash
# ===========================================================================
# Report on an isolated-class run (scripts/run_isolated_classes.sh, #1940).
# ===========================================================================
# Usage:
#   scripts/isolated_classes_report.sh [--partitions N] DIR [DIR ...]
#   scripts/isolated_classes_report.sh --one-partition DIR
#
# Each DIR is one runner's output directory: plan.txt (the classes it was
# given, from tests/scripts/listIsolatedClasses.gs), and per class <C>.out and
# <C>.rc.  Several DIRs are the partitions of one CI run; --partitions says how
# many there must be.  --one-partition judges a single partition of a larger
# run on its own -- its classes, not the run's coverage, which only the run's
# summary can see.  Needs no stone.
#
# A class is
#   PASSED      its session printed a GRAIL_CLASS_RESULT with no defects;
#   FAILED      it printed one with failures or errors (the failing tests are
#               listed, with a one-line reproduction);
#   INCOMPLETE  it printed none: the session crashed, was refused a login,
#               timed out, or the class was not found.
#
# EXIT 0 ONLY WHEN EVERY CLASS RAN AND PASSED.  An INCOMPLETE class, a missing
# partition, partitions that planned differently, or classes that do not add up
# to the suite all fail the run and say INCOMPLETE in the summary line -- the
# gate's history (.claude/CLAUDE.md) is of shards that never ran printing a
# green total, and this report must not be able to do that.
#
# It also fails a run whose sessions did not all start equally empty
# (GRAIL_CLASS_FRESH, SessionTemps' size at login): that is the isolation
# itself, checked rather than assumed.
#
# bash 3.2 compatible (macOS /bin/bash).
# ===========================================================================

set -u

EXPECT_PARTITIONS=''
ONE_PARTITION=0
if [ "${1:-}" = --partitions ]; then
    EXPECT_PARTITIONS="${2:?--partitions needs a number}"
    shift 2
elif [ "${1:-}" = --one-partition ]; then
    ONE_PARTITION=1
    shift
fi
if [ "$#" -eq 0 ]; then
    echo "usage: $0 [--partitions N | --one-partition] DIR [DIR ...]" >&2
    exit 2
fi

REPRO='scripts/run_isolated_classes.sh'
n_expected=0; n_pass=0; n_fail=0; n_incomplete=0
t_run=0; t_pass=0; t_fail=0; t_err=0
problems=''            # coverage / isolation errors, one per line
fresh_values=''        # every GRAIL_CLASS_FRESH size seen
digests=''; partition_counts=''; partitions_seen=''; suite_classes=''

field() { # $1=line $2=key -> value of |key=value|
    printf '%s\n' "$1" | sed -n "s/.*|$2=\([^|]*\).*/\1/p"
}

for dir in "$@"; do
    plan="$dir/plan.txt"
    if [ ! -f "$plan" ]; then
        problems="${problems}no plan.txt in $dir -- that runner never listed its classes
"
        continue
    fi
    pl=$(grep '^GRAIL_ISOLATED_PLAN|' "$plan" | head -1)
    if [ -z "$pl" ]; then
        problems="${problems}no GRAIL_ISOLATED_PLAN line in $plan
"
        continue
    fi
    d=$(field "$pl" digest)
    [ "$d" != named ] && digests="$digests $d"
    partition_counts="$partition_counts $(field "$pl" partitions)"
    partitions_seen="$partitions_seen $(field "$pl" partition)"
    suite_classes="$suite_classes $(field "$pl" suiteClasses)"
    planned=$(field "$pl" classes)
    listed=$(grep -c '^GRAIL_ISOLATED_CLASS|' "$plan" || true)
    [ "$planned" = "$listed" ] || problems="${problems}$plan plans $planned classes but lists $listed
"

    for cls in $(sed -n 's/^GRAIL_ISOLATED_CLASS|\([^|]*\)|.*/\1/p' "$plan"); do
        n_expected=$((n_expected + 1))
        out="$dir/$cls.out"
        rc=$(cat "$dir/$cls.rc" 2>/dev/null || echo '?')
        fresh=$(grep '^GRAIL_CLASS_FRESH|' "$out" 2>/dev/null | head -1)
        [ -n "$fresh" ] && fresh_values="$fresh_values
$(field "$fresh" sessionTemps) $cls"
        res=$(grep '^GRAIL_CLASS_RESULT|' "$out" 2>/dev/null | head -1)
        if [ -z "$res" ]; then
            n_incomplete=$((n_incomplete + 1))
            if [ ! -f "$out" ]; then why='never started (no log)'
            elif grep -q '^GRAIL_CLASS_TIMEOUT|' "$out"; then why="killed after $(field "$(grep '^GRAIL_CLASS_TIMEOUT|' "$out")" limit)"
            elif grep -qiE 'Login failed|maximum number of users' "$out"; then why='login refused (stone session limit?)'
            elif grep -q '^GRAIL_CLASS_ERROR|' "$out"; then why=$(grep '^GRAIL_CLASS_ERROR|' "$out" | head -1 | sed 's/.*|//')
            else why="no result -- the session died (exit $rc)"
            fi
            echo "INCOMPLETE  $cls -- $why"
            echo "    log:   $out"
            echo "    repro: $REPRO $cls"
            continue
        fi
        nums=$(printf '%s\n' "$res" | sed -E 's/.*\|([0-9]+) run, ([0-9]+) passed, ([0-9]+) failed, ([0-9]+) errors?.*/\1 \2 \3 \4/')
        # shellcheck disable=SC2086
        set -- $nums
        t_run=$((t_run + $1)); t_pass=$((t_pass + $2)); t_fail=$((t_fail + $3)); t_err=$((t_err + $4))
        if [ "$3" -eq 0 ] && [ "$4" -eq 0 ] && [ "$rc" = 0 ]; then
            n_pass=$((n_pass + 1))
            continue
        fi
        n_fail=$((n_fail + 1))
        echo "FAILED      $cls -- $3 failed, $4 errors of $1 (alone in a new session)"
        # Each defect's header and the first line of its message.
        awk '
            /^GRAIL_DEFECT\|\[(FAIL|ERROR)\] / { sub(/^GRAIL_DEFECT\|/, ""); print "    " $0; want = 1; next }
            want && /^GRAIL_DEFECT\|    / { line = $0; sub(/^GRAIL_DEFECT\|    /, "", line);
                if (line != "stack:" && line !~ /^repro:/) print "        " substr(line, 1, 160); want = 0 }
        ' "$out"
        [ "$rc" != 0 ] && [ "$3" -eq 0 ] && [ "$4" -eq 0 ] && echo "    (its session exited $rc after reporting no defects)"
        echo "    repro: $REPRO $cls"
    done
done

# --- the run as a whole -----------------------------------------------------
uniq_words() { printf '%s\n' $1 | grep -v '^$' | sort -u; }

# Every partition planned the same split.
if [ "$(uniq_words "$digests" | grep -c . || true)" -gt 1 ]; then
    problems="${problems}the partitions planned different splits (digests:$digests): a class may have run twice or not at all
"
fi
# Every partition there, once.
pc=$(uniq_words "$partition_counts")
if [ "$(printf '%s\n' "$pc" | grep -c . || true)" -gt 1 ]; then
    problems="${problems}the partitions disagree on how many there are:$partition_counts
"
fi
want="${EXPECT_PARTITIONS:-$(printf '%s\n' "$pc" | head -1)}"
if [ -n "$want" ] && [ "$ONE_PARTITION" -eq 0 ]; then
    i=0
    while [ "$i" -lt "$want" ]; do
        hits=$(printf '%s\n' $partitions_seen | grep -cx "$i" || true)
        [ "$hits" -eq 1 ] || problems="${problems}partition $i reported $hits time(s), not once
"
        i=$((i + 1))
    done
fi
# The partitions' classes add up to the suite.
sc=$(uniq_words "$suite_classes" | head -1)
if [ "$(uniq_words "$suite_classes" | grep -c . || true)" -gt 1 ]; then
    problems="${problems}the partitions saw suites of different sizes:$suite_classes
"
elif [ -n "$sc" ] && [ "$n_expected" -ne "$sc" ] && [ "$ONE_PARTITION" -eq 0 ]; then
    problems="${problems}the partitions listed $n_expected classes but the suite holds $sc
"
fi
[ "$n_expected" -eq 0 ] && problems="${problems}no classes were listed at all
"
# Every session started equally empty.
nf=$(printf '%s\n' "$fresh_values" | grep -v '^$' | awk '{print $1}' | sort -u | grep -c . || true)
if [ "$nf" -gt 1 ]; then
    problems="${problems}NOT ISOLATED: class sessions started with different SessionTemps sizes:
$(printf '%s\n' "$fresh_values" | grep -v '^$' | awk '{n[$1]++; if (!($1 in ex)) ex[$1]=$2} END {for (k in n) printf "    %s entries: %d class(es), e.g. %s\n", k, n[k], ex[k]}')
"
fi

[ -n "$problems" ] && printf '%s' "$problems" | sed 's/^/ERROR: /'

counts="$n_pass passed, $n_fail failed, $n_incomplete incomplete; tests: $t_run run, $t_pass passed, $t_fail failed, $t_err errors"
if [ "$n_incomplete" -gt 0 ] || [ -n "$problems" ]; then
    echo "isolated classes INCOMPLETE ($n_expected classes listed): $counts"
    echo "  NOT A RESULT -- some classes never reported, or the partitions do not add up (see above)."
    exit 1
elif [ "$n_fail" -gt 0 ]; then
    echo "isolated classes FAILED ($n_expected classes, each in its own session): $counts"
    exit 1
fi
echo "isolated classes passed ($n_expected classes, each in its own session): $counts"
exit 0
