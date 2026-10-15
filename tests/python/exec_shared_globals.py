"""Fixture: code an exec() defines reads the globals dict as it runs.

Grail runs exec(src, g) in a scope seeded from g and copies the bindings back
afterwards.  A function the exec defines keeps reading that scope, so it
never saw what happened to g after the exec returned:

* a name a LATER exec bound -- ``def g(): return next(me)'' then
  ``me = g()'' -- was NameError, and a name a later exec REBOUND kept its
  old value (``m235 = LazyList(m235())'').  Every doctest example is its own
  exec, so test_generators' fun and pep doctests and test_setcomps failed;
* ``g['y'] = 2'' made directly was invisible to it, and so was a global a
  lambda returned by eval() reads.

Each exec into one dict now reuses the scope the earlier ones left, and a
name with no slot in it is read from the dict at run time.

What the copy-back still cannot see is pinned in KNOWN_DIVERGENCES: a
``global'' write in such a function reaches the dict only at the next exec, a
name deleted from the dict stays readable through a slot compiled before the
delete, and globals() called after the exec is not the exec's dict.

Every EXPECTED check holds under CPython 3.14, which is what makes it
evidence.
"""

r = {}


def _try(thunk):
    try:
        return thunk()
    except Exception as e:
        return type(e).__name__ + ': ' + str(e)


def _later_exec_binds():
    g = {}
    exec("def g(): return next(me)", g)
    exec("def gen():\n    yield 1", g)
    exec("me = gen()", g)
    return _try(lambda: g['g']())


def _later_exec_rebinds():
    g = {}
    exec("def f():\n    yield f", g)
    exec("f = 'rebound'", g)
    exec("def show(): return f", g)
    exec("it = f", g)
    return (g['show'](), g['it'])


def _generator_sees_rebind():
    g = {}
    exec("def m():\n    yield 1\n    yield m", g)
    exec("it = m()", g)
    exec("m = 'rebound'", g)
    return (next(g['it']), next(g['it']))


def _direct_store_after_exec():
    g = {}
    exec("def f(): return y", g)
    first = _try(lambda: g['f']())
    g['y'] = 2
    return (first, g['f']())


def _later_exec_value():
    g = {}
    exec("def f(): return y", g)
    exec("y = 1", g)
    one = g['f']()
    g['y'] = 2
    return (one, g['f']())


def _copies_do_not_share():
    g = {}
    exec("x = 1\ndef f(): return x", g)
    h = g.copy()
    exec("x = 2", h)
    return (g['f'](), h['f'](), g['x'], h['x'])


def _separate_dicts():
    a, b = {}, {}
    exec("def f(): return v", a)
    exec("v = 'b'", b)
    return _try(lambda: a['f']())


def _three_argument_form():
    l = {}
    exec("v = 5\ndef f(): return v", {}, l)
    return (sorted(l), l['v'])


def _no_machinery_in_globals():
    g = {}
    exec("def f(): return sorted(k for k in globals() if not k.startswith('__'))", g)
    exec("y = 1", g)
    return (g['f'](), sorted(k for k in g if not k.startswith('__')))


def _deleted_before_next_exec():
    g = {}
    exec("x = 1", g)
    del g['x']
    exec("pass", g)
    return ('x' in g, sorted(k for k in g if not k.startswith('__')))


def _eval_lambda():
    g = {}
    f = eval("lambda: w", g)
    g['w'] = 9
    return f()


def _global_write_between_execs():
    g = {'n': 0}
    exec("def inc():\n    global n\n    n += 1\n    return n", g)
    g['inc']()
    g['inc']()
    exec("pass", g)
    return g['n']


def _global_write_seen_directly():
    g = {'n': 0}
    exec("def inc():\n    global n\n    n += 1\n    return n", g)
    return (g['inc'](), g['inc'](), g['n'])


def _deleted_name_read_by_slot():
    g = {}
    exec("x = 1\ndef f(): return x", g)
    del g['x']
    return _try(lambda: g['f']())


def _globals_after_the_exec():
    g = {}
    exec("def outer():\n    exec('z = 3', globals())\n    return z", g)
    return _try(lambda: g['outer']())


r['a_later_exec_binds_a_name'] = _try(_later_exec_binds)
r['a_later_exec_rebinds_a_name'] = _try(_later_exec_rebinds)
r['a_generator_sees_a_rebind'] = _try(_generator_sees_rebind)
r['a_store_into_the_dict_is_seen'] = _try(_direct_store_after_exec)
r['a_later_value_is_seen'] = _try(_later_exec_value)
r['copies_do_not_share_a_scope'] = _try(_copies_do_not_share)
r['separate_dicts_stay_separate'] = _try(_separate_dicts)
r['the_three_argument_form'] = _try(_three_argument_form)
r['no_machinery_in_globals'] = _try(_no_machinery_in_globals)
r['a_deletion_survives_the_next_exec'] = _try(_deleted_before_next_exec)
r['an_eval_lambda_reads_later_globals'] = _try(_eval_lambda)
r['a_global_write_reaches_the_next_exec'] = _try(_global_write_between_execs)
r['a_global_write_is_seen_at_once'] = _try(_global_write_seen_directly)
r['a_deleted_name_read_by_a_slot'] = _try(_deleted_name_read_by_slot)
r['globals_after_the_exec'] = _try(_globals_after_the_exec)

EXPECTED = {
    'a_later_exec_binds_a_name': 1,
    'a_later_exec_rebinds_a_name': ('rebound', 'rebound'),
    'a_generator_sees_a_rebind': (1, 'rebound'),
    'a_store_into_the_dict_is_seen': ("NameError: name 'y' is not defined", 2),
    'a_later_value_is_seen': (1, 2),
    'copies_do_not_share_a_scope': (1, 1, 1, 2),
    'separate_dicts_stay_separate': "NameError: name 'v' is not defined",
    'the_three_argument_form': (['f', 'v'], 5),
    'no_machinery_in_globals': (['f', 'y'], ['f', 'y']),
    'a_deletion_survives_the_next_exec': (False, []),
    'an_eval_lambda_reads_later_globals': 9,
    'a_global_write_reaches_the_next_exec': 2,
}

KNOWN_DIVERGENCES = {
    # CPython: (1, 2, 2) -- a ``global'' write lands in the exec's scope and reaches the dict at
    # the next exec (a_global_write_reaches_the_next_exec).
    'a_global_write_is_seen_at_once': (1, 2, 0),
    # CPython: "NameError: name 'x' is not defined" -- f was compiled with a slot for x; the slot is dropped only at the next
    # exec into the dict (a_deletion_survives_the_next_exec).
    'a_deleted_name_read_by_a_slot': 1,
    # CPython: 3 -- globals() called after the exec is the calling module's, not the dict.
    'globals_after_the_exec': "NameError: name 'z' is not defined",
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS,
    sorted(r) == sorted(list(EXPECTED) + list(KNOWN_DIVERGENCES)))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-40s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    for key, expected in KNOWN_DIVERGENCES.items():
        actual = r[key]
        print('%-5s %-40s -> %r' % ('OK' if actual == expected else 'XFAIL',
                                    key, actual))
    print(SUMMARY)
