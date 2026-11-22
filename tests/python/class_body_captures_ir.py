"""Fixture: a method-local class body reading and writing the ENCLOSING
function's variables (plan P3.5).

On the IR arm a ``class`` statement inside a def is built by a helper method of
its own -- CPython's class-body frame.  The helper is handed each enclosing
variable the class uses as a reader block (and a setter block), and keeps a
copy of it for the class body.  A read that runs LATER -- a lambda, a
generator expression, a PEP 649 annotation -- or after something has rebound
the enclosing variable must see the binding as it is THEN, as CPython's cell
does (#2292).  Every expectation is CPython 3.14's, verified by running this
file directly; the IR helper, the text helper (``GRAIL_IR_CLASS_HELPER=0``)
and the text arm (``GRAIL_IR_CODEGEN=0``) all agree with it.

* ``lambda_late``: a lambda and a generator expression in the body see a
  rebinding made after the class statement (#2292).
* ``nested_late``: the same from a lambda in a class nested in the body.
* ``nonlocal_late``: a name a class-body ``nonlocal`` declares, read later
  from a lambda.
* ``method_nonlocal_late``: a name a METHOD declares ``nonlocal``, read later
  from a lambda at class level.
* ``annotation_late``: a class-body annotation naming an enclosing variable
  bound only after the class statement, and one rebound after it.
* ``eager_after_call``: a class-body read after a call that rebinds the
  enclosing variable.
* ``nonlocal_param``: ``nonlocal x; x += 1`` on a parameter of the enclosing
  def, seen by the def afterwards and by a method; ``x`` is not a class
  attribute (test_scope's ``testNonLocalClass``).
* ``nonlocal_then_read``: a class-body read after the body's own
  ``nonlocal`` store.
* ``global_decl``: ``global g; g = ...`` binds the module, not the class.
* ``dunder_class_decls``: ``global __class__`` and ``nonlocal __class__`` in
  the body of a class inside a method (test_super's
  ``test_various___class___pathologies``).
* ``own_cells``: ``__class__`` and ``__classdict__`` read from a lambda in the
  body are the class being defined and its namespace (test_listcomps).
* ``sibling_calls``: a call of a class the body binds, and of a def it binds
  (test_descr's ``computed_attribute(__get_x)``).
"""

r = {}


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = '%s: %s' % (type(exc).__name__, exc)


def lambda_late():
    k = 1

    class C:
        g = staticmethod(lambda: k)
        h = staticmethod(lambda: (j for j in [k, k + 1]))
        first = [k for _ in range(2)]
    k = 2
    return C.g(), list(C.h()), C.first


def nested_late():
    k = 'before'

    class Outer:
        class Inner:
            g = staticmethod(lambda: k)
    k = 'after'
    return Outer.Inner.g()


def nonlocal_late():
    x = 1

    class C:
        nonlocal x
        grab = staticmethod(lambda: x)
    x = 5
    return C.grab()


def method_nonlocal_late():
    x = 'old'

    class C:
        def set(self, v):
            nonlocal x
            x = v
        get = staticmethod(lambda: x)
    C().set('new')
    return C.get(), x


def annotation_late():
    kind = str

    class X:
        y: undefined
        z: kind
    undefined = int
    kind = bytes
    return X.__annotations__


def eager_after_call():
    v = 'old'

    def bump():
        nonlocal v
        v = 'new'

    class C:
        before = v
        bump()
        after = v
    return C.before, C.after


def nonlocal_param(x):
    class c:
        nonlocal x
        x += 1

        def get(self):
            return x
    return c().get(), x, 'x' in c.__dict__


def nonlocal_then_read():
    x = 1

    class C:
        nonlocal x
        x = 5
        seen = x * 10
    return C.seen, x


def global_decl():
    class X:
        global g_class_body_captures
        g_class_body_captures = 42
        local = g_class_body_captures + 1
    found = globals().pop('g_class_body_captures', None)
    return found, X.local, 'g_class_body_captures' in X.__dict__


class Host:
    def run(self):
        class X:
            global __class__
            __class__ = 42

            def f():
                __class__
        from_global = globals().pop('__class__', None)
        in_dict = '__class__' in X.__dict__

        class Y:
            nonlocal __class__
            __class__ = 43

            def f():
                __class__
        return from_global, in_dict, __class__


def dunder_class_decls():
    return Host().run()


def own_cells():
    class _C:
        y = 2
        cls = [lambda: __class__ for _ in [1]]
        ns = [(lambda: __classdict__)() for _ in [1]]
    return _C.cls[0]() is _C, _C.ns[0]['y']


def sibling_calls():
    class C:
        class computed(object):
            def __init__(self, get):
                self.get = get

            def __get__(self, obj, type=None):
                return self.get(obj)

        def __get_x(self):
            return 7

        def helper(a, b):
            return a + b
        x = computed(__get_x)
        three = helper(1, 2)
    return C().x, C.three


record('lambda_late', lambda_late)
record('nested_late', nested_late)
record('nonlocal_late', nonlocal_late)
record('method_nonlocal_late', method_nonlocal_late)
record('annotation_late', annotation_late)
record('eager_after_call', eager_after_call)
record('nonlocal_param', lambda: nonlocal_param(0))
record('nonlocal_then_read', nonlocal_then_read)
record('global_decl', global_decl)
record('dunder_class_decls', dunder_class_decls)
record('own_cells', own_cells)
record('sibling_calls', sibling_calls)


EXPECTED = {
    'lambda_late': (2, [2, 3], [1, 1]),
    'nested_late': 'after',
    'nonlocal_late': 5,
    'method_nonlocal_late': ('new', 'new'),
    'annotation_late': {'y': int, 'z': bytes},
    'eager_after_call': ('old', 'new'),
    'nonlocal_param': (1, 1, False),
    'nonlocal_then_read': (50, 5),
    'global_decl': (42, 43, False),
    'dunder_class_decls': (42, False, 43),
    'own_cells': (True, 2),
    'sibling_calls': (7, 3),
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        print('%-5s %-24s -> %r' % ('OK' if r[key] == EXPECTED[key] else 'FAIL', key, r[key]))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-24s is not in EXPECTED' % ('FAIL', extra))
