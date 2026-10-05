"""A class __dict__ lists the class body's names in source order.

Grail builds the mapping from three stores -- the attribute holder, the
instance-side method dictionary and the metaclass's -- and two of those are
hash-ordered, so ``z = 1; def b; a = 2`` listed z, a, then b.  It now follows
the order ClassDefAst records for the body.

Compared on the names Grail has: CPython also lists __firstlineno__,
__static_attributes__, __dict__ and __weakref__, which Grail's class __dict__
does not carry (a separate gap), and those are filtered out of both sides.

Every expectation was measured against CPython 3.14.6.
"""

import functools

RESULTS = {}

_NOT_IN_GRAIL = {'__firstlineno__', '__static_attributes__', '__dict__', '__weakref__'}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:300])


def keys(cls):
    return [k for k in cls.__dict__ if k not in _NOT_IN_GRAIL]


class Mixed:
    "doc"
    z = 1

    def b(self):
        pass

    a = 2

    @property
    def p(self):
        return 1

    @staticmethod
    def s():
        pass

    @classmethod
    def c(cls):
        pass

    def __init__(self):
        self.q = 1

    y = 3

    @functools.cached_property
    def cp(self):
        return 1


class Sub(Mixed):
    w = 1

    def __repr__(self):
        return 'Sub'

    v = 2


class Empty:
    pass


class Slotted:
    def m(self):
        pass

    __slots__ = ()


class Late:
    def m(self):
        pass

    x = 1


Late.added = 2

check('body_names_in_source_order', keys(Mixed),
      ['__module__', '__doc__', 'z', 'b', 'a', 'p', 's', 'c', '__init__', 'y', 'cp'])
check('no_docstring_puts_doc_last', keys(Sub), ['__module__', 'w', '__repr__', 'v', '__doc__'])
check('empty_class', keys(Empty), ['__module__', '__doc__'])
check('slots_in_source_order', keys(Slotted), ['__module__', 'm', '__slots__', '__doc__'])
check('attribute_set_later_follows_the_body', keys(Late),
      ['__module__', 'm', 'x', '__doc__', 'added'])


class SlotNames:
    __slots__ = ('x', 'y')

    def m(self):
        pass


SlotNames.later = 1
check('slot_descriptors_follow_the_body', keys(SlotNames),
      ['__module__', '__slots__', 'm', 'x', 'y', '__doc__', 'later'])
check('vars_agrees', list(vars(Mixed)) == list(Mixed.__dict__), True)

if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
