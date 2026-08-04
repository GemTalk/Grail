"""Fixture: statements inside a class-body ``if``.

CPython executes a class body top to bottom like any other suite, so a
``def`` guarded by an ``if`` binds a class attribute exactly when its branch
runs.  Grail compiles class bodies structurally instead, and used to honour
only simple assignments inside a class-body ``if`` -- every guarded ``def``
was silently dropped.  The C-vs-Python dual-module pattern in the CPython
test suite (``if c_functools:`` in test_functools' TestLRUC) is built on it.
"""

flag = True
other = False
helper = 'module-global-helper'


def deco(f):
    def wrapped(*a, **k):
        return 'deco(' + str(f(*a, **k)) + ')'
    return wrapped


class Conditional:
    if flag:
        marker = 'yes'

        def inst_meth(self, x):
            return 'inst:%s:%s' % (type(self).__name__, x)

        @staticmethod
        def static_meth(x):
            return 'static:%s' % x

        @classmethod
        def cls_meth(cls, x):
            return 'cls:%s:%s' % (cls.__name__, x)

        @deco
        def decorated(self):
            return 'decorated'

        # a name bound EARLIER in the same branch
        echo = marker

        # ...and one that is not bound in the class body at all, so the read
        # falls through to the module global (what CPython does too)
        from_global = helper
    else:
        def inst_meth(self, x):
            return 'WRONG-BRANCH'

    if other:
        def not_taken(self):
            return 'should not exist'
    else:
        def else_meth(self):
            return 'else_meth'

    def unconditional(self):
        return 'unconditional'


class Sub(Conditional):
    pass


def probe():
    """Return a dict of observations for the SUnit case to assert against."""
    c = Conditional()
    s = Sub()
    return {
        'inst': c.inst_meth(1),
        'static_via_instance': c.static_meth(2),
        'static_via_class': Conditional.static_meth(2),
        'cls_via_instance': c.cls_meth(3),
        'cls_via_class': Conditional.cls_meth(3),
        'cls_via_subclass': Sub.cls_meth(3),
        'decorated': c.decorated(),
        'echo': Conditional.echo,
        'from_global': Conditional.from_global,
        'else_meth': c.else_meth(),
        'unconditional': c.unconditional(),
        'inherited': s.inst_meth(4),
        'has_not_taken': hasattr(Conditional, 'not_taken'),
        'has_inst_meth': hasattr(Conditional, 'inst_meth'),
    }
