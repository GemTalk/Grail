"""Fixture for functools.reduce, functools.cmp_to_key's arity checks, and the
rule that decides whether a callable stored as a CLASS ATTRIBUTE binds self.

A module fixture rather than an eval: string because the binding cases define
classes, and eval-path class statements are a known Grail limitation.
"""

import functools

reduce = functools.reduce


def add(x, y):
    return x + y


def _attempt(fn):
    """Answer the value, or the exception's type name."""
    try:
        return fn()
    except Exception as e:
        return type(e).__name__


# --- reduce -----------------------------------------------------------------

def reduce_basic():
    return [reduce(add, ['a', 'b', 'c'], ''),
            reduce(add, [1, 2, 3]),
            reduce(add, [], 42),
            reduce(lambda x, y: x * y, range(2, 8), 1)]


def reduce_empty_without_initial():
    """CPython raises TypeError here.  Grail seeded the accumulator with an
    unguarded first __next__, so the StopIteration escaped instead -- an
    exception Python code does not expect from reduce() and cannot act on."""
    return _attempt(lambda: reduce(add, []))


def reduce_single_item_never_calls_the_function():
    """``reduce(42, "1")'' answers '1'.  42 is not callable, which is the
    point: with one item the function is never reached."""
    return reduce(42, "1")


def reduce_initial_as_keyword():
    return reduce(add, ['a', 'b'], initial='')


def reduce_argument_count_errors():
    return [_attempt(lambda: reduce()),
            _attempt(lambda: reduce(add)),
            _attempt(lambda: reduce(add, [1], 2, 3))]


def reduce_rejects_a_non_iterable():
    return _attempt(lambda: reduce(add, object()))


def reduce_propagates_an_iteration_error():
    """An exception from __iter__ is the caller's, not something to convert."""
    class FailingIter:
        def __iter__(self):
            raise RuntimeError('boom')
    return _attempt(lambda: reduce(add, FailingIter()))


# --- cmp_to_key arity -------------------------------------------------------

def _cmp(x, y):
    return (x > y) - (x < y)


def cmp_to_key_argument_count_errors():
    """Too FEW was already rejected; too many was accepted silently, ignoring
    everything past the first argument."""
    key = functools.cmp_to_key(_cmp)
    return [_attempt(lambda: functools.cmp_to_key()),
            _attempt(lambda: functools.cmp_to_key(_cmp, None)),
            _attempt(lambda: key()),
            _attempt(lambda: key(None, None))]


# --- class-attribute binding ------------------------------------------------

def toplevel(self, x):
    """A plain Python function.  Stored in a class dict it IS a descriptor, so
    reading it through an instance binds self."""
    return ('bound', x)


def _holder_with_builtin():
    """A class carrying a Grail-NATIVE function -- one implemented in
    Smalltalk, the counterpart of a CPython builtin.  A builtin is not a
    descriptor and must NOT bind self; CPython's own test suite relies on the
    difference, writing ``cmp_to_key = c_functools.cmp_to_key'' bare where the
    pure-Python variant needs ``staticmethod(py_functools.cmp_to_key)''.

    Stored at RUNTIME rather than in the class body.  Those are two different
    stores in Grail and only this one reaches the descriptor-binding path --
    an unconditional class-body binding never bound in the first place.
    (A conditional class-body binding, which is how CPython's test file writes
    it, lands here too, but does not survive a re-import once the class has
    been canonically registered -- a separate gap, and not one to build a test
    on.)"""
    class Holder:
        pass
    Holder.native = functools.cmp_to_key
    return Holder


def builtin_class_attribute_does_not_bind():
    """Bound, the wrapped ``mycmp'' became the INSTANCE and every comparison
    tried to call it."""
    holder = _holder_with_builtin()()
    key = holder.native(_cmp)
    return [key(3) == key(3), key(3) > key(1), key(1) < key(3)]


def builtin_class_attribute_via_the_class():
    """The same read through the class was always fine -- the asymmetry is
    what made this hard to see."""
    key = _holder_with_builtin().native(_cmp)
    return [key(3) == key(3), key(3) > key(1)]


def python_function_class_attribute_still_binds():
    """The other half of the rule: a plain Python function stored the same way
    IS a descriptor and must still bind, so narrowing this could not be done by
    dropping the binding wholesale."""
    class Holder:
        pass
    Holder.meth = toplevel
    return Holder().meth(7)
