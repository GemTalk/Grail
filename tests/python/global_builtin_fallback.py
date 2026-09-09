"""One ``global`` statement used to poison a builtin for a WHOLE MODULE.

``global all`` promotes ``all`` to a module-scope name -- which is exactly
what CPython does too, and is not the bug.  The bug was what happened on
a READ before anything was assigned: CPython's LOAD_GLOBAL searches the
module globals and then BUILTINS before raising, and Grail's fallback
knew only about names INJECTED at run time
(``builtins.__dict__[name] = value``, which is how gettext.install()
publishes ``_``).  A real builtin like ``all`` was not found, so the read
raised NameError.

The blast radius is the module, not the function.  Once any function
declares ``global all``, every read of ``all`` in the file compiles to a
module attribute load -- including reads in functions that never
mentioned it, and in lambdas:

    def shadow():
        global all
        all = lambda x: 'x'

    def plain_read():
        return all([1, 1])       # NameError, before this

Reading a name you intend to shadow before assigning it is the ordinary
save-and-restore idiom, so this was a live trap rather than a test
artifact.

The other half of the fixture is the GATE.  Grail's builtins class is
also its implementation namespace, so an ungated fallback would resolve
names CPython does not have -- an undefined ``instance`` would come back
as a bound method instead of raising.  Resolution is restricted to
CPython's builtins namespace, and the undefined-name checks here are what
hold that line.

Every expectation was checked against CPython 3.14 first.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


def _outcome(fn):
    try:
        return ('ok', fn())
    except Exception as exc:
        return (type(exc).__name__, str(exc))


# ------------------------------------------------------------------
# ``all``, ``any`` and ``sorted`` are module-scope names in this file
# purely because these functions declare them global.  That is the whole
# setup: everything below reads them from module scope.

def _shadow_all():
    global all
    saved = all
    try:
        all = lambda x: 'shadowed'
        return all([0])
    finally:
        all = saved


def _shadow_any():
    global any
    saved = any
    try:
        any = lambda x: 'shadowed'
        return any([1])
    finally:
        any = saved


def _sorted_save_and_restore():
    global sorted
    saved = sorted
    try:
        sorted = lambda x: 'fake'
        return sorted([3, 1])
    finally:
        sorted = saved


def _read_without_declaring():
    """Never says ``global`` -- but ``all`` is module-scope for the file."""
    return all([1, 1])


def _read_after_restore():
    return sorted([3, 1])


def _read_in_a_lambda():
    return (lambda: any([0, 1]))()


def _declared_but_never_assigned():
    global len
    return len('abcd')


def _identity_is_stable():
    """The wrap is cached, so a builtin read twice is the same object."""
    global zip
    return zip is zip


def _a_builtin_class_resolves_too():
    global TypeError
    return TypeError.__name__


check('shadow_all', _shadow_all(), 'shadowed')
check('shadow_any', _shadow_any(), 'shadowed')
check('sorted_save_and_restore', _sorted_save_and_restore(), 'fake')
check('read_without_declaring', _read_without_declaring(), True)
check('read_after_restore', _read_after_restore(), [1, 3])
check('read_in_a_lambda', _read_in_a_lambda(), True)
check('declared_but_never_assigned', _declared_but_never_assigned(), 4)
check('identity_is_stable', _identity_is_stable(), True)
check('a_builtin_class_resolves_too', _a_builtin_class_resolves_too(),
      'TypeError')


# ------------------------------------------------------------------
# The gate: a name that is NOT in CPython's builtins namespace must
# still raise, whether or not it was declared global.

def _undefined_plain():
    return no_such_name_at_all            # noqa: F821


def _undefined_declared_global():
    global also_undefined
    return also_undefined                 # noqa: F821


def _implementation_name_does_not_leak():
    """``instance`` is a real selector on Grail's builtins class."""
    global instance
    return instance                       # noqa: F821


def _another_implementation_name():
    global new
    return new                            # noqa: F821


check('undefined_plain', _outcome(_undefined_plain),
      ('NameError', "name 'no_such_name_at_all' is not defined"))
check('undefined_declared_global', _outcome(_undefined_declared_global),
      ('NameError', "name 'also_undefined' is not defined"))
check('implementation_name_does_not_leak',
      _outcome(_implementation_name_does_not_leak),
      ('NameError', "name 'instance' is not defined"))
check('another_implementation_name', _outcome(_another_implementation_name),
      ('NameError', "name 'new' is not defined"))


# ------------------------------------------------------------------
# The regression half: an ordinary (undeclared) builtin call still works,
# and a module global that IS assigned still shadows the builtin.

MODULE_LEVEL_LIST = [3, 1, 2]
min = 'a module global that shadows the builtin'


def _ordinary_builtin_call():
    return (len(MODULE_LEVEL_LIST), max(MODULE_LEVEL_LIST))


def _assigned_module_global_wins():
    return min


check('ordinary_builtin_call', _ordinary_builtin_call(), (3, 3))
check('assigned_module_global_wins', _assigned_module_global_wins(),
      'a module global that shadows the builtin')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
