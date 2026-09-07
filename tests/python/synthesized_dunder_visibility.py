"""A dunder Grail synthesizes as a default is not an attribute CPython has.

`object` installs default `__enter__` / `__exit__` / `__aenter__` /
`__aexit__` / `__iter__` / `__contains__`, and `PythonInstance` installs
default `__next__` / `__getitem__` / `__setitem__` / `__delitem__`.  Every
one is a method whose whole body raises the TypeError CPython's
interpreter would have raised -- which is exactly what makes `with obj:`
on a non-manager say the right thing.

Useful as SMALLTALK methods, and invisible to Python: CPython's `object`
has none of them, so reading one off a type that does not define it is an
AttributeError.  Grail answered a function, and the cost was not
cosmetic.  The standard way to ask "is this a context manager" is to read
the dunder off the TYPE and catch AttributeError -- `contextlib`'s
`ExitStack.push` does precisely that to tell a manager from a plain
callback -- so the probe answered yes for everything and `push()`
registered functions as context managers.

Both halves are asserted here: the attribute is gone, and the Smalltalk
defaults still produce CPython's messages for `with`, `for` and
subscripting.

Every expectation was checked against CPython 3.14 first.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


def _reads(fn):
    try:
        fn()
        return 'ok'
    except AttributeError:
        return 'AttributeError'


def _outcome(fn):
    try:
        return ('ok', fn())
    except BaseException as exc:
        return (type(exc).__name__, str(exc))


def plain_function():
    pass


class Bare:
    pass


class LacksExit:
    def __enter__(self):
        return self


class HasExit:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False


class SubHasExit(HasExit):
    pass


class HasAexit:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_value, traceback):
        return False


class HasItems:
    def __getitem__(self, key):
        return key

    def __iter__(self):
        return iter([])


class AssignedAtRuntime:
    pass


AssignedAtRuntime.__exit__ = lambda self, t, v, tb: False


# --------------------------------------------- the attribute is not there

def _a_class_without_it():
    return (_reads(lambda: LacksExit.__exit__),
            _reads(lambda: Bare.__aexit__),
            _reads(lambda: Bare.__getitem__),
            _reads(lambda: Bare.__next__),
            _reads(lambda: Bare.__contains__))


def _a_plain_function():
    """What ExitStack.push actually asks."""
    return _reads(lambda: type(plain_function).__exit__)


check('a_class_without_it', _a_class_without_it(),
      ('AttributeError',) * 5)
check('a_plain_function', _a_plain_function(), 'AttributeError')


# ------------------------------------------------ a real one still reads

def _a_class_that_defines_it():
    return (_reads(lambda: HasExit.__exit__),
            _reads(lambda: SubHasExit.__exit__),
            _reads(lambda: HasAexit.__aexit__),
            _reads(lambda: HasItems.__getitem__),
            _reads(lambda: HasItems.__iter__))


def _assigned_at_runtime_reads():
    return _reads(lambda: AssignedAtRuntime.__exit__)


def _builtins_still_read():
    return (_reads(lambda: list.__getitem__),
            _reads(lambda: dict.__setitem__),
            _reads(lambda: list.__iter__),
            _reads(lambda: list.__contains__))


def _the_dunders_object_really_has():
    return (_reads(lambda: Bare.__eq__), _reads(lambda: Bare.__hash__),
            _reads(lambda: Bare.__repr__), _reads(lambda: Bare.__str__))


check('a_class_that_defines_it', _a_class_that_defines_it(), ('ok',) * 5)
check('assigned_at_runtime_reads', _assigned_at_runtime_reads(), 'ok')
check('builtins_still_read', _builtins_still_read(), ('ok',) * 4)
check('the_dunders_object_really_has', _the_dunders_object_really_has(),
      ('ok',) * 4)


# ------------------------------ a METACLASS may supply it for the class

def _a_metaclass_supplied_dunder_is_visible():
    """``x in Color`` is EnumType.__contains__, so ``Color.__contains__``
    is a real attribute even though no Enum INSTANCE defines one.  The
    owner test has to look at the metaclass chain as well, or hiding the
    synthesized default hides this too."""
    import enum

    class Color(enum.Enum):
        RED = 1

    return (_reads(lambda: Color.__contains__), Color.RED in Color)


check('a_metaclass_supplied_dunder_is_visible',
      _a_metaclass_supplied_dunder_is_visible(), ('ok', True))

# A HAND-WRITTEN ``class Meta(type)`` is deliberately NOT asserted here.
# Its methods do not reach the Smalltalk metaclass chain at all -- an
# ordinary ``Owned.ordinary()`` works through some other route, but
# ``whichClassIncludesSelector:`` on the metaclass answers the kernel
# Object -- so ``Owned.__contains__`` answered object's DEFAULT before this
# change and raises AttributeError after it.  Both are wrong; CPython
# answers Meta's bound method.  Recorded in docs/Issues.md rather than
# pinned here, because a fixture that asserts either one would be asserting
# a bug.


# ------------------------------- and the statements still say the right thing

def _with_on_a_non_manager():
    def go():
        with LacksExit():
            pass
    kind, message = _outcome(go)
    return (kind, 'does not support the context manager protocol' in message,
            'missed __exit__' in message)


def _for_on_a_non_iterable():
    def go():
        for _ in Bare():
            pass
    kind, message = _outcome(go)
    return (kind, 'is not iterable' in message)


def _subscript_on_a_non_sequence():
    kind, message = _outcome(lambda: Bare()[0])
    return (kind, 'is not subscriptable' in message)


def _a_real_manager_still_works():
    log = []

    class Cm:
        def __enter__(self):
            log.append('enter')
            return self

        def __exit__(self, exc_type, exc_value, traceback):
            log.append('exit')
            return False

    with Cm():
        log.append('body')
    return log


check('with_on_a_non_manager', _with_on_a_non_manager(),
      ('TypeError', True, True))
check('for_on_a_non_iterable', _for_on_a_non_iterable(),
      ('TypeError', True))
check('subscript_on_a_non_sequence', _subscript_on_a_non_sequence(),
      ('TypeError', True))
check('a_real_manager_still_works', _a_real_manager_still_works(),
      ['enter', 'body', 'exit'])


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
