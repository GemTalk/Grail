"""Fixture: classmethod and staticmethod objects have a __dict__ holding what they copied.

CPython's classmethod and staticmethod copy their callable's __module__,
__name__, __qualname__ and __doc__ -- each one it has -- into their own
__dict__ when they are made (Objects/funcobject.c:1393-1423,
functools_wraps), and attributes stored on them later land there too.
Grail answered ``cm.__dict__`` with a bound builtin method
(test_descr test_classmethods, test_staticmethods).  Every check here holds
under CPython 3.14, which is what makes it evidence.
"""

r = {}


def f(cls, arg):
    "f docstring"
    return arg


def no_doc():
    pass


def outcome(compute):
    try:
        return compute()
    except Exception as exc:
        return (type(exc).__name__, str(exc))


def stored_then_deleted(kind):
    wrapper = kind(f)
    wrapper.x = 42
    after_store = sorted(wrapper.__dict__)
    del wrapper.x
    return after_store, sorted(wrapper.__dict__), hasattr(wrapper, 'x')


EXPECTED_F = {'__module__': __name__, '__name__': 'f', '__qualname__': 'f', '__doc__': 'f docstring'}

r['what_classmethod_copies'] = outcome(lambda: classmethod(f).__dict__)
r['what_staticmethod_copies'] = outcome(lambda: staticmethod(f).__dict__)
r['a_callable_without_a_docstring'] = outcome(lambda: classmethod(no_doc).__dict__['__doc__'])
r['a_builtin_callable'] = outcome(lambda: sorted(staticmethod(len).__dict__))
r['an_attribute_stored_and_deleted'] = [outcome(lambda: stored_then_deleted(classmethod)),
                                        outcome(lambda: stored_then_deleted(staticmethod))]
r['func_stays_out_of_it'] = [outcome(lambda: '__func__' in classmethod(f).__dict__),
                             outcome(lambda: classmethod(f).__func__ is f)]

STORED = (['__doc__', '__module__', '__name__', '__qualname__', 'x'],
          ['__doc__', '__module__', '__name__', '__qualname__'], False)
EXPECTED = {
    'what_classmethod_copies': EXPECTED_F,
    'what_staticmethod_copies': EXPECTED_F,
    'a_callable_without_a_docstring': None,
    'a_builtin_callable': ['__doc__', '__module__', '__name__', '__qualname__'],
    'an_attribute_stored_and_deleted': [STORED, STORED],
    'func_stays_out_of_it': [False, True],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        ok = r[key] == EXPECTED[key]
        print('%-32s %s' % (key, 'OK' if ok else 'FAIL'))
        if not ok:
            print('    got  %r' % (r[key],))
            print('    want %r' % (EXPECTED[key],))
    print(SUMMARY)
