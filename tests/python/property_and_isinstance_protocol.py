# Fixture for PropertyAndIsinstanceTestCase.
#
# Four roots found greening CPython's test_isinstance, only the last of which is
# about isinstance itself:
#
# 1. ``property(fget)`` -- the CALL form -- was an identity stub returning the
#    function, so reading such an attribute gave back the function instead of
#    calling it.  Only the ``@property`` DECORATOR worked, and by a different
#    route (the decorated def compiles to a real getter METHOD).  Worse, the stub
#    was ONE-argument only, so property(), property(g, s) and property(g, s, doc=)
#    already built a PropertyDescriptor -- which then had no __get__ either.
#
# 2. A class body declaring ``__class__`` was ignored: ___pyAttrLoad___ took a
#    fast path straight to the built-in __class__ for every object.  CPython lets
#    a user __class__ override it, and the legacy abstract-class protocol depends
#    on that.
#
# 3. isinstance/issubclass rejected PEP 604 unions (``int | str``), and their
#    nested-tuple recursion had no depth guard, so a deeply nested classinfo died
#    on an uncatchable Smalltalk AlmostOutOfStack instead of RecursionError.
#
# 4. When the real-type check failed, CPython still consults ``inst.__class__``
#    -- so a lying __class__ is honoured and a raising one propagates.

out = {}


def _run(label, fn):
    try:
        out[label] = repr(fn())
    except BaseException as e:
        out[label] = "%s: %s" % (type(e).__name__, e)


# --- 1. property() in its call form -----------------------------------------


class CallForm:
    def getval(self):
        return "called"

    val = property(getval)


class TwoArg:
    def getval(self):
        return "two-get"

    def setval(self, v):
        self._v = v

    val = property(getval, setval)


class Decorated:
    @property
    def val(self):
        return "decorated"


def _g(self):
    return 1


_run("call_form_read", lambda: CallForm().val)
_run("two_arg_read", lambda: TwoArg().val)
_run("decorator_still_works", lambda: Decorated().val)
_run("one_arg_type", lambda: type(property(_g)).__name__)
_run("two_arg_type", lambda: type(property(_g, _g)).__name__)
_run("no_arg_type", lambda: type(property()).__name__)
_run("kwarg_type", lambda: type(property(_g, _g, doc="d")).__name__)
# Class access must still answer the descriptor, so ``C.val.fget`` works.
_run("class_access_is_descriptor", lambda: type(CallForm.val).__name__)
_run("fget_reachable", lambda: CallForm.val.fget is not None)


# --- 2. a declared __class__ overrides the built-in -------------------------


class LyingClass:
    def getclass(self):
        return int

    __class__ = property(getclass)


class Plain:
    pass


_run("declared_class_wins", lambda: LyingClass().__class__.__name__)
_run("plain_class_unaffected", lambda: Plain().__class__.__name__)
_run("builtin_class_unaffected", lambda: (42).__class__.__name__)
_run("dict_class_unaffected", lambda: {}.__class__.__name__)
_run("str_class_unaffected", lambda: "x".__class__.__name__)
# __doc__ must NOT be gated the same way (every class gets a __doc__ accessor).
_run("doc_still_reads", lambda: Plain.__doc__ is None or isinstance(Plain.__doc__, str))


# --- 3. unions + a nested-tuple depth guard ---------------------------------


class Super:
    pass


class Child(Super):
    pass


_run("isinstance_union_hit", lambda: isinstance(3, str | int))
_run("isinstance_union_miss", lambda: isinstance(3.14, int | str))
_run("isinstance_union_none", lambda: isinstance(None, int | None))
_run("isinstance_union_class", lambda: isinstance(Child(), Super | int))
_run("issubclass_union_hit", lambda: issubclass(int, int | float | int))
_run("issubclass_union_miss", lambda: issubclass(dict, float | str))
_run("issubclass_union_bad_arg1", lambda: issubclass(2, Child | Super))
_run("issubclass_union_generic_alias", lambda: issubclass(int, list[int] | Child))
_run("isinstance_generic_alias_rejected", lambda: isinstance(2, list[int]))
# typing.List is a deprecated ALIAS of list, not list itself: it is its own
# object, and ``|`` and the type checks work through its __origin__.  See
# tests/python/typing_generic_aliases.py.
import typing

_run("typing_list_is_not_list", lambda: typing.List is list)
_run("typing_union_subclass", lambda: issubclass(typing.List, typing.List | typing.Tuple))
_run("typing_union_miss", lambda: issubclass(int, typing.List | typing.Tuple))
_run("typing_subscript", lambda: str(typing.List[int]))
# Flat and singly-nested tuples still work; an absurd nesting is RecursionError.
_run("flat_tuple_classinfo", lambda: isinstance(3, (str, int)))
_run("nested_tuple_classinfo", lambda: isinstance(3, (str, (int,))))


def _deep_nest():
    arg = (str,)
    for _ in range(200):
        arg = (arg,)
    return isinstance("", arg)


_run("deep_nested_tuple_raises", _deep_nest)


# --- 4. a lying / raising __class__ is consulted ---------------------------


class Raising:
    def getclass(self):
        raise RuntimeError("boom")

    __class__ = property(getclass)


_run("lying_class_makes_isinstance_true", lambda: isinstance(LyingClass(), int))
_run("raising_class_propagates", lambda: isinstance(Raising(), bool))
_run("raising_class_propagates_userclass", lambda: isinstance(Raising(), Plain))


# The abstract-class protocol end to end, as test_isinstance builds it.
class AbstractClass:
    def __init__(self, bases):
        self.bases = bases

    def getbases(self):
        return self.bases

    __bases__ = property(getbases)

    def __call__(self):
        return AbstractInstance(self)


class AbstractInstance:
    def __init__(self, klass):
        self.klass = klass

    def getclass(self):
        return self.klass

    __class__ = property(getclass)


AbstractSuper = AbstractClass(bases=())
AbstractChild = AbstractClass(bases=(AbstractSuper,))

_run("abstract_self", lambda: isinstance(AbstractSuper(), AbstractSuper))
_run("abstract_child_of_super", lambda: isinstance(AbstractChild(), AbstractSuper))
_run("abstract_super_not_child", lambda: isinstance(AbstractSuper(), AbstractChild))
_run("abstract_vs_normal", lambda: isinstance(AbstractSuper(), Super))
_run("normal_vs_abstract", lambda: isinstance(Super(), AbstractSuper))
_run("abstract_issubclass", lambda: issubclass(AbstractChild, AbstractSuper))

RESULTS = out
