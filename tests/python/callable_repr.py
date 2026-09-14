"""A callable's repr has to say WHICH callable it is.

Every callable printed as `<BoundMethod object at 0x...>` or
`<function object at 0x...>` -- no name, and a type label that is not even a
CPython type. `__name__` and `__qualname__` were already correct, so the
information was there; nothing read it.

CPython has five forms, and which one you get depends on what the callable
IS, not just on its class:

    <function modfunc at 0x...>
    <bound method K.meth of <mod.K object at 0x...>>
    <built-in function hash>
    <built-in method append of list object at 0x...>
    <method 'items' of 'dict' objects>

A @staticmethod AND A @classmethod ARE ONE THING AT RUNTIME in Grail -- both
compile onto the metaclass, so both reach the repr as a callable whose receiver
is the class. CPython prints them differently (a staticmethod is bound to
nothing, so it is a plain function), and the only thing that still knows which
is which is the COMPILER. It now records the staticmethods in a class-side
`___staticMethodNames___` table, which is what the last of the nine shapes
below reads.

Addresses and module names vary per run, so the checks below pin the SHAPE --
prefix, suffix and the name in the middle -- rather than a literal string,
except where the whole repr is address-free and can be compared exactly.
"""

import re

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


def modfunc(x):
    return x


lam = lambda q: q


class K:
    def meth(self):
        pass

    @classmethod
    def cm(cls):
        pass

    @staticmethod
    def sm():
        pass


class SubK(K):
    """An INHERITED @staticmethod still has to read as one."""


class Aliased:
    def real(self):
        return 'r'
    alias = real


# ------------------------------------------- a plain function names itself

_ADDR = r'0x[0-9a-f]+'


def _matches(obj, pattern):
    r = repr(obj)
    return bool(re.fullmatch(pattern, r)) or r


def _function_forms():
    return {
        'modfunc':  _matches(modfunc, r'<function modfunc at %s>' % _ADDR),
        'lambda':   _matches(lam, r'<function <lambda> at %s>' % _ADDR),
        'unbound':  _matches(K.meth, r'<function K\.meth at %s>' % _ADDR),
        # a @staticmethod is bound to NOTHING, so it is a plain function --
        # the shape that needed the compiler to record which is which
        'staticmethod': _matches(K.sm, r'<function K\.sm at %s>' % _ADDR),
        'inherited_staticmethod': _matches(
            SubK.sm, r'<function (Sub)?K\.sm at %s>' % _ADDR),
    }


check('a_function_names_itself',
      {k: v for k, v in _function_forms().items() if v is not True}, {})


# --------------------------------------- a bound method names its receiver

def _bound_forms():
    out = {}
    out['instance'] = _matches(
        K().meth, r'<bound method K\.meth of <[\w.]*K object at %s>>' % _ADDR)
    out['classmethod'] = _matches(
        K.cm, r"<bound method K\.cm of <class '[\w.]*K'>>")
    # the table must separate the two, not reclassify both
    out['inherited_classmethod'] = _matches(
        SubK.cm, r"<bound method (Sub)?K\.cm of <class '[\w.]*SubK'>>")
    # a callable ASSIGNED in a class body binds too, and prints the same way
    out['aliased'] = _matches(
        Aliased().alias,
        r'<bound method Aliased\.(alias|real) of <[\w.]*Aliased object at %s>>' % _ADDR)
    return {k: v for k, v in out.items() if v is not True}


check('a_bound_method_names_its_receiver', _bound_forms(), {})


# ------------------------------------------------- the built-in forms

def _builtin_forms():
    out = {}
    # address-free, so compared exactly
    out['builtin_function'] = (repr(hash) == '<built-in function hash>') or repr(hash)
    out['method_descriptor'] = (
        repr(dict.items) == "<method 'items' of 'dict' objects>") or repr(dict.items)
    out['builtin_method'] = _matches(
        [].append, r'<built-in method append of list object at %s>' % _ADDR)
    return {k: v for k, v in out.items() if v is not True}


check('the_builtin_forms_are_named_too', _builtin_forms(), {})


# ------------------------------- the name in the repr is the qualname

def _repr_agrees_with_qualname():
    out = {}
    for label, obj in (('modfunc', modfunc), ('unbound', K.meth),
                       ('bound', K().meth), ('lambda', lam)):
        q = obj.__qualname__
        out[label] = (q in repr(obj)) or '%r not in %r' % (q, repr(obj))
    return {k: v for k, v in out.items() if v is not True}


check('the_repr_carries_the_qualname', _repr_agrees_with_qualname(), {})


# ------------------- a receiver whose own repr raises PROPAGATES

# CPython builds the bound-method repr by calling the RECEIVER's repr and does
# not guard it, so a hostile __repr__ escapes rather than being swallowed. The
# first draft of this fix guarded it and answered '?', which would have hidden
# the user's own exception -- checked against CPython, which propagates.

def _hostile_receiver():
    class Hostile:
        def __repr__(self):
            raise RuntimeError('no repr for you')

        def m(self):
            pass

    try:
        return repr(Hostile().m)
    except RuntimeError:
        return 'PROPAGATED'
    except BaseException as exc:
        return 'RAISED %s' % type(exc).__name__


check('a_hostile_receiver_propagates', _hostile_receiver(), 'PROPAGATED')
