"""Fixture for functools.cached_property as a real descriptor class.

A module fixture rather than an eval: string because the cases define classes,
and eval-path class statements are a known Grail limitation.
"""

import functools


class CostItem:
    _cost = 1

    @functools.cached_property
    def cost(self):
        """The cost of the item."""
        self._cost += 1
        return self._cost


class OptionallyCachedCostItem:
    _cost = 1

    def get_cost(self):
        self._cost += 1
        return self._cost

    cached_cost = functools.cached_property(get_cost)


class SlottedCostItem:
    __slots__ = ('_cost',)

    def __init__(self):
        self._cost = 1

    @functools.cached_property
    def cost(self):
        raise RuntimeError('never called, slots not supported')


# --- caching -----------------------------------------------------------------

def computes_once_per_instance():
    """The whole point.  The stub passed the function straight through, so
    every read RE-INVOKED it -- the opposite of what the decorator promises:
    ``item.cost'' answered 2 then 3 then 4 (and, read as a bound method
    rather than a value, was not even the number)."""
    a = CostItem()
    b = CostItem()
    return [a.cost, a.cost, a.cost, b.cost, b.cost]


def attribute_name_may_differ_from_the_function_name():
    """``cached_cost = cached_property(get_cost)'' caches under the NAME it
    is bound to, which __set_name__ supplies -- not under the function's."""
    item = OptionallyCachedCostItem()
    return [item.get_cost(), item.cached_cost, item.get_cost(), item.cached_cost]


def reading_through_the_class_answers_the_descriptor():
    """CPython's __get__ answers self for a None instance, so ``Cls.attr'' is
    the descriptor -- which is what makes isinstance() and the .func /
    .attrname introspection below possible."""
    cp = CostItem.cost
    return [isinstance(cp, functools.cached_property),
            cp.attrname,
            cp.func is not None]


def the_same_descriptor_may_serve_two_classes():
    """One cached_property bound under the SAME name on two classes is fine
    and each instance caches separately -- CPython's test_reuse_same_name."""
    counter = []

    def _next(_self):
        counter.append(1)
        return len(counter)

    cp = functools.cached_property(_next)

    class A:
        cp = cp

    class B:
        cp = cp

    a = A()
    b = B()
    return [a.cp, b.cp, a.cp, b.cp]


# --- errors ------------------------------------------------------------------

def no_dict_to_cache_in():
    """A __slots__ class has no instance __dict__, so there is nowhere to
    cache; CPython raises rather than silently recompute forever."""
    try:
        SlottedCostItem().cost
    except TypeError as e:
        return str(e)
    return 'no-error'


def set_name_never_called():
    """``Foo.cp = cached_property(f)'' AFTER the class exists: CPython only
    calls __set_name__ at class creation, so the descriptor never learns its
    name and must raise instead of guessing one."""
    class Foo:
        pass

    Foo.cp = functools.cached_property(lambda s: None)
    try:
        Foo().cp
    except TypeError as e:
        return str(e)
    return 'no-error'


def two_names_for_one_descriptor():
    """Binding one descriptor to two names in the SAME class body is a
    TypeError: reads of the second name would recompute forever."""
    cp = functools.cached_property(lambda s: 1)
    try:
        class Bad:
            a = cp
            b = cp
    except TypeError as e:
        return str(e)
    return 'no-error'


def construction_arity():
    out = []
    for label, fn in (('no-arg', lambda: functools.cached_property()),
                      ('two-args',
                       lambda: functools.cached_property(len, len)),
                      ('by-keyword',
                       lambda: functools.cached_property(func=len))):
        try:
            fn()
            out.append(label + ':no-error')
        except TypeError:
            out.append(label + ':TypeError')
    return out


# --- introspection and subclassing -------------------------------------------

def documented_attributes():
    """func / attrname / __doc__, the three CPython documents."""
    def described(self):
        """A described property."""
        return 1

    cp = functools.cached_property(described)

    class Holder:
        prop = cp

    return [cp.func is described, cp.attrname, cp.__doc__]


def module_and_qualname():
    """The CLASS names itself functools.cached_property; an INSTANCE reports
    the module that defined the wrapped function (CPython's __init__ copies
    it), which is what makes ``Cls.attr.__module__ == Cls.__module__''."""
    return [functools.cached_property.__module__,
            functools.cached_property.__qualname__,
            CostItem.cost.__module__]


def subclassable():
    """A pass-through function could not be subclassed at all.  CPython's own
    test subclasses it to add __set__ -- which makes it a DATA descriptor, and
    caching still has to work."""
    class readonly_cached_property(functools.cached_property):
        def __set__(self, obj, value):
            raise AttributeError('read only property')

    class Test:
        def __init__(self, prop):
            self._prop = prop

        @readonly_cached_property
        def prop(self):
            return self._prop

    t = Test(1)
    first = t.prop
    t._prop = 999
    return [isinstance(Test.prop, functools.cached_property), first, t.prop]


def explicit_get():
    """__get__ called by hand, the way CPython's test does."""
    class Holder:
        pass

    cp = functools.cached_property(lambda s: 42)
    cp.__set_name__(Holder, 'answer')
    h = Holder()
    return [cp.__get__(h), cp.__get__(h), h.answer, cp.__get__(None) is cp]


def alias_to_decorated_def_binds_the_descriptor():
    """``b = a'' where ``a'' is a DECORATED sibling def must bind the decorated
    object, and __set_name__ must see both names in SOURCE order.

    CPython applies a decorator at the def statement, so ``a'' is already the
    cached_property when the alias runs.  Grail emits attribute values in an
    earlier phase than method decorators, and additionally compiled such an
    alias as a delegating METHOD -- so ``b'' answered an UnboundMethod where
    ``a'' answered the descriptor, and cached_property never learned it was
    bound twice.

    The name ORDER matters too: cached_property names both in its error, and
    ``('a' and 'b')'' is the source order.  With class-attribute names walked
    before the unordered decorator store, it came out backwards.
    """
    try:
        class Reused:
            @functools.cached_property
            def a(self):
                return 1

            b = a
        return 'NO ERROR'
    except TypeError as e:
        return str(e)


def alias_to_plain_def_still_delegates():
    """An alias of an UNdecorated sibling method stays a real delegating method
    -- that path exists because operator dispatch resolves compiled methods, not
    attributes, so ``__ne__ = __eq__'' must remain callable as an operator."""
    class Cmp:
        def __eq__(self, other):
            return True

        __ne__ = __eq__

    c = Cmp()
    return [c == object(), c != object()]
