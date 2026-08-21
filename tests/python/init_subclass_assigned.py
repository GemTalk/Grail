"""``__init_subclass__`` installed by ASSIGNMENT, not by definition.

PEP 487's hook is usually written in a class body, and that is the case an
implementation notices first.  But the hook is an ordinary class attribute,
and assigning one after the class exists is just as valid -- it is how a
decorator wraps whatever the class already had and puts the wrapper back.

PEP 702's ``@deprecated`` is exactly that, and it is the reason this matters:
it reads ``cls.__init_subclass__``, wraps it in a function that warns, and
assigns the wrapper.  An implementation that only looks for a DEFINED hook
runs none of it, so the decorator applies cleanly and then does nothing at
all -- no error, no warning, just silence.

The calling convention is the fussy part, and both halves are load-bearing:

* a hook assigned as a ``classmethod`` receives the NEW CLASS as its only
  positional argument;
* a hook assigned as a PLAIN function receives NO positional arguments.

``@deprecated`` depends on the difference.  It installs a classmethod when it
is wrapping a Python-level hook it must forward the class to, and a plain
function when it is wrapping ``object``'s, which takes none.

Every expectation below was checked against CPython 3.14.
"""

import warnings

RESULTS = {}


def check(name, fn, expected):
    try:
        got = fn()
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)
        return
    RESULTS[name] = True if got == expected else 'expected %r, got %r' % (
        expected, got)


# ------------------------------------------------- an assigned hook runs

def _assigned_classmethod_runs():
    seen = []

    class Base:
        pass

    def hook(*args, **kwargs):
        seen.append('ran')

    Base.__init_subclass__ = classmethod(hook)

    class Sub(Base):
        pass

    return seen


check('an_assigned_classmethod_runs', _assigned_classmethod_runs, ['ran'])


def _a_classmethod_receives_the_new_class():
    seen = []

    class Base:
        pass

    def hook(*args, **kwargs):
        seen.append(args)

    Base.__init_subclass__ = classmethod(hook)

    class Sub(Base):
        pass

    return [tuple(a.__name__ for a in args) for args in seen]


check('a_classmethod_receives_the_new_class',
      _a_classmethod_receives_the_new_class, [('Sub',)])


def _a_plain_function_receives_nothing():
    seen = []

    class Base:
        pass

    def hook(*args, **kwargs):
        seen.append(args)

    Base.__init_subclass__ = hook

    class Sub(Base):
        pass

    return seen


check('a_plain_function_receives_nothing', _a_plain_function_receives_nothing,
      [()])


def _class_keywords_reach_an_assigned_hook():
    seen = []

    class Base:
        pass

    def hook(*args, **kwargs):
        seen.append(kwargs)

    Base.__init_subclass__ = classmethod(hook)

    class Sub(Base, flavour='vanilla'):
        pass

    return seen


check('class_keywords_reach_an_assigned_hook',
      _class_keywords_reach_an_assigned_hook, [{'flavour': 'vanilla'}])


# ------------------------------------------------- who wins

def _a_nearer_definition_shadows_an_assignment():
    """A subclass that DEFINES the hook wins over an ancestor's assignment --
    the two live in one dict per class in CPython, so nearness decides."""
    order = []

    class Grand:
        pass

    def assigned(*args, **kwargs):
        order.append('assigned')

    Grand.__init_subclass__ = classmethod(assigned)

    class Parent(Grand):
        def __init_subclass__(cls, **kwargs):
            order.append('defined')

    del order[:]

    class Child(Parent):
        pass

    return order


check('a_nearer_definition_shadows_an_assignment',
      _a_nearer_definition_shadows_an_assignment, ['defined'])


# ------------------------------------------------- what it is all for

def _deprecated_class_warns_on_subclassing():
    @warnings.deprecated('use B instead')
    class A:
        pass

    with warnings.catch_warnings(record=True) as log:
        warnings.simplefilter('always')

        class B(A):
            pass

    return [w.category.__name__ for w in log]


check('a_deprecated_class_warns_on_subclassing',
      _deprecated_class_warns_on_subclassing, ['DeprecationWarning'])


def _deprecated_class_warns_on_instantiation():
    @warnings.deprecated('use B instead')
    class A:
        pass

    with warnings.catch_warnings(record=True) as log:
        warnings.simplefilter('always')
        A()

    return [w.category.__name__ for w in log]


check('a_deprecated_class_warns_on_instantiation',
      _deprecated_class_warns_on_instantiation, ['DeprecationWarning'])


def _deprecated_records_the_message():
    @warnings.deprecated('use B instead')
    class A:
        pass

    return A.__deprecated__


check('deprecated_records_the_message', _deprecated_records_the_message,
      'use B instead')


def _an_assignment_beats_the_same_class_definition():
    """On ONE class, the assignment wins -- it overwrote the dict entry.

    This is the case @deprecated is built on: it assigns onto the very class
    that defines the hook it is wrapping.  Ranking the definition first means
    the decorator's wrapper never runs on exactly the classes it was applied
    to.
    """
    order = []

    class Base:
        def __init_subclass__(cls, **kwargs):
            order.append('defined')

    def assigned(*args, **kwargs):
        order.append('assigned')

    Base.__init_subclass__ = classmethod(assigned)

    class Sub(Base):
        pass

    return order


check('an_assignment_beats_the_same_class_definition',
      _an_assignment_beats_the_same_class_definition, ['assigned'])


def _a_mixin_contributes_its_hook():
    """A hook reaches the new class along the MRO, not just up the primary
    base -- so a SECONDARY base contributes one."""
    seen = []

    class Base:
        pass

    class Mixin:
        pass

    def hook(*args, **kwargs):
        seen.append('ran')

    Mixin.__init_subclass__ = classmethod(hook)

    class Child(Base, Mixin):
        pass

    return seen


check('a_mixin_contributes_its_hook', _a_mixin_contributes_its_hook, ['ran'])


def _a_deprecated_mixin_warns():
    @warnings.deprecated('Mixin will go away soon')
    class Mixin:
        pass

    class Base:
        pass

    with warnings.catch_warnings(record=True) as log:
        warnings.simplefilter('always')

        class Child(Base, Mixin):
            pass

    return [w.category.__name__ for w in log]


check('a_deprecated_mixin_warns', _a_deprecated_mixin_warns,
      ['DeprecationWarning'])


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-6s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
