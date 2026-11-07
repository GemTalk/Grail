"""Fixture: a zero-argument ``super()'' in a def that has NO enclosing class.

CPython compiles it and raises at the call, naming the FIRST precondition that
fails (super_precondition_errors.py covers the four and their order):

    def f():      super()   -> RuntimeError: super(): no arguments
    def g(x):     super()   -> RuntimeError: super(): __class__ cell not found
    def h(x): del x; super()-> RuntimeError: super(): arg[0] deleted

The text path has emitted those three raises since the precondition fix.  The
IR path refused the whole family (`CallAst:super-noClass') and fell back to
text.  It now emits the text's arms inside the same shadow probe, so these are
the shapes it has to get right on its own -- including the two that tripped
the first IR emit:

  * a first parameter SPELLED ``self'' (or ``nil'') in a plain function.
    Grail renames such a parameter's Smalltalk temp, and the IR arm asked for
    the renamed temp by the renamed name, which the builder does not know.
  * a nested def, whose OWN parameter list is the one super() consults.

TWO DIVERGENCES ARE PINNED, and both are the text's, shared by the IR path:
a ``super()'' inside a LAMBDA consults the enclosing DEF's parameters rather
than the lambda's, so the two messages come out swapped.
"""

r = {}


def record(key, fn):
    try:
        r[key] = 'NO RAISE: ' + repr(fn())
    except BaseException as exc:          # noqa: BLE001 - the message IS the fixture
        r[key] = type(exc).__name__ + ': ' + str(exc)


def no_params():
    return super()


def one_param(x):
    return super()


def star_only(*args):
    return super()


def deleted(x):
    del x
    return super()


def self_named(self):
    return super()


def self_named_deleted(self):
    del self
    return super()


def nil_named(nil):
    return super()


def keyword_only(*, k):
    return super()


def nested_with_param():
    def inner(y):
        return super()
    return inner(1)


def nested_without_param(x):
    def inner():
        return super()
    return inner()


def nested_deleted():
    def inner(y):
        del y
        return super()
    return inner(1)


def in_comprehension(x):
    return [super() for _ in range(1)]


def caught(x):
    try:
        super()
    except RuntimeError as exc:
        return 'caught: ' + str(exc)


def lambda_without_param(x):
    return (lambda: super())()


def lambda_with_param():
    return (lambda y: super())(1)


record('no_params', no_params)
record('one_param', lambda: one_param(1))
record('star_only', lambda: star_only(1))
record('deleted', lambda: deleted(1))
record('self_named', lambda: self_named(1))
record('self_named_deleted', lambda: self_named_deleted(1))
record('nil_named', lambda: nil_named(1))
record('keyword_only', lambda: keyword_only(k=1))
record('nested_with_param', nested_with_param)
record('nested_without_param', lambda: nested_without_param(1))
record('nested_deleted', nested_deleted)
record('in_comprehension', lambda: in_comprehension(1))
record('caught', lambda: caught(1))
record('lambda_without_param', lambda: lambda_without_param(1))
record('lambda_with_param', lambda_with_param)


NO_ARGS = 'RuntimeError: super(): no arguments'
NO_CELL = 'RuntimeError: super(): __class__ cell not found'
DELETED = 'RuntimeError: super(): arg[0] deleted'

EXPECTED = {
    'no_params': NO_ARGS,
    'one_param': NO_CELL,
    'star_only': NO_ARGS,
    'deleted': DELETED,
    'self_named': NO_CELL,
    'self_named_deleted': DELETED,
    'nil_named': NO_CELL,
    'keyword_only': NO_ARGS,
    'nested_with_param': NO_CELL,
    'nested_without_param': NO_ARGS,
    'nested_deleted': DELETED,
    'in_comprehension': NO_CELL,
    'caught': "NO RAISE: 'caught: super(): __class__ cell not found'",
}

# Grail's answers (both paths), so a fix shows up as an XPASS.
XFAIL = {
    'lambda_without_param': NO_CELL,
    'lambda_with_param': NO_ARGS,
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-22s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for key, grail in XFAIL.items():
        actual = r[key]
        print('%-5s %-22s -> %r' % ('XFAIL' if actual != grail else 'XPASS',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED) - set(XFAIL)):
        print('%-5s %-22s is in neither table' % ('FAIL', extra))
