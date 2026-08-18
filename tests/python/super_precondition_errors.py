"""Fixture: which precondition a zero-argument ``super()'' says was missing.

``super()'' with no arguments does not guess.  CPython's
super_init_without_args inspects the RUNNING FRAME and reports the FIRST of
four preconditions that fails:

    1. the code object takes no positional arguments -> "no arguments"
    2. positional argument 0 exists but its slot is NULL -> "arg[0] deleted"
    3. __class__ is not a free variable -> "__class__ cell not found"
    4. the cell is there but empty -> "empty __class__ cell"

The ORDER is the part worth pinning, and it is why every check below asserts
the MESSAGE rather than just RuntimeError.  Both argument checks run before the
class cell is consulted at all, so ``def f(x): del x: super()'' -- which has
neither a live argument nor a class -- reports the deletion, not the missing
cell.  A reading that got the order backwards would raise the same exception
type and still be wrong.

Grail answered "no arguments" for all four, which names the wrong precondition
for three of them: ``def h(x): super()'' HAS an argument and lacks a class, and
``nonlocal __class__; del __class__'' left the cell alone entirely -- the delete
compiled to a fresh local temp nobody read, so the following ``super()'' handed
back a working proxy.  That is test_super's test_obscure_super_errors.

WHAT ``del __class__'' ACTUALLY DELETES is the reason it is more than a message
fix.  ``__class__'' is a cell every method of the class SHARES, so emptying it
is visible from methods that did no deleting and on every later call --
asserted below rather than described, because a per-frame reading of the
statement would pass the single-call check and fail those two.

The bare-read half is a separate answer from the same state: CPython gives
``__class__'' after a delete a NameError about an unbound FREE variable (the
closure form), not the UnboundLocalError a deleted local would get.  So the two
reads of one empty cell produce two different exceptions, and both are checked.

``comprehension_still_works'' and ``shadowed_super_wins'' are guards.  The first
is live: comprehensions inline into their enclosing function in 3.12+, so a
``super()'' inside one is served by the METHOD's frame and must keep working --
a precondition check that consulted the comprehension's own scope would find no
parameters and reject it.  The second is the rule that a replacement ``super''
installed on the module takes the call even where the builtin would have
refused it; raising past the probe would make patching work only for the calls
that were going to succeed anyway.
"""

r = {}


def probe(key, fn):
    try:
        r[key] = 'NO RAISE: ' + repr(fn())
    except BaseException as exc:          # noqa: BLE001 - the message IS the fixture
        r[key] = type(exc).__name__ + ': ' + str(exc)


# --- 1. no positional parameters at all ---------------------------------------
def no_params():
    super()


probe('no_args_plain_function', no_params)


def star_args_only(*args):
    # ``*args'' does not count: CPython's check is on co_argcount, which counts
    # positionals only.  So this is precondition 1, not 2.
    super()


probe('star_args_only', lambda: star_args_only(1, 2))


class ZeroParamMethod:
    def f():
        super()


probe('no_args_zero_param_method', ZeroParamMethod.f)


# --- 2. argument 0 deleted, which OUTRANKS the missing cell -------------------
def arg_deleted(x):
    del x
    super()


probe('arg0_deleted', lambda: arg_deleted(None))


# --- 3. argument present, but no class anywhere -------------------------------
def arg_present(x):
    super()


probe('arg_present_no_cell', lambda: arg_present(1))


# --- 4. the cell is there and empty -------------------------------------------
class Emptied:
    def wipe(self):
        nonlocal __class__
        del __class__

    def call_super(self):
        super()

    def read_class(self):
        return __class__


_e = Emptied()
probe('cell_before_delete', lambda: _e.read_class() is Emptied)
_e.wipe()
# The delete happened in ``wipe''; these two run in OTHER frames, and later.
probe('empty_class_cell', _e.call_super)
probe('bare_read_after_del', _e.read_class)
probe('empty_cell_again', _e.call_super)


# --- guards -------------------------------------------------------------------
class WithComprehension:
    def f(self):
        # Inlined into this method's frame since 3.12, so the super() here is
        # served by ``self'' and must keep working.
        return [super().__repr__()[:0] + 'ok' for _ in range(1)][0]


probe('comprehension_still_works', WithComprehension().f)


class Nested:
    def m(self):
        def inner():
            # inner's OWN frame has no positional parameter, and it is inner's
            # frame super() reads -- not m's.
            super()
        return inner()


probe('nested_def_zero_params', Nested().m)


class MySuper:
    def __init__(self, *args):
        self.args = args


def shadowed(x):
    # ``super'' is patched on the module AFTER this body compiled, so the name
    # resolves to MySuper at call time and the preconditions never apply.
    return super()


def check_shadow():
    saved = globals().get('super')
    globals()['super'] = MySuper
    try:
        return type(shadowed(1)).__name__
    finally:
        if saved is None:
            del globals()['super']
        else:
            globals()['super'] = saved


probe('shadowed_super_wins', check_shadow)


EXPECTED = {
    'no_args_plain_function': 'RuntimeError: super(): no arguments',
    'star_args_only': 'RuntimeError: super(): no arguments',
    'arg0_deleted': 'RuntimeError: super(): arg[0] deleted',
    'arg_present_no_cell': 'RuntimeError: super(): __class__ cell not found',
    'cell_before_delete': 'NO RAISE: True',
    'empty_class_cell': 'RuntimeError: super(): empty __class__ cell',
    'empty_cell_again': 'RuntimeError: super(): empty __class__ cell',
    'bare_read_after_del':
        "NameError: cannot access free variable '__class__' where it is not "
        'associated with a value in enclosing scope',
    'comprehension_still_works': "NO RAISE: 'ok'",
    'nested_def_zero_params': 'RuntimeError: super(): no arguments',
    'shadowed_super_wins': "NO RAISE: 'MySuper'",
}


# Grail does not yet let a ZERO-PARAMETER function be called through its class.
# ``C.f()'' fetches the function off the class and calls it with nothing, which
# Python 3 has allowed since 3.0; Grail still enforces the Python-2 rule that an
# unbound method needs an instance first, so the call is refused before the
# super() inside it can report anything.  That is a gap in the unbound-method
# call path, not in the preconditions -- the message below comes from a check
# that runs one layer earlier.
XFAIL = {
    'no_args_zero_param_method':
        "TypeError: unbound method 'f' must be called with an instance as the "
        'first argument',
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-28s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for key, grail in XFAIL.items():
        actual = r[key]
        print('%-5s %-28s -> %r' % ('XFAIL' if actual != grail else 'XPASS',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED) - set(XFAIL)):
        print('%-5s %-28s is in neither table' % ('FAIL', extra))
