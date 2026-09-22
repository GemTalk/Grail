# Subclassing io.StringIO / io.BytesIO did not work at all.
#
# Both build their ENTIRE state in ``__new__'' -- the buffer, the position and
# the closed flag -- and have no ``__init__''.  A subclass with no __init__ of
# its own therefore has to be routed to the inherited __new__, exactly as a
# subclass of tuple / frozenset / bytes / bytearray already was.
#
# Without that routing the construction took the generic path, which PREPENDS
# the class as CPython's implicit-staticmethod ``cls'' argument.  Grail's
# builtin ``__new__:'' classmethods take the VALUE and not a cls, so the two
# conventions collide:
#
#     class A(io.StringIO): pass
#     A.__new__(A).getvalue()     -- answered 'A': the CLASS became the buffer
#     A('x').getvalue()           -- answered None: no buffer was set at all
#
# and every method on such an instance then read nil.  ``A('x').readline()''
# died with an uncatchable Smalltalk MessageNotUnderstood -- nil does not
# understand ``>='' -- which no ``except'' can see.
#
# THE FAILURE LOOKED LIKE SOMETHING ELSE ENTIRELY, which is why it is worth
# recording.  test_builtin's test_input_gh130163 subclasses StringIO and gives
# it a __getattribute__ that re-patches sys.stdout mid-read; the crash was
# blamed on the __getattribute__ interception until a PLAIN subclass with no
# methods at all turned out to fail the same way.
#
# test_builtin's test_input_gh130163.

import io
import sys

r = {}
_real_stdout = sys.stdout


def outcome(fn):
    try:
        return 'ok -> %r' % (fn(),)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


class SubStr(io.StringIO):
    pass


class SubBytes(io.BytesIO):
    pass


class WithInit(io.StringIO):
    def __init__(self, v=''):
        io.StringIO.__init__(self, v)
        self.marker = 'mine'


class WithGetattribute(io.StringIO):
    """The shape test_input_gh130163 uses."""

    def __getattribute__(self, name):
        return io.StringIO.__getattribute__(self, name)


# --- a plain subclass is constructed -----------------------------------------

r['str_getvalue'] = outcome(lambda: SubStr('a\n').getvalue())
r['str_read'] = outcome(lambda: SubStr('b\n').read())
r['str_readline'] = outcome(lambda: SubStr('c\nd\n').readline())
r['str_empty'] = outcome(lambda: SubStr().getvalue())
r['bytes_getvalue'] = outcome(lambda: SubBytes(b'e').getvalue())
r['bytes_empty'] = outcome(lambda: SubBytes().getvalue())

# --- and it behaves like the base --------------------------------------------

r['str_write_then_read'] = outcome(
    lambda: (lambda s: (s.write('zz'), s.getvalue())[1])(SubStr()))
r['str_closed_flag'] = outcome(lambda: SubStr('f').closed)
r['type_is_the_subclass'] = outcome(lambda: type(SubStr('g')).__name__)
r['isinstance_of_base'] = outcome(lambda: isinstance(SubStr('h'), io.StringIO))

# --- the shape the test actually uses ------------------------------------------

r['getattribute_subclass'] = outcome(lambda: WithGetattribute('i\n').readline())


def _gh130163():
    """input() while sys.stdout/stderr/stdin are replaced mid-read."""
    so, se, si = sys.stdout, sys.stderr, sys.stdin
    patch = [False]

    class X(io.StringIO):
        def __getattribute__(self, name):
            if patch[0]:
                patch[0] = False
                sys.stdout = X()
                sys.stderr = X()
                sys.stdin = X('input\n')
            return io.StringIO.__getattribute__(self, name)

    try:
        sys.stdout = X()
        sys.stderr = X()
        sys.stdin = X('input\n')
        patch[0] = True
        return input()
    finally:
        sys.stdout, sys.stderr, sys.stdin = so, se, si


r['gh130163'] = outcome(_gh130163)

# --- controls ------------------------------------------------------------------
#
# The routing must not disturb the base classes, and a subclass that DOES
# define __init__ keeps absorbing its own arguments.

r['plain_stringio'] = outcome(lambda: io.StringIO('j\n').getvalue())
r['plain_bytesio'] = outcome(lambda: io.BytesIO(b'k').getvalue())
r['subclass_with_init'] = outcome(
    lambda: (lambda s: (s.getvalue(), s.marker))(WithInit('l\n')))
# NOT TESTED HERE: CPython's StringIO takes a second ``newline'' argument and
# Grail's takes only the initial value, so the two disagree about what a
# two-argument call means -- CPython validates the newline, Grail refuses the
# arity.  That is a separate gap in io, not in the construction routing this
# fixture is about.
r['one_argument_is_enough'] = outcome(lambda: SubStr('m').getvalue())

EXPECTED = {
    'bytes_empty': "ok -> b''",
    'bytes_getvalue': "ok -> b'e'",
    'getattribute_subclass': "ok -> 'i\\n'",
    'gh130163': "ok -> 'input'",
    'isinstance_of_base': 'ok -> True',
    'one_argument_is_enough': "ok -> 'm'",
    'plain_bytesio': "ok -> b'k'",
    'plain_stringio': "ok -> 'j\\n'",
    'str_closed_flag': 'ok -> False',
    'str_empty': "ok -> ''",
    'str_getvalue': "ok -> 'a\\n'",
    'str_read': "ok -> 'b\\n'",
    'str_readline': "ok -> 'c\\n'",
    'str_write_then_read': "ok -> 'zz'",
    'subclass_with_init': "ok -> ('l\\n', 'mine')",
    'type_is_the_subclass': "ok -> 'SubStr'",
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-26s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual), file=_real_stdout)
