"""Runtime rebinding of builtins, and what a first-class read answers.

Grail compiles ``len(x)`` to a direct Smalltalk send on the builtins
singleton, which no dictionary write can redirect -- so ``builtins.len =
fake`` used to be invisible to every compiled call site.  The repair is
store-side (the design decision is recorded in docs/Issues.md): the store
compiles session-method forwarders for the name's selector shapes, each
reading the dynamic slot at CALL time -- which is what makes a second
rebinding visible without recompiling (the leaf-function check below) --
and storing the original back unwinds them.  Ordinary calls never pay.

First-class reads (``f = len``) route through the module global chain,
which both honours an active override and caches the wrap, so reading the
same builtin twice answers the SAME object -- CPython's builtins have
stable identity, and ``f`` captured during an override stays the fake
after restore exactly as CPython's does.

eval with caller-provided globals that contain a builtin name compiles
against them: the seeded key shadows the builtin like a module global
(test_dynamic's eval_gives_lambda_custom_globals).

Every expectation was checked against CPython 3.14 first.
"""

import builtins

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


def foo():
    return len([1, 2, 3])


def gen():
    x = range(3)
    yield len(x)
    yield len(x)


check('baseline', foo(), 3)

_orig = builtins.len
builtins.len = lambda x: 7
check('call_sees_rebind', foo(), 7)
check('attribute_read_sees_rebind', builtins.len([1]) == 7, True)
builtins.len = _orig
check('restore', foo(), 3)

_g = gen()
check('generator_first', next(_g), 3)
builtins.len = lambda x: 7
check('generator_sees_rebind_mid_flight', next(_g), 7)
builtins.len = _orig
check('restore_after_generator', foo(), 3)


def _bar():
    builtins.len = lambda x: 4


def _leaf(modifier):
    collected = []
    builtins.len = lambda x: 7
    collected.append(len(range(7)))
    modifier()
    collected.append(len(range(7)))
    return collected


check('leaf_function_percolates', _leaf(_bar), [7, 4])
builtins.len = _orig
check('restore_after_leaf', foo(), 3)

check('identity_stable', len is len, True)

builtins.len = lambda x: 9
_f = len
check('first_class_read_sees_override', _f([1]), 9)
builtins.len = _orig
check('first_class_capture_survives_restore', _f([1, 2]), 9)
check('call_back_to_original', foo(), 3)

check('eval_custom_globals_shadow',
      eval('lambda: len([])', {'len': lambda x: 7})(), 7)

check('eval_plain_globals_still_builtin',
      eval('len([1, 2])', {}), 2)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
