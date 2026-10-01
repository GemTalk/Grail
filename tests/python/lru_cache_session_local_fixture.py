"""An lru_cache in a deployed module is per-session, as CPython's is per-process.

A module-level @lru_cache wrapper in a DEPLOYED module is a committed object.
It used to keep its cache in its own slots, so:

  * every HIT wrote the committed wrapper (hits += 1, the key moved in the
    recency list) -- two gems serving one Flask app conflicted Write-Write
    over typing's _tp_cache with no application data involved;
  * every MISS hung the caller's argument and result off a committed object,
    so whatever commit came next stored them in the repository.  A cache
    keyed by a student ID puts the student ID in the transaction log (#1229).

In CPython an lru_cache is process memory and vanishes with the process.  The
session is Grail's process, so each session starts with an empty cache and
nothing it caches is ever committed.

Driven from tests/scripts/runLruCacheSessionLocalTest.gs, which is where the
commit / logout / login boundary can be observed.  Running this file directly
checks the single-process half under real CPython.
"""

from functools import lru_cache


@lru_cache(maxsize=32)
def lookup(student_id):
    return 'record-' + student_id


def call(student_id):
    return lookup(student_id)


def info():
    stats = lookup.cache_info()
    return (stats.hits, stats.misses, stats.currsize)


def clear():
    lookup.cache_clear()


RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:120])


if __name__ == '__main__':
    check('a_fresh_cache_is_empty', info(), (0, 0, 0))
    check('a_miss_answers_the_result', lookup('900001'), 'record-900001')
    check('a_hit_answers_the_same_result', lookup('900001'), 'record-900001')
    check('the_counts_follow', info(), (1, 1, 1))
    clear()
    check('cache_clear_empties_it', info(), (0, 0, 0))
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
