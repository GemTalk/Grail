"""Fixture: staticmethod and classmethod name themselves as CPython's built-in types do.

CPython's staticmethod and classmethod are built-in types: __module__
'builtins', so ``staticmethod[int]`` reprs as ``staticmethod[int]``, while an
instance forwards __module__, __name__ and __qualname__ from the function it
wraps, and a Python subclass names itself.  Grail's ``staticmethod.__module__``
read the instances' forwarding method off the class and answered a FUNCTION,
and every subclass reported the base's name.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def function():
    pass


class SubStatic(staticmethod):
    pass


class SubClass(classmethod):
    pass


sm, cm = staticmethod(function), classmethod(function)
r['types'] = [staticmethod.__module__, classmethod.__module__, staticmethod.__name__,
              classmethod.__qualname__, repr(staticmethod), repr(classmethod)]
r['aliases'] = [repr(staticmethod[int]), repr(classmethod[str])]
r['instances'] = [type(sm).__name__, type(cm).__module__, sm.__module__ == __name__,
                  sm.__name__, cm.__qualname__]
r['subclasses'] = [SubStatic.__name__, SubClass.__qualname__, SubStatic.__module__ == __name__,
                   type(SubStatic(function)).__name__]

EXPECTED = {
    'types': ['builtins', 'builtins', 'staticmethod', 'classmethod',
              "<class 'staticmethod'>", "<class 'classmethod'>"],
    'aliases': ['staticmethod[int]', 'classmethod[str]'],
    'instances': ['staticmethod', 'builtins', True, 'function', 'function'],
    'subclasses': ['SubStatic', 'SubClass', True, 'SubStatic'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-12s %-5s -> %r' % (key, 'OK' if actual == EXPECTED[key] else 'FAIL', actual))
    print(SUMMARY)
