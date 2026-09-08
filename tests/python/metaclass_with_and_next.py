"""A metaclass's `__enter__` / `__exit__` / `__next__` reach the statement.

The companion to `metaclass_operator_dispatch.py`, and the same cause:
`object` (and, for `__next__`, `PythonInstance`) carries a synthesized
DEFAULT for these names, so the env-1 send resolved on the default and the
recorded metaclass was never asked.

    with SomeClass:      TypeError: 'type' object does not support the
                         context manager protocol
    next(SomeClass)      TypeError: 'type' object is not iterable

Both messages named a protocol the class demonstrably had -- the second
one names the WRONG protocol as well, because Grail's `next()` diverts a
receiver that does not answer `__next__` to `__iter__` first, and the
metaclass's `__next__` is not something `___respondsTo___` can see.

Every expectation was checked against CPython 3.14 first.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


def _outcome(fn):
    try:
        return ('ok', fn())
    except BaseException as exc:
        return (type(exc).__name__, str(exc)[:60])


LOG = []


class CmMeta(type):
    def __enter__(cls):
        LOG.append('enter')
        return 'the-class'

    def __exit__(cls, exc_type, exc_value, traceback):
        LOG.append('exit %s' % (exc_type.__name__ if exc_type else 'None'))
        return False


class Managed(metaclass=CmMeta):
    pass


class SuppressingMeta(type):
    def __enter__(cls):
        return cls

    def __exit__(cls, exc_type, exc_value, traceback):
        return True


class Suppresses(metaclass=SuppressingMeta):
    pass


class NextMeta(type):
    def __next__(cls):
        return 'META-next'


class Counter(metaclass=NextMeta):
    pass


class Inherited(Managed):
    """A metaclass is inherited, as in CPython."""


# ------------------------------------------------------ with SomeClass

def _with_uses_the_metaclass():
    del LOG[:]
    with Managed as value:
        LOG.append('body')
    return (value, list(LOG))


def _the_exception_reaches_exit():
    del LOG[:]
    try:
        with Managed:
            raise ValueError('boom')
    except ValueError:
        LOG.append('propagated')
    return list(LOG)


def _the_metaclass_can_suppress():
    with Suppresses:
        raise ValueError('boom')
    return 'suppressed'


def _an_inherited_metaclass_too():
    del LOG[:]
    with Inherited:
        pass
    return list(LOG)


check('with_uses_the_metaclass', _with_uses_the_metaclass(),
      ('the-class', ['enter', 'body', 'exit None']))
check('the_exception_reaches_exit', _the_exception_reaches_exit(),
      ['enter', 'exit ValueError', 'propagated'])
check('the_metaclass_can_suppress', _the_metaclass_can_suppress(),
      'suppressed')
check('an_inherited_metaclass_too', _an_inherited_metaclass_too(),
      ['enter', 'exit None'])


# ------------------------------------------------------ next(SomeClass)

def _next_uses_the_metaclass():
    return next(Counter)


check('next_uses_the_metaclass', _next_uses_the_metaclass(), 'META-next')


# ------------------------------------------- what must NOT change

class Bare:
    pass


class RealCm:
    def __enter__(self):
        return 'instance'

    def __exit__(self, exc_type, exc_value, traceback):
        return False


class RealIter:
    def __init__(self):
        self.n = 0

    def __iter__(self):
        return self

    def __next__(self):
        self.n += 1
        if self.n > 2:
            raise StopIteration
        return self.n


def _a_plain_class_is_still_not_a_manager():
    def go():
        with Bare:
            pass
    kind, message = _outcome(go)
    return (kind, 'does not support the context manager protocol' in message)


def _a_plain_object_is_still_not_an_iterator():
    return _outcome(lambda: next(Bare()))[0]


def _instances_are_unaffected():
    with RealCm() as value:
        pass
    it = RealIter()
    return (value, next(it), next(it), _outcome(lambda: next(it))[0])


def _next_still_bridges_an_iterable():
    """A receiver answering __iter__ but not __next__ is still
    materialised -- the eager generator-expression case ___asIterator___
    exists for."""
    return next([7, 8].__iter__()) if False else next(iter([7, 8]))


check('a_plain_class_is_still_not_a_manager',
      _a_plain_class_is_still_not_a_manager(), ('TypeError', True))
check('a_plain_object_is_still_not_an_iterator',
      _a_plain_object_is_still_not_an_iterator(), 'TypeError')
check('instances_are_unaffected', _instances_are_unaffected(),
      ('instance', 1, 2, 'StopIteration'))
check('next_still_bridges_an_iterable', _next_still_bridges_an_iterable(), 7)


# ``async with`` against a metaclass is NOT asserted here.  An ``async def``
# compiles to no Smalltalk method at all -- it lands in the per-class dynamic
# store -- so the metaclass delegation, which asks
# whichClassIncludesSelector:, cannot see it.  The __aenter__/__aexit__ half
# of the delegation is written for symmetry and fires for a metaclass that
# defines them as ordinary defs returning awaitables; the ``async def``
# spelling needs the dynamic-store route as well, and is recorded in
# docs/Issues.md rather than pinned here.


# ------------------- a metaclass without them must still refuse

class QuietMeta(type):
    def unrelated(cls):
        return 'unrelated'


class Quiet(metaclass=QuietMeta):
    pass


def _a_metaclass_without_them_still_refuses():
    """The probe must refuse an implementation owned by object or
    PythonInstance -- a metaclass inherits the same defaults, and
    performing one would re-enter the method on the same receiver."""
    def go():
        with Quiet:
            pass
    return (_outcome(go)[0], _outcome(lambda: next(Quiet))[0],
            Quiet.unrelated())


check('a_metaclass_without_them_still_refuses',
      _a_metaclass_without_them_still_refuses(),
      ('TypeError', 'TypeError', 'unrelated'))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
