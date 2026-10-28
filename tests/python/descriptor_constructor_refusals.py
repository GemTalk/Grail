"""Fixture: classmethod, staticmethod and property refuse what their signatures do not admit.

CPython's classmethod and staticmethod take exactly one positional argument
and no keyword (Objects/funcobject.c cm_init / sm_init); property takes at most
four, fget/fset/fdel/doc, by position or by name, and Argument Clinic refuses a
fifth, one given both ways and any other keyword.  Grail accepted all of it:
``classmethod(f, x=1)`` dropped the keyword, ``property(x=1)`` and a fifth
positional were ignored, and ``classmethod()`` built a classmethod wrapping
nothing.  The callable is __init__'s to set, as in CPython, so a subclass whose
__init__ does not call the base's wraps None (test_descr's
test_classmethod_new / test_staticmethod_new).

A subclass whose own __init__ takes a keyword still receives it, as in CPython,
and each constructor still takes what its signature names.  Every check here
holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def refusal(call):
    try:
        call()
    except TypeError as exc:
        return str(exc)
    return 'no TypeError'


class InitTakesKeyword(classmethod):
    def __init__(self, function, extra=None):
        super().__init__(function)
        self.extra = extra


class StaticInitTakesKeyword(staticmethod):
    def __init__(self, function, extra=None):
        super().__init__(function)
        self.extra = extra


class PropertyInitTakesKeyword(property):
    def __init__(self, function, extra=None):
        super().__init__(function)
        self.extra = extra


class PlainPropertySubclass(property):
    pass


class InitSkipsSuper(classmethod):
    def __init__(self, function):
        pass


class StaticInitSkipsSuper(staticmethod):
    def __init__(self, function):
        pass


wrapper = classmethod
r['no_keyword_at_all'] = [
    refusal(lambda: classmethod(len, x=1)),
    refusal(lambda: staticmethod(len, x=1)),
    refusal(lambda: classmethod(function=len)),
    refusal(lambda: staticmethod(function=len)),
    refusal(lambda: wrapper(len, x=1)),
]
r['one_positional'] = [
    refusal(lambda: classmethod()),
    refusal(lambda: staticmethod()),
]
r['property_signature'] = [
    refusal(lambda: property(x=1)),
    refusal(lambda: property(1, 2, 3, 4, 5)),
    refusal(lambda: property(fget=1, fset=2, fdel=3, doc=4, x=5)),
    refusal(lambda: property(1, fget=2)),
    refusal(lambda: property(len, fset=None, x=1)),
    refusal(lambda: PlainPropertySubclass(x=1)),
]
r['subclass_init_takes_its_keyword'] = [
    InitTakesKeyword(len, extra=2).extra,
    StaticInitTakesKeyword(len, extra=3).extra,
    PropertyInitTakesKeyword(len, extra=4).extra,
    PropertyInitTakesKeyword(len, extra=4).fget is len,
]
skipped, static_skipped = InitSkipsSuper(len), StaticInitSkipsSuper(len)
r['init_sets_the_callable'] = [
    repr(skipped), skipped.__func__ is None, skipped.__wrapped__ is None,
    repr(static_skipped), static_skipped.__func__ is None,
]
r['signature_still_taken'] = [
    classmethod(len).__func__ is len,
    staticmethod(len).__func__ is len,
    property(fget=len, doc='d').__doc__,
    property(len, None, None, 'e').__doc__,
    property(len, fdel=print).fdel is print,
]

EXPECTED = {
    'no_keyword_at_all': [
        'classmethod() takes no keyword arguments',
        'staticmethod() takes no keyword arguments',
        'classmethod() takes no keyword arguments',
        'staticmethod() takes no keyword arguments',
        'classmethod() takes no keyword arguments',
    ],
    'one_positional': [
        'classmethod expected 1 argument, got 0',
        'staticmethod expected 1 argument, got 0',
    ],
    'property_signature': [
        "property() got an unexpected keyword argument 'x'",
        'property() takes at most 4 arguments (5 given)',
        'property() takes at most 4 keyword arguments (5 given)',
        "argument for property() given by name ('fget') and position (1)",
        "property() got an unexpected keyword argument 'x'",
        "property() got an unexpected keyword argument 'x'",
    ],
    'subclass_init_takes_its_keyword': [2, 3, 4, True],
    'init_sets_the_callable': ['<classmethod(None)>', True, True, '<staticmethod(None)>', True],
    'signature_still_taken': [True, True, 'd', 'e', True],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-32s %-5s -> %r' % (key, 'OK' if actual == EXPECTED[key] else 'FAIL', actual))
    print(SUMMARY)
