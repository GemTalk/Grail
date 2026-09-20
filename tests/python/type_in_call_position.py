"""Fixture: ``type(...)`` at an arity the call fast path does not claim.

``type`` is special twice over.  Read as a VALUE it must be the CLASS, not the
BoundMethod wrapper every other builtin read answers, because Python code
compares and inherits from it -- ``isinstance(x, type)``, ``class M(type)``.
Called with one or three arguments it takes a fast path of its own.

EVERY OTHER ARITY falls through to the ordinary call, and there the name sits in
the FUNCTION POSITION of a CallAst.  ``isFastPathBuiltinName`` answers false
there by design -- CallAst has already decided how to emit the call, so the name
must not be wrapped -- and the IR path read that ``false`` as ``refuse'', while
the text simply emits the bare identifier ``type`` and lets the call spell
itself.

SO THE SHAPES BELOW WERE NOT A MISSING FEATURE.  Both paths already answered the
same thing for all of them; the IR path just reached that answer by falling back
to text.  What the cut changes is eligibility, not behaviour -- which is why the
test that guards it is a census assertion.

MOST OF THESE DISAGREE WITH CPYTHON, on both paths, and they are XFAILs here.
Grail's ``type()`` accepts arities CPython rejects and words its TypeErrors
differently; ``type('A', [], {})`` builds a class where CPython insists the
bases be a tuple.  None of that is this cut's -- it is the same before and after
-- and pinning it means a later fix has to come to this file.

Everything here is verified against real CPython by running the file directly.
"""

r = {}


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = '%s: %s' % (type(exc).__name__, exc)


class H:
    def one_arg(self):
        return type(3).__name__

    def three_args(self):
        t = type('NewClass', (object,), {})
        return t.__name__, isinstance(t, type)

    def type_as_a_value(self):
        f = type
        return f(3).__name__

    def type_as_a_base(self):
        class M(type):
            pass
        return M.__name__

    def no_args(self):
        # Reported by NAME, never by repr: Grail answers the type class here
        # and its repr carries an address, which no fixture can pin.
        return 'no raise: %s' % type().__name__

    def two_args(self):
        return type('A', ()).__name__

    def four_args(self):
        return type('A', (), {}, ()).__name__

    def a_keyword(self):
        return type('A', (), dict={}).__name__

    def all_keywords(self):
        return type(name='NewClass', bases=(object,), dict={}).__name__

    def extra_keyword(self):
        return type('a', (), {}, x=5).__name__

    def a_list_for_bases(self):
        return type('A', [], {}).__name__


h = H()
for _k in ('one_arg', 'three_args', 'type_as_a_value', 'type_as_a_base',
           'no_args', 'two_args', 'four_args', 'a_keyword', 'all_keywords',
           'extra_keyword', 'a_list_for_bases'):
    record(_k, getattr(h, _k))


# Grail accepts arities CPython rejects, and words its TypeErrors differently.
XFAIL = {'no_args', 'two_args', 'four_args', 'a_keyword', 'all_keywords',
         'extra_keyword', 'a_list_for_bases'}


EXPECTED = {
    'one_arg': 'int',
    'three_args': ('NewClass', True),
    'type_as_a_value': 'int',
    'type_as_a_base': 'M',
    'no_args': 'TypeError: type() takes 1 or 3 arguments',
    'two_args': 'TypeError: type() takes 1 or 3 arguments',
    'four_args': 'TypeError: type() takes 1 or 3 arguments',
    'a_keyword': 'TypeError: type() takes 1 or 3 arguments',
    'all_keywords': 'TypeError: type() takes 1 or 3 arguments',
    'extra_keyword': 'TypeError: a.__init_subclass__() takes no keyword arguments',
    'a_list_for_bases': 'TypeError: type.__new__() argument 2 must be tuple, not list',
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        actual = r[key]
        if key in XFAIL:
            # EXPECTED holds CPython's answer, so this agrees HERE and differs
            # under Grail -- XFAIL either way, never XPASS.
            status = 'XFAIL' if actual == EXPECTED[key] else 'FAIL'
        else:
            status = 'OK' if actual == EXPECTED[key] else 'FAIL'
        print('%-5s %-20s -> %r' % (status, key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-20s is not in EXPECTED' % ('FAIL', extra))
