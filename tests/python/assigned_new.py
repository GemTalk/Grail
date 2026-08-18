"""Assigning ``__new__`` on a class: it must be STORED, and then CALLED.

    A.__new__ = staticmethod(f)

is how you replace a class's allocator after the fact, and PEP 702's
``@deprecated`` does exactly that to make instantiation warn.  Grail got both
halves wrong, for unrelated reasons.

STORING.  __setattr__ and ___pyAttrStore___ both treat a unary ``name`` plus a
one-argument ``name:`` as a @property getter/setter pair and dispatch to the
setter.  That shape is right for class-body data and for @property -- and
``__new__`` is the one name where it lies, because ``__new__:`` takes the CLASS
to instantiate rather than a value to store.  So the assignment CALLED
``object.__new__(f)``, reaching the allocator with the assigned function
standing in for cls.  Of every name a class answers in both forms, only
__new__ is shaped this way; __doc__ and __module__ are genuine setters, and
are checked below to make sure the fix did not widen.

CALLING.  An assigned __new__ lives in the class-attribute store, not as a
compiled method, so the instantiation path could not see it and fell through to
plain allocation -- the function was stored, and then ignored.  CPython looks
__new__ up on the TYPE, walking the MRO, and calls it with the class first.

Every expectation below was checked against CPython 3.14.
"""

import warnings

RESULTS = {}
CALLS = []


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


# ------------------------------------------------- storing, then calling

class A:
    pass


_A_orig_new = A.__new__


def _a_new(cls, /, *args, **kwargs):
    CALLS.append('A')
    return _A_orig_new(cls)


A.__new__ = staticmethod(_a_new)


def _make_a():
    del CALLS[:]
    inst = A()
    return (list(CALLS), isinstance(inst, A), type(inst).__name__)


check('assigned_new_is_called', _make_a, (['A'], True, 'A'))
# Reading it back gives the function, not the result of calling it.
check('assigned_new_reads_back', lambda: callable(A.__new__), True)


# The assignment must not have run the allocator: a __new__ that raises proves
# nothing was invoked at assignment time.
class Boom:
    pass


def _boom_new(cls, /, *args, **kwargs):
    raise RuntimeError('called at assignment time')


Boom.__new__ = staticmethod(_boom_new)          # must NOT raise


def _boom_raises_only_on_call():
    try:
        Boom()
    except RuntimeError as exc:
        return str(exc)
    return '<no raise>'


check('assignment_does_not_invoke',
      _boom_raises_only_on_call, 'called at assignment time')


# ------------------------------------------------- arguments and results

class WithArgs:
    def __init__(self, *args, **kwargs):
        pass


_wa_orig = WithArgs.__new__
SEEN = {}


def _wa_new(cls, /, *args, **kwargs):
    SEEN['cls'] = cls
    SEEN['args'] = args
    SEEN['kwargs'] = dict(kwargs)
    return _wa_orig(cls)


WithArgs.__new__ = staticmethod(_wa_new)


def _call_with_args():
    SEEN.clear()
    WithArgs(1, 2, k=3)
    return (SEEN['cls'] is WithArgs, SEEN['args'], SEEN['kwargs'])


check('receives_class_and_arguments', _call_with_args,
      (True, (1, 2), {'k': 3}))


# A plain function assigned without staticmethod() behaves the same on a class.
class Plain:
    pass


_plain_orig = Plain.__new__


def _plain_new(cls, /, *args, **kwargs):
    CALLS.append('plain')
    return _plain_orig(cls)


Plain.__new__ = _plain_new


def _make_plain():
    del CALLS[:]
    inst = Plain()
    return (list(CALLS), isinstance(inst, Plain))


check('plain_function_assignment_works', _make_plain, (['plain'], True))


# ------------------------------------------------------------ inheritance

class Base:
    pass


_base_orig = Base.__new__


def _base_new(cls, /, *args, **kwargs):
    CALLS.append('base')
    return _base_orig(cls)


Base.__new__ = staticmethod(_base_new)


class Child(Base):
    pass


def _child_inherits():
    del CALLS[:]
    inst = Child()
    return (list(CALLS), type(inst).__name__)


check('subclass_inherits_assigned_new', _child_inherits, (['base'], 'Child'))


class Override(Base):
    pass


def _override_new(cls, /, *args, **kwargs):
    CALLS.append('override')
    return _base_orig(cls)


Override.__new__ = staticmethod(_override_new)


def _child_overrides():
    del CALLS[:]
    Override()
    return list(CALLS)


check('subclass_can_override_it', _child_overrides, ['override'])


# ------------------------------------------- PEP 702, the driving case

from warnings import deprecated


@deprecated("use Replacement instead")
class Old:
    pass


def _deprecated_class():
    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter("always")
        inst = Old()
        return (Old.__deprecated__,
                str(w[0].message) if len(w) else '<no warning>',
                isinstance(inst, Old))


check('deprecated_class_warns_on_instantiation', _deprecated_class,
      ('use Replacement instead', 'use Replacement instead', True))


# ------------------------------------------------- what must NOT change

# __doc__ and __module__ are the other two names a class answers in both the
# unary and one-argument forms, and both ARE genuine value setters -- the guard
# must not have widened to them.
class Docs:
    """original"""


def _doc_assignment():
    Docs.__doc__ = 'replaced'
    return Docs.__doc__


check('doc_assignment_still_works', _doc_assignment, 'replaced')


def _module_assignment():
    Docs.__module__ = 'somewhere'
    return Docs.__module__


check('module_assignment_still_works', _module_assignment, 'somewhere')


# An ordinary class attribute still stores and reads back.
class Attrs:
    existing = 1


def _ordinary_attrs():
    Attrs.existing = 2
    Attrs.fresh = 3
    return (Attrs.existing, Attrs.fresh)


check('ordinary_class_attributes', _ordinary_attrs, (2, 3))


# A class that defines __new__ in its BODY is untouched by any of this.
class BodyNew:
    def __new__(cls, /, *args, **kwargs):
        CALLS.append('body')
        return super().__new__(cls)


def _body_new():
    del CALLS[:]
    inst = BodyNew()
    return (list(CALLS), isinstance(inst, BodyNew))


check('class_body_new_still_runs', _body_new, (['body'], True))


# ...and a plain class with no __new__ anywhere still instantiates.
class Plainest:
    def __init__(self):
        self.x = 1


check('plain_class_unaffected', lambda: Plainest().x, 1)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
