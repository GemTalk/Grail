"""Fixtures for WHEN and HOW OFTEN a parameter default is evaluated.

Driven by PythonTests>>MethodDefaultSharingTestCase.  Each check answers True
when Grail agrees with CPython.

THE RULE.  A default is evaluated ONCE, at DEF TIME, in the enclosing scope, and
the resulting object lives on the function.  Every later call that omits the
argument is handed that SAME object -- which is why the mutable-default gotcha
exists at all, and why programs rely on it (``def spam(state=[0])`` as a counter).

WHY GRAIL HAD THREE ANSWERS.  A def compiles to one of several Smalltalk shapes
and each handled defaults differently:

  * a NESTED def gets a def-time wrapper block, so its defaults were already
    correct -- which is why the canonical ``lambda x=i: x`` loop-capture idiom
    worked and made the area look healthy;
  * a MODULE-LEVEL def compiles to a method with no such wrapper, so its default
    is memoised on first call -- shared correctly, but evaluated late;
  * a CLASS-BODY METHOD had the default expression emitted INLINE, so it was
    re-evaluated on EVERY call: a fresh list each time, nothing shared, and a
    side-effecting default firing once per call.

The class-body case is what these fixtures pin.  The module-level TIMING gap is
recorded separately below and marked as a known difference rather than asserted,
because closing it needs the value to reach __defaults__ as well.
"""


def a_method_shares_one_mutable_default():
    """The gotcha, on a method.  CPython appends into one list."""
    class C:
        def acc(self, item, bucket=[]):
            bucket.append(item)
            return bucket
    c = C()
    first = c.acc(1)
    second = c.acc(2)
    if second != [1, 2]:
        return 'second call saw %r' % (second,)
    if first is not second:
        return 'the two calls got different objects'
    return True


def a_method_default_is_shared_across_instances():
    """The default lives on the function, so separate instances share it."""
    class C:
        def acc(self, item, bucket=[]):
            bucket.append(item)
            return bucket
    C().acc('a')
    got = C().acc('b')
    if got != ['a', 'b']:
        return 'second instance saw %r' % (got,)
    return True


def a_method_default_is_evaluated_once():
    """Once per def, not once per call."""
    calls = []

    def side():
        calls.append(1)
        return len(calls)

    class C:
        def m(self, x=side()):
            return x
    c = C()
    c.m()
    c.m()
    c.m()
    if len(calls) != 1:
        return 'evaluated %d times' % (len(calls),)
    if c.m() != 1:
        return 'value was %r' % (c.m(),)
    return True


def a_method_default_of_none_still_binds():
    """None is a real default and must not read as "nothing stored"."""
    class C:
        def m(self, x=None):
            return x is None
    if C().m() is not True:
        return 'a None default did not bind'
    return True


def an_explicit_argument_still_wins():
    """The stored default must only be consulted when the argument is absent."""
    class C:
        def m(self, x=[]):
            return x
    c = C()
    if c.m(['given']) != ['given']:
        return 'a passed argument was overridden by the default'
    if c.m() != []:
        return 'the default was not used when the argument was omitted'
    return True


def a_subclass_reaching_super_keeps_its_own_default():
    """Parent and child both defaulting the SAME parameter name must not share.

    This is the case a key qualified only by method+parameter would get wrong:
    the lookup walks outward from the receiver, so the PARENT's method running on
    a CHILD instance would find the CHILD's list and append into it -- and the two
    defaults would silently become one.

    Each call appends to the child's list, then delegates and appends to the
    parent's, and it is the PARENT's bucket that comes back.  So the returned list
    accumulates only ``P`` entries; a ``C`` entry appearing in it is the two
    defaults having collapsed into a single object.
    """
    class P:
        def acc(self, item, bucket=[]):
            bucket.append(('P', item))
            return bucket

    class C(P):
        def acc(self, item, bucket=[]):
            bucket.append(('C', item))
            return super().acc(item)
    c = C()
    c.acc(1)
    got = c.acc(2)
    if got != [('P', 1), ('P', 2)]:
        return "parent's bucket held %r" % (got,)
    if any(tag == 'C' for tag, _ in got):
        return "the two defaults collapsed into one object: %r" % (got,)
    return True


def a_staticmethod_default_still_works():
    """Excluded from the store (no receiver to walk from), so it must at least
    keep binding correctly."""
    class C:
        @staticmethod
        def m(x=5):
            return x
    if C.m() != 5:
        return 'staticmethod default answered %r' % (C.m(),)
    if C.m(6) != 6:
        return 'staticmethod argument answered %r' % (C.m(6),)
    return True


def a_classmethod_default_still_works():
    class C:
        @classmethod
        def m(cls, x=7):
            return x
    if C.m() != 7:
        return 'classmethod default answered %r' % (C.m(),)
    return True


def a_nested_def_captures_at_def_time():
    """The path that was always right -- kept so a change here cannot silently
    trade one shape for another."""
    fns = []
    for i in range(4):
        fns.append(lambda x=i: x)
    got = [f() for f in fns]
    if got != [0, 1, 2, 3]:
        return 'loop capture answered %r' % (got,)
    return True


class _Mapping:
    """The stdlib's own spelling, at MODULE level as collections/abc.py has it.

    A class-body local used as a default, and private so it is name-mangled.
    Nesting matters here: the module-level class is the shape the stdlib actually
    imports, and a fixture that only tested a class nested in a function could
    pass while the real thing failed."""

    __marker = object()

    def pop(self, key, default=__marker):
        if default is _Mapping._Mapping__marker:
            return 'sentinel'
        return default


def a_module_level_class_body_local_can_be_a_default():
    """collections/abc.py's Mapping.pop, verbatim in shape.

    Its failure mode is not a wrong value: the default resolves as a MODULE name
    and raises NameError at IMPORT time, so the module never loads."""
    m = _Mapping()
    got = m.pop('k')
    if got != 'sentinel':
        return 'sentinel default did not bind: %r' % (got,)
    if m.pop('k', 5) != 5:
        return 'explicit argument lost'
    return True


def a_nested_class_body_local_can_be_a_default():
    """The same, for a class defined inside a function -- a different codegen
    path, so it is asserted rather than assumed to follow."""
    class C:
        __sentinel = object()

        def get(self, default=__sentinel):
            if default is C._C__sentinel:
                return 'sentinel'
            return default
    c = C()
    if c.get() != 'sentinel':
        return 'nested sentinel did not bind: %r' % (c.get(),)
    if c.get(7) != 7:
        return 'nested explicit argument lost'
    return True


# ---------------------------------------------------------------------------
# KEYWORD-ONLY defaults -- anything declared after a bare ``*`` or after
# ``*args``.  CPython applies exactly the rule above to these: evaluated once,
# at def time, in the scope enclosing the def.  Grail's two METHOD generators
# emitted the expression INLINE in the method body instead, which is neither
# that scope nor that moment, so a class-body name in a keyword-only default
# raised NameError -- urllib3's HTTPConnection.__init__ declares
# ``socket_options=default_socket_options`` after a bare ``*`` and every
# construction died there.  The positional half of the same def worked, which
# is what made it look like a keyword-only parsing bug rather than a scope one.
# ---------------------------------------------------------------------------


def a_class_body_name_resolves_in_a_keyword_only_default():
    """THE BUG, smallest form.  The positional half already worked."""
    class C:
        d = 7
        e = 9

        def positional(self, x=d):
            return x

        def kwonly(self, *, kw=e):
            return kw
    c = C()
    if c.positional() != 7:
        return 'positional default answered %r' % (c.positional(),)
    if c.kwonly() != 9:
        return 'keyword-only default answered %r' % (c.kwonly(),)
    return True


class _Conn:
    """urllib3's HTTPConnection shape, at MODULE level as urllib3 has it: a
    class-body list read by a keyword-only parameter's default."""

    default_socket_options = [('TCP', 'NODELAY', 1)]

    def __init__(self, host, *, socket_options=default_socket_options):
        self.host = host
        self.socket_options = socket_options


def the_urllib3_connection_shape_constructs():
    """``NameError: name 'default_socket_options' is not defined`` was the last
    blocker in the kaggle acceptance harness."""
    c = _Conn('example.invalid')
    if c.socket_options != [('TCP', 'NODELAY', 1)]:
        return 'socket_options bound %r' % (c.socket_options,)
    if _Conn('h', socket_options=[]).socket_options != []:
        return 'an explicit socket_options was overridden'
    return True


def a_module_level_class_body_local_can_be_a_keyword_only_default():
    """The name-mangled sentinel idiom, moved after the ``*``."""
    class C:
        __marker = object()

        def pop(self, key, *, default=__marker):
            if default is C._C__marker:
                return 'sentinel'
            return default
    c = C()
    if c.pop('k') != 'sentinel':
        return 'sentinel keyword-only default did not bind: %r' % (c.pop('k'),)
    if c.pop('k', default=5) != 5:
        return 'explicit keyword argument lost'
    return True


def a_method_shares_one_mutable_keyword_only_default():
    """The gotcha, on a keyword-only parameter."""
    class C:
        def acc(self, item, *, bucket=[]):
            bucket.append(item)
            return bucket
    c = C()
    first = c.acc(1)
    second = c.acc(2)
    if second != [1, 2]:
        return 'second call saw %r' % (second,)
    if first is not second:
        return 'the two calls got different objects'
    return True


def a_module_level_def_shares_one_mutable_keyword_only_default():
    """Module-level defs compile to a method too, and had the same inline emit."""
    first = _module_level_kwonly_acc(1)
    second = _module_level_kwonly_acc(2)
    if second != [1, 2]:
        return 'second call saw %r' % (second,)
    if first is not second:
        return 'the two calls got different objects'
    return True


def _module_level_kwonly_acc(item, *, bucket=[]):
    bucket.append(item)
    return bucket


def a_keyword_only_default_is_evaluated_once():
    """Once per def, not once per call -- the half of the rule that a passing
    name lookup would not catch."""
    calls = []

    def side():
        calls.append(1)
        return len(calls)

    class C:
        def m(self, *, x=side()):
            return x
    c = C()
    c.m()
    c.m()
    c.m()
    if len(calls) != 1:
        return 'evaluated %d times' % (len(calls),)
    if c.m() != 1:
        return 'value was %r' % (c.m(),)
    return True


def a_keyword_only_default_of_none_still_binds():
    """None is a real default, not "nothing stored"."""
    class C:
        def m(self, *, x=None):
            return x is None
    if C().m() is not True:
        return 'a None keyword-only default did not bind'
    return True


def an_explicit_keyword_argument_still_wins():
    class C:
        def m(self, *, x=[]):
            return x
    c = C()
    if c.m(x=['given']) != ['given']:
        return 'a passed keyword was overridden by the default'
    if c.m() != []:
        return 'the default was not used when the keyword was omitted'
    return True


def a_missing_required_keyword_only_still_raises():
    """The store must not make an UNDEFAULTED keyword-only parameter optional."""
    class C:
        def m(self, *, x):
            return x
    try:
        C().m()
    except TypeError:
        return True
    return 'a required keyword-only parameter bound without an argument'


def a_subclass_reaching_super_keeps_its_own_keyword_only_default():
    """Parent and child defaulting the SAME keyword-only name must not share --
    the side-table key has to carry the DEFINING class, or the parent's method
    running on a child instance finds the CHILD's list."""
    class P:
        def acc(self, item, *, bucket=[]):
            bucket.append(('P', item))
            return bucket

    class C(P):
        def acc(self, item, *, bucket=[]):
            bucket.append(('C', item))
            return super().acc(item)
    c = C()
    c.acc(1)
    got = c.acc(2)
    if got != [('P', 1), ('P', 2)]:
        return "parent's bucket held %r" % (got,)
    if any(tag == 'C' for tag, _ in got):
        return "the two defaults collapsed into one object: %r" % (got,)
    return True


def varargs_then_a_keyword_only_default_resolves():
    """``*args`` before the keyword-only parameter, rather than a bare ``*``."""
    class C:
        e = 3

        def m(self, *args, k=e):
            return (args, k)
    if C().m(9) != ((9,), 3):
        return 'answered %r' % (C().m(9),)
    return True


def a_keyword_only_default_alongside_kwargs_resolves():
    """``**kwargs`` present -- and the keyword-only name must not leak into it."""
    class C:
        e = 4

        def m(self, *, k=e, **kw):
            return (k, kw)
    if C().m(z=1) != (4, {'z': 1}):
        return 'answered %r' % (C().m(z=1),)
    if C().m(k=5) != (5, {}):
        return 'an explicit k leaked into **kwargs: %r' % (C().m(k=5),)
    return True


def a_keyword_only_default_may_be_a_call():
    """Not just a bare name: the whole expression is evaluated in the class body."""
    class C:
        e = 5

        def m(self, *, k=_times_ten(e)):
            return k
    if C().m() != 50:
        return 'answered %r' % (C().m(),)
    return True


def _times_ten(v):
    return v * 10


def a_staticmethod_keyword_only_default_still_works():
    """Excluded from the store (no receiver to walk from), exactly as the
    positional case is, so it must at least keep binding correctly."""
    class C:
        @staticmethod
        def m(*, x=5):
            return x
    if C.m() != 5:
        return 'staticmethod keyword-only default answered %r' % (C.m(),)
    if C.m(x=6) != 6:
        return 'staticmethod keyword argument answered %r' % (C.m(x=6),)
    return True


def a_classmethod_keyword_only_default_still_works():
    class C:
        e = 7

        @classmethod
        def m(cls, *, x=e):
            return x
    if C.m() != 7:
        return 'classmethod keyword-only default answered %r' % (C.m(),)
    return True


def a_nested_def_keyword_only_default_still_works():
    """NEGATIVE CONTROL for the change: the closure generator was already
    correct and is NOT routed through the new store, so a regression here would
    mean the wrong path was touched."""
    def outer():
        v = 21

        def inner(*, k=v, acc=[]):
            acc.append(k)
            return (k, acc)
        return (inner(), inner())
    got = outer()
    if got != ((21, [21, 21]), (21, [21, 21])):
        return 'nested def answered %r' % (got,)
    return True


def the_body_does_not_see_the_class_scope():
    """NEGATIVE CONTROL for the fix's blast radius.  Only the DEFAULT is
    evaluated in the class body; the method BODY follows Python's LEGB rule and
    skips the class namespace, so reading the same bare name there is a
    NameError in CPython and must stay one here."""
    class C:
        e = 9

        def m(self, *, k=e):
            return e            # noqa: F821 -- deliberately unresolvable
    try:
        C().m()
    except NameError:
        return True
    return 'the method body resolved a class-body name'


if __name__ == '__main__':
    checks = [
        a_method_shares_one_mutable_default,
        a_method_default_is_shared_across_instances,
        a_method_default_is_evaluated_once,
        a_method_default_of_none_still_binds,
        an_explicit_argument_still_wins,
        a_subclass_reaching_super_keeps_its_own_default,
        a_staticmethod_default_still_works,
        a_classmethod_default_still_works,
        a_nested_def_captures_at_def_time,
        a_module_level_class_body_local_can_be_a_default,
        a_nested_class_body_local_can_be_a_default,
        a_class_body_name_resolves_in_a_keyword_only_default,
        the_urllib3_connection_shape_constructs,
        a_module_level_class_body_local_can_be_a_keyword_only_default,
        a_method_shares_one_mutable_keyword_only_default,
        a_module_level_def_shares_one_mutable_keyword_only_default,
        a_keyword_only_default_is_evaluated_once,
        a_keyword_only_default_of_none_still_binds,
        an_explicit_keyword_argument_still_wins,
        a_missing_required_keyword_only_still_raises,
        a_subclass_reaching_super_keeps_its_own_keyword_only_default,
        varargs_then_a_keyword_only_default_resolves,
        a_keyword_only_default_alongside_kwargs_resolves,
        a_keyword_only_default_may_be_a_call,
        a_staticmethod_keyword_only_default_still_works,
        a_classmethod_keyword_only_default_still_works,
        a_nested_def_keyword_only_default_still_works,
        the_body_does_not_see_the_class_scope,
    ]
    for fn in checks:
        got = fn()
        print('%-4s %s%s' % ('OK' if got is True else 'FAIL', fn.__name__,
                             '' if got is True else '  -- %s' % (got,)))
