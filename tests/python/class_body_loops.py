"""Fixture: ``try`` / ``for`` / ``while`` / ``with`` inside a class body.

CPython executes a class body top to bottom like any other suite, so every
name one of these statements binds lands in the class namespace.  Grail
compiles class bodies STRUCTURALLY -- each statement announces the attributes
it contributes -- and these four announced nothing, so the whole statement was
dropped at codegen.  Nothing raised: the class simply came out without the
attribute, and the first symptom was an AttributeError somewhere else.

    class C:
        try:
            x = 1          # <- vanished, silently
        except ValueError:
            pass

The companion case, ``if'' in a class body, is class_body_conditional.py.
This one is its ``anything else'' half: ClassDefAst now emits these four
through their OWN codegen, with bare-name bindings routed to the same
per-class definitional store the ``if'' branches use.
"""

log = []
flag = True
fallback = 'module-global-fallback'


class Ctx:
    """Minimal context manager, so the ``with'' case can prove it really ran."""

    def __enter__(self):
        log.append('enter')
        return 'entered'

    def __exit__(self, *exc):
        log.append('exit')
        return False


class Looped:
    """``for'' over a class body -- test_enum's Period builds members this way."""

    for i in range(3):
        last = i * 10
    # CPython leaves the loop variable itself bound on the class.
    doubled = 2


class Whiled:
    n = 0
    total = 0
    while n < 3:
        n = n + 1
        total = total + n


class Tried:
    base = 1

    try:
        ok = base + 1
        reads_global = fallback
    except ValueError:
        unreached = 'no'
    else:
        else_ran = 'yes'
    finally:
        finally_ran = 'yes'

    try:
        raise ValueError('boom')
    except ValueError as e:
        caught = str(e)

    try:
        def in_try(self, x):
            return 'in_try:%s:%s' % (type(self).__name__, x)

        @staticmethod
        def static_in_try(x):
            return 'static_in_try:%s' % x

        @classmethod
        def cls_in_try(cls, x):
            return 'cls_in_try:%s:%s' % (cls.__name__, x)
    except ValueError:
        pass


class Withed:
    with Ctx() as handle:
        inside = 'ran'


class Nested:
    """The two statement kinds nested in each other, both directions."""

    if flag:
        try:
            try_in_if = 'yes'
        except ValueError:
            pass

    try:
        if flag:
            if_in_try = 'yes'
        for j in [7]:
            for_in_try = j
    except ValueError:
        pass


class NotHoisted:
    """A def inside a class-body ``try'' still owns its own locals.

    The definitional-store routing is scoped to the class body itself; a bare
    name inside a nested def is an ordinary local and must NOT become a class
    attribute.
    """

    try:
        def method(self):
            local_only = 'local'
            return local_only
    except ValueError:
        pass


class Sub(Tried):
    pass


def probe():
    """Return a dict of observations for the SUnit case to assert against."""
    t = Tried()
    s = Sub()
    return {
        # for / while
        'looped_last': Looped.last,
        'looped_i': Looped.i,
        'whiled_n': Whiled.n,
        'whiled_total': Whiled.total,
        # try, in all four clause positions
        'tried_ok': Tried.ok,
        'tried_reads_global': Tried.reads_global,
        'tried_else': Tried.else_ran,
        'tried_finally': Tried.finally_ran,
        'tried_caught': Tried.caught,
        'has_unreached': hasattr(Tried, 'unreached'),
        # def forms inside a try
        'in_try': t.in_try(1),
        'static_via_instance': t.static_in_try(2),
        'static_via_class': Tried.static_in_try(2),
        'cls_via_instance': t.cls_in_try(3),
        'cls_via_class': Tried.cls_in_try(3),
        'cls_via_subclass': Sub.cls_in_try(3),
        'inherited': s.in_try(4),
        # with
        'withed_inside': Withed.inside,
        'withed_handle': Withed.handle,
        'withed_log': list(log),
        # nesting, both directions
        'try_in_if': Nested.try_in_if,
        'if_in_try': Nested.if_in_try,
        'for_in_try': Nested.for_in_try,
        # scoping
        'not_hoisted': hasattr(NotHoisted, 'local_only'),
        'method_still_works': NotHoisted().method(),
    }
