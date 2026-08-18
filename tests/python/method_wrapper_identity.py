"""Fixture: what a staticmethod / classmethod wrapper says about what it wraps.

``staticmethod(f)'' and ``classmethod(f)'' are objects in their own right, and
CPython makes them report the IDENTITY of the wrapped callable: the same
``__module__'', ``__qualname__'', ``__name__'', ``__doc__'' and
``__annotations__'' objects f itself answers, plus f under both ``__func__''
(the descriptor protocol's spelling) and ``__wrapped__'' (the one the
introspection tools follow -- inspect.signature unwraps through it, and
functools.wraps sets it).  Their repr names the wrapped callable too.

Grail forwarded some and not others.  ``__wrapped__'' and ``__module__'' were
missing outright, so ``getattr(wrapper, attr)'' raised; ``__annotations__'' was
forwarded but not listed among the wrapper's VALUE attributes, so reading it
handed back a bound method rather than the dict; and the repr was
``<staticmethod object>'', which says nothing about the only interesting thing
a wrapper has.  That is test_decorators' test_staticmethod and test_classmethod.

THE ASSERTIONS BELOW ARE RELATIONS, not literals, and deliberately so.  The
test asserts ``getattr(wrapper, attr) is getattr(func, attr)'' -- identity with
whatever the function answers -- so it holds whether or not Grail's value for a
given attribute matches CPython's.  Grail's function repr is
``<BoundMethod object at ...>'' where CPython writes ``<function f at ...>'';
pinning the literal repr would have made this fixture fail for a reason that has
nothing to do with wrappers.

THE FUNCTION IS DEFINED INSIDE A def, matching upstream, and that is load-bearing
rather than incidental.  A Grail MODULE-LEVEL function answers a FRESH object for
``__qualname__'', ``__name__'' and ``__annotations__'' on every read, so identity
cannot hold for it no matter how faithfully the wrapper forwards -- and its
``__doc__'' is None even with a docstring.  A nested def has none of those
problems.  Written at module scope this fixture reported the wrapper as broken
when the wrapper was fine; ``module_level_function_attrs_are_unstable'' records
that separately, as the distinct gap it is.

``classmethod_is_not_callable'' is the other half.  CPython made STATICMETHOD
callable in 3.10 (bpo-43682) and left classmethod alone -- a classmethod has
nothing to bind its first argument to until a class supplies one.  Grail refused
the call too, but by falling through to a Smalltalk MessageNotUnderstood, which
Python cannot catch: ``assertRaises(TypeError, wrapper, 1)'' did not fail, it
took the whole test down as an error.  The distinction between an uncatchable
refusal and a catchable one is the fixture.
"""


FORWARDED = ('__module__', '__qualname__', '__name__', '__doc__',
             '__annotations__')


def wrapper_forwards_identity(wrapper_type):
    def func(x):
        """a docstring, so __doc__ has something to forward"""
        return x

    wrapper = wrapper_type(func)
    return [wrapper.__func__ is func,
            wrapper.__wrapped__ is func,
            all(getattr(wrapper, a) is getattr(func, a) for a in FORWARDED)]


def wrapper_repr_names_the_function(wrapper_type, type_name):
    def func(x):
        return x

    wrapper = wrapper_type(func)
    # The form CPython uses, built from the SAME repr the reader would get, so
    # this holds without depending on how a function reprs.
    return repr(wrapper) == '<%s(%r)>' % (type_name, func)


def staticmethod_is_callable():
    # bpo-43682: callable since 3.10, with no class involved.
    def func(x):
        return x

    return staticmethod(func)(1)


def classmethod_is_not_callable():
    def func(x):
        return x

    try:
        classmethod(func)(1)
        return 'NOT RAISED'
    except TypeError as exc:
        return 'TypeError: ' + str(exc)


def annotations_is_a_mapping():
    # The specific symptom of the missing value-attribute entry: this used to
    # answer a bound method, which is truthy and passes a careless check.
    def func(x):
        return x

    ann = staticmethod(func).__annotations__
    return [isinstance(ann, dict), ann == func.__annotations__]


def module_level_function_attrs_are_unstable():
    # RECORDED, not endorsed, and not on the wrapper path.  A Grail module-level
    # function answers a fresh object per read for these, so ``f.__x__ is
    # f.__x__'' is false; CPython answers the same object every time.  This is
    # why the checks above use a nested def, exactly as upstream does.
    return [module_level.__name__ is module_level.__name__,
            module_level.__qualname__ is module_level.__qualname__,
            module_level.__annotations__ is module_level.__annotations__,
            module_level.__doc__]


def module_level(x):
    """a docstring the module-level path drops"""
    return x


r = {
    'staticmethod_forwards': wrapper_forwards_identity(staticmethod),
    'classmethod_forwards': wrapper_forwards_identity(classmethod),
    'staticmethod_repr': wrapper_repr_names_the_function(staticmethod,
                                                         'staticmethod'),
    'classmethod_repr': wrapper_repr_names_the_function(classmethod,
                                                        'classmethod'),
    'staticmethod_is_callable': staticmethod_is_callable(),
    'classmethod_is_not_callable': classmethod_is_not_callable(),
    'annotations_is_a_mapping': annotations_is_a_mapping(),
    'module_level_function_attrs_are_unstable':
        module_level_function_attrs_are_unstable(),
}


EXPECTED = {
    'staticmethod_forwards': [True, True, True],
    'classmethod_forwards': [True, True, True],
    'staticmethod_repr': True,
    'classmethod_repr': True,
    'staticmethod_is_callable': 1,
    'classmethod_is_not_callable':
        "TypeError: 'classmethod' object is not callable",
    'annotations_is_a_mapping': [True, True],
}


# A SEPARATE, PRE-EXISTING GAP, surfaced while measuring the above and recorded
# here because this is where a reader will meet it.  It is NOT on the wrapper
# path -- the wrapper forwards faithfully, which is why the checks above hold
# once the function is nested as upstream writes it.
GRAIL_ONLY = {
    'module_level_function_attrs_are_unstable': [False, False, False, None],
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-30s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for key, grail in GRAIL_ONLY.items():
        actual = r[key]
        print('%-5s %-30s -> %r' % ('XFAIL' if actual != grail else 'XPASS',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED) - set(GRAIL_ONLY)):
        print('%-5s %-30s is in neither table' % ('FAIL', extra))
