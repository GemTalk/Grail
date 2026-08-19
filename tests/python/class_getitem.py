"""PEP 560: ``C[x]`` means ``C.__class_getitem__(x)``.

It is an IMPLICIT classmethod -- the class is bound as ``cls`` whether the
subscript went to that class or to a subclass, which is what makes ``D[int]``
answer ``D[int]`` rather than ``C[int]``.

Grail routed every class subscript to one permissive default that answered the
class itself, so a user-defined __class_getitem__ was never called.  Fixing it
meant recognising FOUR storage shapes, because Grail keeps them in four
different places:

    def __class_getitem__(cls, item)      an env-1 INSTANCE method
    def __class_getitem__(*args)          the varargs instance selector
    @classmethod def __class_getitem__    metaclass-side, one argument
    __class_getitem__ = <anything>        a unary accessor on the metaclass

The last is the one that must still raise: an assignment that is not callable
is a TypeError, not a silently ignored subscript.

The permissive default STAYS for a class with no __class_getitem__ at all.
CPython raises there, but ``class Foo(list[V])'' has to keep compiling to
``class Foo(list)'' here, and annotations subscript classes constantly -- so
the second half of this file is regression cover for exactly that.

Every expectation below was checked against CPython 3.14.
"""

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


# --------------------------------------------------- the four shapes

class Plain:
    def __class_getitem__(cls, item):
        return 'Plain[%s]' % item.__name__


class ByClassmethod:
    @classmethod
    def __class_getitem__(cls, item):
        return '%s[%s]' % (cls.__name__, item.__name__)


class NotCallable:
    __class_getitem__ = "Surprise!"


class Assigned:
    __class_getitem__ = classmethod(lambda cls, item: 'assigned')


check('plain_def', lambda: Plain[int], 'Plain[int]')
check('classmethod_def', lambda: ByClassmethod[int], 'ByClassmethod[int]')
check('assigned_callable', lambda: Assigned[int], 'assigned')


def _not_callable():
    try:
        NotCallable[int]
    except TypeError:
        return 'TypeError'
    return '<no raise>'


check('non_callable_assignment_raises', _not_callable, 'TypeError')


# ------------------------------------------------------ cls binding

class Base:
    def __class_getitem__(cls, item):
        return '%s[%s]' % (cls.__name__, item.__name__)


class Derived(Base):
    ...


class Overriding(Base):
    def __class_getitem__(cls, item):
        return 'overridden:%s' % cls.__name__


# The class is bound as cls, so a subclass sees ITSELF -- not the class that
# defined the method.
check('subclass_inherits_and_binds_itself', lambda: Derived[int], 'Derived[int]')
check('base_still_binds_itself', lambda: Base[int], 'Base[int]')
check('subclass_can_override', lambda: Overriding[int], 'overridden:Overriding')

# The subscript is passed through untouched, including a class as the item.
check('item_may_be_a_class', lambda: Base[Derived], 'Base[Derived]')


class Multi:
    def __class_getitem__(cls, item):
        return item


# Several subscripts arrive as ONE tuple, not as separate arguments.
check('multiple_subscripts_arrive_as_a_tuple', lambda: Multi[int, str],
      (int, str))
check('single_subscript_is_not_wrapped', lambda: Multi[int], int)


class ByClassmethodBase:
    @classmethod
    def __class_getitem__(cls, item):
        return cls.__name__


class ByClassmethodDerived(ByClassmethodBase):
    ...


check('classmethod_form_also_binds_the_subclass',
      lambda: ByClassmethodDerived[int], 'ByClassmethodDerived')


# ------------------------------------------------ what must NOT change

# A class with no __class_getitem__ must stay subscriptable here: Grail
# compiles ``class Foo(list[V])'' to ``class Foo(list)'', and annotations
# subscript classes constantly.  CPython raises; this is a documented
# divergence, so it is asserted rather than left to chance.
class NoGetitem:
    pass


GRAIL_ONLY = ['plain_class_stays_subscriptable']

check('plain_class_stays_subscriptable', lambda: NoGetitem[int] is NoGetitem,
      True)
check('builtin_container_stays_subscriptable',
      lambda: list[int] is not None, True)


# Subscripting a class must not disturb instance subscripting.
class Sequence:
    def __init__(self):
        self.data = [10, 20, 30]

    def __getitem__(self, i):
        return self.data[i]


check('instance_subscript_unaffected', lambda: Sequence()[1], 20)


# An instance of a class defining __class_getitem__ is NOT subscriptable
# through it -- the protocol is class-side only.
def _instance_of_class_getitem():
    try:
        Plain()[int]
    except TypeError:
        return 'TypeError'
    return '<no raise>'


check('instance_does_not_get_class_getitem', _instance_of_class_getitem,
      'TypeError')


# Ordinary containers still subscript normally.
check('list_subscript', lambda: [1, 2, 3][1], 2)
check('dict_subscript', lambda: {'a': 1}['a'], 1)
check('tuple_subscript', lambda: (5, 6)[0], 5)
check('str_subscript', lambda: 'abc'[1], 'b')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        if _name in GRAIL_ONLY:
            continue
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
    # These assert a Grail LIMITATION, so CPython is expected to disagree.
    # XFAIL is that expected disagreement and is not a failure; XPASS means
    # CPython now agrees and the check no longer documents anything.
    print('--- documented Grail limits: CPython is expected to differ ---')
    for _name in GRAIL_ONLY:
        _v = RESULTS[_name]
        print('%-5s %s' % ('XPASS' if _v is True else 'XFAIL', _name))
