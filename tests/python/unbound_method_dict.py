"""Fixture: ``Cls.method.__dict__'' -- function attributes on a method.

In Python 3 a method read off its class IS a plain function, so it carries a
writable ``__dict__'' and decorators use it freely.  test_decorators has two
such decorators, and BOTH go through the dict rather than through setattr:

    def funcattrs(**kwds):
        def decorate(func):
            func.__dict__.update(kwds)      # test_double
            return func
        return decorate

    func.__dict__['author'] = name          # MiscDecorators.author

Grail models ``Cls.method'' as an UnboundMethod handle.  SETTING an attribute
on one already worked -- ``Cls.m.x = 1'' lands in the interned handle's
storage and reads back -- but there was no ``__dict__'' to reach them through,
so both spellings above raised AttributeError.

THE SYMPTOM WAS A MISSING ATTRIBUTE, NOT THE AttributeError, which is what made
this worth pinning: a class-body decorator that raises is applied inside a
handler that leaves the undecorated method in place, so funcattrs died on
``func.__dict__'', was silently discarded, and the first visible sign was
``C.foo.abc'' failing much later.  ``decorator_is_not_silently_dropped'' is the
check that speaks to that directly.

LIVENESS is the property that matters, not mere presence: ``update'' on a
snapshot would absorb the merge and change nothing, so a __dict__ that answered
a copy would let the decorator appear to succeed while doing nothing at all.

Interning is what makes the storage worth exposing -- ``Cls.m is Cls.m'' holds,
so an attribute written through the view is still there on the next read, which
is what CPython gets for free by keeping one function object in the class dict.
"""


def funcattrs(**kwds):
    def decorate(func):
        func.__dict__.update(kwds)
        return func
    return decorate


def author(name):
    def decorate(func):
        func.__dict__['author'] = name
        return func
    return decorate


def dict_update_decorator():
    # test_double's exact shape: two funcattrs, stacked.
    class C(object):
        @funcattrs(abc=1, xyz="haha")
        @funcattrs(booh=42)
        def foo(self):
            return 42

    return [C().foo(), C.foo.abc, C.foo.xyz, C.foo.booh]


def setitem_decorator():
    # MiscDecorators.author's shape: direct __dict__ item assignment.
    class C(object):
        @author('Cleese')
        def foo(self):
            return 1

    return [C.foo.author, C().foo()]


def dict_is_live_not_a_snapshot():
    # The property that makes ``update'' work at all.  If __dict__ answered a
    # copy, the update below would land nowhere and the read would raise.
    class C(object):
        def foo(self):
            return 1

    C.foo.__dict__.update(dict(a=1))
    C.foo.__dict__['b'] = 2
    return [C.foo.a, C.foo.b, sorted(C.foo.__dict__.keys())]


def dict_starts_empty():
    class C(object):
        def foo(self):
            return 1

    return list(C.foo.__dict__.keys())


def setattr_still_works():
    # The path that worked before -- kept so the new view does not displace it.
    class C(object):
        def foo(self):
            return 1

    C.foo.zed = 9
    return [C.foo.zed, 'zed' in C.foo.__dict__]


def attributes_do_not_leak_onto_the_class():
    # A function attribute is the FUNCTION's, not the class's.
    class C(object):
        @funcattrs(abc=1)
        def foo(self):
            return 1

    return ['abc' in C.__dict__, 'abc' in dir(C), C.foo.abc]


def the_handle_is_interned():
    # Why the storage is stable: one object per (class, name).
    class C(object):
        def foo(self):
            return 1

    return C.foo is C.foo


def visible_through_an_instance_read():
    class C(object):
        @funcattrs(abc=1)
        def foo(self):
            return 1

    return C().foo.abc


def decorator_is_not_silently_dropped():
    # The decorator must actually run AND its return value be kept.  This one
    # replaces the function, so a dropped decorator gives 1 instead of 99.
    def replace(func):
        func.__dict__['tag'] = 'seen'

        def wrapper(self):
            return 99
        wrapper.__dict__.update(func.__dict__)
        return wrapper

    class C(object):
        @replace
        def foo(self):
            return 1

    return [C().foo(), C.foo.tag]


def a_nested_function_is_unaffected():
    # The ExecBlock path, which already worked -- regression guard.
    @funcattrs(abc=1)
    def foo():
        return 42

    return [foo(), foo.abc, sorted(foo.__dict__.keys())]


r = {
    'dict_update_decorator': dict_update_decorator(),
    'setitem_decorator': setitem_decorator(),
    'dict_is_live_not_a_snapshot': dict_is_live_not_a_snapshot(),
    'dict_starts_empty': dict_starts_empty(),
    'setattr_still_works': setattr_still_works(),
    'attributes_do_not_leak_onto_the_class': attributes_do_not_leak_onto_the_class(),
    'the_handle_is_interned': the_handle_is_interned(),
    'visible_through_an_instance_read': visible_through_an_instance_read(),
    'decorator_is_not_silently_dropped': decorator_is_not_silently_dropped(),
    'a_nested_function_is_unaffected': a_nested_function_is_unaffected(),
}


EXPECTED = {
    'dict_update_decorator': [42, 1, 'haha', 42],
    'setitem_decorator': ['Cleese', 1],
    'dict_is_live_not_a_snapshot': [1, 2, ['a', 'b']],
    'dict_starts_empty': [],
    'setattr_still_works': [9, True],
    'attributes_do_not_leak_onto_the_class': [False, False, 1],
    'the_handle_is_interned': True,
    'visible_through_an_instance_read': 1,
    'decorator_is_not_silently_dropped': [99, 'seen'],
    'a_nested_function_is_unaffected': [42, 1, ['abc']],
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-40s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-40s is not in EXPECTED' % ('FAIL', extra))
