"""Fixture for callable() across the shapes Grail's call protocol takes, and
for deepcopy of an object that implements the pickle protocol.

A module fixture rather than an eval: string because the cases define classes,
and eval-path class statements are a known Grail limitation.
"""

import copy
import functools
import sys


def capture(*args, **kw):
    return args, kw


def plain_function():
    return 'plain'


class NoCall:
    pass


class CallNoArgs:
    def __call__(self):
        return 'no-args'


class CallOneArg:
    def __call__(self, x):
        return ('one-arg', x)


class CallVarargs:
    def __call__(self, *args, **kw):
        return ('varargs', args, kw)


# --- callable() -------------------------------------------------------------

def callable_across_kinds():
    """``def __call__'' compiles to a selector whose shape depends on its
    ARITY, and only the one-argument form was probed -- so an instance of a
    class defining the ordinary ``__call__(self)'' reported False while
    calling it worked.  partial has no __call__ at all (it implements the
    call protocol directly) and reported False too, which is the first thing
    test_functools' test_basic_examples asserts."""
    items = [
        NoCall(),
        CallNoArgs(), CallOneArg(), CallVarargs(),
        functools.partial(capture, 1),
        functools.lru_cache(None)(plain_function),
        plain_function, lambda: 1, NoCall,
        5, 'x', None, [1], {}, (1,), sys,
    ]
    return [callable(x) for x in items]


def callables_still_call():
    """Guard: whatever callable() now says True for must actually run."""
    return [CallNoArgs()(),
            CallOneArg()(7),
            CallVarargs()(1, k=2),
            functools.partial(capture, 1)(2)]


# --- deepcopy ---------------------------------------------------------------

def deepcopy_partial():
    """CPython deep-copies a partial through its __reduce__.  Grail treated
    every unrecognised object as an ATOM, so deepcopy handed back the very
    same partial and every ``assertIsNot'' in test_deepcopy failed."""
    f = functools.partial(capture, ['asdf'], bar=[True])
    f.attr = []
    g = copy.deepcopy(f)
    return [g is not f,
            g.attr is not f.attr,
            g.args is not f.args,
            g.args[0] is not f.args[0],
            g.keywords is not f.keywords,
            g.keywords['bar'] is not f.keywords['bar']]


def deepcopy_partial_keeps_behaviour():
    """A copy that no longer computes the same thing would be worse than an
    alias, so check the reconstruction, not just the identities."""
    f = functools.partial(capture, 1, a=2)
    g = copy.deepcopy(f)
    return [g(3, b=4) == f(3, b=4), g(3, b=4)[0] == (1, 3)]


def deepcopy_leaves_atoms_alone():
    """Immutables are still returned as themselves -- the reduce branch must
    not start rebuilding ints and strings."""
    for v in (5, 'x', None, (1, 2)):
        if copy.deepcopy(v) is not v:
            return 'copied ' + repr(v)
    return 'atoms shared'


def deepcopy_still_recurses_containers():
    """Guard on the branches that already worked."""
    src = {'a': [1, [2]], 'b': {'c': [3]}}
    dst = copy.deepcopy(src)
    return [dst == src,
            dst is not src,
            dst['a'] is not src['a'],
            dst['a'][1] is not src['a'][1],
            dst['b']['c'] is not src['b']['c']]


def partial_over_partial_no_longer_raises():
    """partialmethod wrapping a partial: the inner partial is invoked through
    the INDIRECT call protocol, where object's implementation used to raise
    ``'functools_partial' object is not callable''.

    Asserts only that the call REACHES the partial.  The argument order it
    produces is still wrong -- CPython answers ((instance, 7, 8), {'c': 6})
    and Grail answers ((8, 7), {'c': 6}), because partialmethod does not bind
    the receiver.  That is the separate TestPartialMethod cluster; pinning
    CPython's answer here would just be a second red test for it."""
    class A:
        over = functools.partialmethod(functools.partial(capture, c=6), 7)
    try:
        result = A().over(8)
    except TypeError as e:
        return 'TypeError: ' + str(e)
    return 'called, keywords=' + repr(result[1])
