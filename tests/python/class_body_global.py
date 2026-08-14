"""Fixtures for ClassBodyGlobalTestCase -- ``global'' declared in a CLASS body.

A class body is a scope, so it can declare ``global x'' -- and then ``x = 13''
there rebinds the MODULE's x, and the class gets no ``x'' attribute at all:

    x = 12
    class Global:
        global x
        x = 13          # module x becomes 13; Global has no 'x'

Grail read the declaration for neither half: it bound a class attribute and left
the module binding at 12.  Exactly the shape the ``nonlocal'' case had, one
scope further out.

The ordering matters and is what makes this more than a routing change: a class
body runs top to bottom, so an attribute BEFORE the write sees the old value and
one AFTER it sees the new.

Every expectation was checked against CPython 3.14.
"""

gx = 12
gy = 100
gz = 1


class Global:
    global gx
    gx = 13

    def get(self):
        return gx


def module_level_class_body_global():
    """The class body's ``global gx; gx = 13'' rebinds the MODULE gx, a method
    reading the name sees 13, and Global has no gx attribute -- CPython keeps it
    out of the class __dict__ entirely."""
    return (gx, Global().get(), hasattr(Global, 'gx'))


def attributes_around_the_write_see_source_order():
    """THE ORDERING CASE.  ``x'' is read before the write and ``y'' after it, so
    a fix that emitted the write after all the attribute initialisers would
    answer y == 1."""
    class C:
        global gz
        x = gz
        gz = 2
        y = gz
    return (C.x, C.y, gz, hasattr(C, 'gz'))


def a_method_assigning_the_name_is_still_local():
    """``gy = val'' inside a METHOD is an ordinary method local: the class
    body's declaration governs the class body, not its methods."""
    class C:
        global gy
        gy = 101

        def set(self, val):
            gy = val
            return gy

        def get(self):
            return gy
    c = C()
    return (c.set(999), c.get(), gy)


def an_undeclared_class_attribute_is_unaffected():
    """Only the declared name is exempt: a sibling assignment in the same body
    is still an ordinary class attribute."""
    class D:
        global gx
        gx = 21
        kept = 22
    return (gx, D.kept, hasattr(D, 'gx'))


# ------------------------------------------------------------------ inside exec

SRC_GLOBAL = """if 1:
    x = 12
    class D:
        global x
        x = 13
        def get(self):
            return x
    got = D().get()
    after = x
    has_attr = hasattr(D, 'x')
"""

SRC_ORDER = """if 1:
    z = 1
    class C:
        global z
        x = z
        z = 2
        y = z
    vals = (C.x, C.y, z)
"""


def _exec_get(src, keys):
    ns = {}
    exec(src, ns)
    return tuple(ns[k] for k in keys)


def exec_class_body_global():
    return _exec_get(SRC_GLOBAL, ['got', 'after', 'has_attr'])


def exec_class_body_global_ordering():
    """The doit path routes the write through the scope handle rather than the
    module instance, so it needs its own ordering check."""
    return _exec_get(SRC_ORDER, ['vals'])[0]
