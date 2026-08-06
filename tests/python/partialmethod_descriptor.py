"""Fixture for functools.partialmethod as a real descriptor class.

A module fixture rather than an eval: string because the cases define classes,
and eval-path class statements are a known Grail limitation.
"""

import functools


def capture(*args, **kw):
    return args, kw


class A:
    nothing = functools.partialmethod(capture)
    positional = functools.partialmethod(capture, 1)
    keywords = functools.partialmethod(capture, a=2)
    both = functools.partialmethod(capture, 3, b=4)
    spec_keywords = functools.partialmethod(capture, self=1, func=2)
    nested = functools.partialmethod(positional, 5)
    over_partial = functools.partialmethod(functools.partial(capture, c=6), 7)


a = A()


def _shape(result):
    """(args, sorted keyword names) with the receiver rendered as 'a', so the
    expected value can be written literally in the test."""
    args, kw = result
    return (tuple('a' if v is a else v for v in args), sorted(kw.items()))


# --- the receiver is bound ---------------------------------------------------

def bound_through_an_instance():
    """The whole point: reading the attribute off an INSTANCE binds the
    receiver, so CPython's leading ``self'' is there.  The old closure was
    invoked unbound and the receiver was simply missing -- ``((), {})'' where
    CPython answers ``((a,), {})''."""
    return [_shape(a.nothing()),
            _shape(a.nothing(5)),
            _shape(a.nothing(c=6)),
            _shape(a.positional()),
            _shape(a.positional(5)),
            _shape(a.both(5, c=6))]


def unbound_through_the_class():
    """Read through the CLASS, the caller passes the receiver explicitly in
    the same leading slot -- one call shape serves both paths."""
    return [_shape(A.both(a, 5, c=6)), _shape(A.keywords(a, a=3))]


def keywords_override_the_bound_ones():
    return [_shape(a.keywords()), _shape(a.keywords(a=3))]


def keyword_named_self_or_func_is_just_a_keyword():
    """``partialmethod(capture, self=1, func=2)'': CPython takes func
    positionally, so these are ordinary bound keywords and do not collide with
    the descriptor's own parameter names."""
    return _shape(a.spec_keywords())


def nested_partialmethod_flattens():
    """partialmethod over a partialmethod adopts the inner target, and the
    INNER bound args come first."""
    return [_shape(a.nested()),
            _shape(a.nested(6)),
            _shape(a.nested(6, d=7)),
            _shape(A.nested(a, 6, d=7))]


def partialmethod_over_a_partial():
    """The target may be a partial, whose own keywords merge in."""
    return [_shape(a.over_partial()),
            _shape(a.over_partial(5)),
            _shape(a.over_partial(5, d=8)),
            _shape(A.over_partial(a, 5, d=8))]


# --- construction and introspection -----------------------------------------

def invalid_construction():
    """All three are TypeErrors in CPython, checked at CONSTRUCTION so the
    class body raises rather than something failing later at call time.
    ``func=capture'' is a keyword, not the positional target."""
    out = []
    for label, fn in (('not-callable', lambda: functools.partialmethod(None, 1)),
                      ('no-target', lambda: functools.partialmethod()),
                      ('target-by-keyword',
                       lambda: functools.partialmethod(func=capture, a=1))):
        try:
            fn()
            out.append(label + ':no-error')
        except TypeError:
            out.append(label + ':TypeError')
    return out


def reprs():
    """``functools.partialmethod(<target>, 3, b=4)''.  A closure had no repr
    of its own, so this printed as a bare Grail object."""
    v = vars(A)
    return [repr(v['nothing']), repr(v['positional']),
            repr(v['keywords']), repr(v['both'])]


def attributes():
    v = vars(A)
    pm = v['both']
    return [pm.func is capture, list(pm.args), sorted(pm.keywords.items())]


def not_abstract_by_default():
    """__isabstractmethod__ must answer False rather than raise -- abc reads it
    with getattr on every class-body entry."""
    v = vars(A)
    return [getattr(v['both'], '__isabstractmethod__', 'ABSENT'),
            getattr(v['nested'], '__isabstractmethod__', 'ABSENT')]


def subclassable():
    """A closure cannot be subclassed at all; the class can.  __get__ is
    exercised explicitly, the way CPython's test does."""
    class Sub(functools.partialmethod):
        pass
    p = functools.partialmethod(capture, 2)
    p2 = Sub(p, 1)
    return [isinstance(p2, functools.partialmethod),
            p2.func is capture,
            list(p2.args),
            _shape(p2.__get__(a)())]


def abstract_partialmethod_stays_abstract():
    """A partialmethod over an @abc.abstractmethod reports abstract; one over an
    ordinary method does not.

    The abstract case is not obvious.  ``add5 = functools.partialmethod(add, 5)''
    in a class body captures a FORWARD REFERENCE -- a BoundMethod whose receiver
    is nil, because the class does not exist yet -- while @abc.abstractmethod
    stamped the INTERNED UnboundMethod that the decorator received.  The two
    handles disagree, so abstractness has to be resolved through the METHOD
    (owner + selector), not through whichever handle was captured.
    """
    import abc

    class Host:
        @abc.abstractmethod
        def add(self, x, y):
            pass

        def plain(self, x, y):
            pass

        add5 = functools.partialmethod(add, 5)
        plain5 = functools.partialmethod(plain, 5)

    return [Host.add5.__isabstractmethod__, Host.plain5.__isabstractmethod__]
