# Fixture for BuiltinSubclassOverrideTestCase.
#
# A Python class that subclasses a built-in (dict) and overrides one of
# the built-in's methods with a signature that has defaults / *args.
# Such an override compiles to the varargs `_name:kw:` selector, while
# the inherited built-in keeps its fixed-arity `name:` selector.  When
# the override is invoked indirectly (a method call on a value whose
# static type is unknown, routed through BoundMethod), the override must
# win over the inherited built-in — not be shadowed by it.
#
# This is the resolution werkzeug's MultiDict.get relies on (its get has
# `default=None, type=None`, so it is varargs, while dict.get is the
# fixed-arity built-in).


class TaggedGetDict(dict):
    def get(self, key, default=None):
        # `default=None` makes this varargs.  dict.get (fixed-arity)
        # would return the raw stored value; our override returns a tag
        # so the two are distinguishable.  `self[key]` uses the inherited
        # dict __getitem__ (this class doesn't override it).
        if key in self:
            return ('override', self[key])
        return default


def varargs_override_beats_inherited_builtin():
    d = TaggedGetDict()
    d['x'] = 'stored'
    # If dict.get shadowed our override we'd get 'stored'; the override
    # returns the tagged tuple instead.
    return d.get('x') == ('override', 'stored')


def override_default_arg_still_works():
    d = TaggedGetDict()
    # Missing key exercises the default branch of the varargs override.
    return d.get('missing', 'fallback') == 'fallback'


# --- bpo-43413: keyword arguments in a built-in-collection subclass ---------
# frozenset has NO __init__ of its own; it inherits the LENIENT object.__init__,
# which ignores leftover constructor args when the subclass overrides __new__.
# So a frozenset subclass whose __new__ takes a keyword may be constructed with
# it (the kwarg is consumed by __new__).  set, by contrast, has a STRICT
# set.__init__ that still rejects a kwarg even when __new__ is overridden; and a
# plain subclass (neither __new__ nor __init__ overridden) rejects it.
# Regression for CPython test.test_set's test_keywords_in_subclass.


def frozenset_subclass_new_accepts_kwarg():
    class FS(frozenset):
        def __new__(cls, arg, newarg=None):
            self = super().__new__(cls, arg)
            self.newarg = newarg
            return self
    u = FS([1, 2], newarg=3)
    return type(u) is FS and set(u) == {1, 2} and u.newarg == 3


def frozenset_subclass_init_accepts_kwarg():
    class FI(frozenset):
        def __init__(self, arg, newarg=None):
            self.newarg = newarg
    u = FI([1, 2], newarg=3)
    return type(u) is FI and set(u) == {1, 2} and u.newarg == 3


def frozenset_plain_subclass_rejects_kwarg():
    class FP(frozenset):
        pass
    try:
        FP(sequence=())
        return False
    except TypeError:
        return True


def set_subclass_new_rejects_kwarg():
    # set.__init__ is strict, so a kwarg is rejected even with __new__ overridden.
    class SN(set):
        def __new__(cls, arg, newarg=None):
            self = super().__new__(cls, arg)
            self.newarg = newarg
            return self
    try:
        SN([1, 2], newarg=3)
        return False
    except TypeError:
        return True


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    checks = [
        varargs_override_beats_inherited_builtin,
        override_default_arg_still_works,
        frozenset_subclass_new_accepts_kwarg,
        frozenset_subclass_init_accepts_kwarg,
        frozenset_plain_subclass_rejects_kwarg,
        set_subclass_new_rejects_kwarg,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
