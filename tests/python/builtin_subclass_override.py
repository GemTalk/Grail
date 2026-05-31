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
