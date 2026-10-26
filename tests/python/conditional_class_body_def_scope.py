"""A def inside a CONDITIONAL class-body block does not see the class body.

Python's rule: a class scope is never on the enclosing-scope chain of a
function defined in it, whether the def sits directly in the class body or
under an ``if``, ``try`` or ``for`` there.  Grail emits a conditional def
inline, as a block value, while the class body is being compiled, and every
free name in it read the CLASS namespace -- a sibling method, a class
attribute.  Grail wraps a def whose name GemStone reserves (``repeat``) in a
synthetic ``if True:``, so the bug also reached plain defs with such names:
test_timeit's ``def repeat(self, ...)'' read the test class's own ``timeit``
method instead of the timeit module.

The decorators, defaults and annotations of such a def are still evaluated in
the class body, and are checked too.

Every EXPECTED value was produced by running this file under CPython 3.14.
"""

import os as helper

x = 'global'


class Base:
    def who(self):
        return 'base'


class Conditional(Base):
    x = 'class'
    k = 5

    def helper(self):
        return 'sibling method'

    if True:
        def free_names(self):
            return type(helper).__name__, x

        def default_from_the_class_body(self, d=k):
            return d

        def zero_arg_super_and_dunder_class(self):
            return super().who(), __class__.__name__

        @property
        def a_property(self):
            return x

        @staticmethod
        def a_staticmethod():
            return x

    try:
        def under_try(self):
            return x
    except Exception:
        pass

    for _i in range(1):
        def under_for(self):
            return x
    del _i

    # ``repeat'' is a GemStone-reserved selector, so Grail puts this def under
    # a synthetic ``if True:'' of its own.
    def repeat(self):
        return type(helper).__name__, x


_c = Conditional()

RESULTS = {}
EXPECTED = {
    'free_names': ('module', 'global'),
    'default_from_the_class_body': 5,
    'zero_arg_super_and_dunder_class': ('base', 'Conditional'),
    'a_property': 'global',
    'a_staticmethod': 'global',
    'under_try': 'global',
    'under_for': 'global',
    'a_reserved_name': ('module', 'global'),
}

_GOT = {
    'free_names': lambda: _c.free_names(),
    'default_from_the_class_body': lambda: _c.default_from_the_class_body(),
    'zero_arg_super_and_dunder_class': lambda: _c.zero_arg_super_and_dunder_class(),
    'a_property': lambda: _c.a_property,
    'a_staticmethod': lambda: Conditional.a_staticmethod(),
    'under_try': lambda: _c.under_try(),
    'under_for': lambda: _c.under_for(),
    'a_reserved_name': lambda: _c.repeat(),
}

for _name, _fn in _GOT.items():
    try:
        _v = _fn()
    except BaseException as _exc:
        _v = ('raised', type(_exc).__name__, str(_exc))
    RESULTS[_name] = (_v == EXPECTED[_name]) or 'got: %r' % (_v,)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
