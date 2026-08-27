"""Fixtures for MissingArgumentMessageTestCase -- the TypeError text raised when
a call leaves required parameters unfilled.

Grail raised from inside the parameter-binding loop, so whichever parameter it
reached first was the entire report: ``f(a, b, c)'' called ``f()'' said
``missing required argument: a'' where CPython names all three, counts them,
and prefixes the function's __qualname__.

Every expectation here was checked against CPython 3.14 by running this file
under it directly.
"""


def _msg(fn, *a, **k):
    try:
        fn(*a, **k)
    except TypeError as e:
        return str(e)
    return "NO ERROR"


def f1(a): pass
def f2(a, b): pass
def f3(a, b, c): pass
def defaulted(a, b=1, c=2): pass
def kwonly1(*, k): pass
def kwonly2(*, k, j): pass
def mixed(a, b, *, k, m): pass
def posonly(a, b, /, c): pass
def starred(a, *rest): pass


class C:
    def m(self, x): pass


class D:
    def __init__(self, x): pass


class E:
    """A class-body method whose signature is not simple positional compiles
    through a different generator -- the varargs forwarder -- which builds its
    own binding loop and had its own copy of the old message."""
    def meth(self, a, b, *, k=0, **rest): pass


def outer():
    def inner(q): pass
    return inner


def kwdefaulted():
    def g(*, k=1, j=2): return (k, j)
    return g


# ------------------------------------------------------------ counting + joining

def one_positional():
    return _msg(f1)


def two_positional():
    """Exactly two are joined by a bare ``and'', with no comma."""
    return _msg(f2)


def three_positional():
    """Three or more take the Oxford comma."""
    return _msg(f3)


def only_the_unfilled_are_named():
    """``c'' is supplied by keyword, so only the other two are missing -- the
    report is not simply ``every parameter without a default''."""
    return _msg(f3, b=2)


def defaults_are_not_required():
    """Only ``a'' has no default, so only ``a'' can go missing."""
    return _msg(defaulted)


def star_args_does_not_excuse_a_required_parameter():
    """``*rest'' absorbs extra arguments; it does not fill ``a''."""
    return _msg(starred)


# ------------------------------------------------------------------ keyword-only

def one_keyword_only():
    return _msg(kwonly1)


def two_keyword_only():
    return _msg(kwonly2)


def positional_outranks_keyword_only():
    """With both kinds missing, CPython reports the POSITIONAL ones alone."""
    return _msg(mixed)


def keyword_only_once_positional_is_satisfied():
    return _msg(mixed, 1, 2)


def deleted_keyword_default_becomes_required():
    """__kwdefaults__ is writable, so a parameter that was declared with a
    default can become required between calls.  Which keyword-only parameters
    are required is therefore a RUNTIME question, not a compile-time one."""
    g = kwdefaulted()
    del g.__kwdefaults__['k']
    return _msg(g)


# -------------------------------------------------------------- positional-only

def positional_only_is_not_fillable_by_keyword():
    """``posonly(c=3)'' fills c; a and b are positional-only (PEP 570), so a
    keyword of those names would go to **kwargs and cannot fill them."""
    return _msg(posonly, c=3)


def positional_only_partially_filled():
    return _msg(posonly, 1)


# -------------------------------------------------------------------- qualnames

def method_is_named_by_qualname():
    return _msg(C().m)


def init_is_named_by_qualname():
    """A missing constructor argument is reported against __init__, not the
    class."""
    return _msg(D)


def nested_function_is_named_by_qualname():
    return _msg(outer())


def varargs_forwarder_method():
    """E.meth's signature sends it through the forwarder generator, whose
    binding loop is a separate copy of the one every other def uses."""
    return _msg(E().meth)


"""Module level, so CPython's __qualname__ for them is the bare ``<lambda>'':
one written inside a function is ``fn.<locals>.<lambda>'', and Grail names every
lambda ``<lambda>'' regardless -- a separate qualname gap, not this one."""
lam_pos = lambda a, b: (a, b)
lam_kw = lambda *, k: k


def lambda_positional():
    return _msg(lam_pos)


def lambda_keyword_only():
    return _msg(lam_kw)


# --------------------------------------------------------------------- ordering

def unexpected_keyword_outranks_missing():
    """CPython validates the CALL before reporting what it could not fill, so a
    bad keyword is named even though ``a'' is also unfilled.

    Asserted as a substring so this test pins the ORDERING alone; the
    wording itself (qualname prefix, quoted name) is pinned by
    tests/python/unexpected_keyword_message.py."""
    return "unexpected keyword argument" in _msg(f1, z=1)


def too_many_positional_outranks_missing():
    return _msg(f2, 1, 2, 3)
