"""Fixture: class-body VALUE expressions of method-local classes (plan P3.3).

On the IR arm a ``class`` statement inside a def is built by a helper method of
its own -- CPython's class-body frame.  Since P3.3 that helper is built through
IR for a body whose attribute values, defaults and bare constants are ordinary
expressions, not only constants: every name in them is read the way CPython's
LOAD_NAME reads it in a class body -- the class namespace first, but only for a
name a statement ABOVE has bound, then the enclosing scopes.  Each check here
is one observable consequence of that, and every expectation is CPython 3.14's,
verified by running this file directly.

With the helper compiled from TEXT (``GRAIL_IR_CLASS_HELPER=0``, and the text
arm) ``body_frame`` fails: a declarative text helper is not a Python frame for
``sys._getframe``, so the class body has no frame of its own there.  On the
text arm ``error_frames`` also lacks the class-body frame.

* ``namespace_reads``: a prior attribute, a sibling def (the function itself),
  a builtin, a module function and a module variable, each read as a
  class-body value.
* ``not_yet_bound``: a name the body binds LATER reads the module's binding.
* ``enclosing_reads``: the enclosing def's parameter and local, and a local of
  a def two levels out.
* ``unbound_free``: a free variable read before the enclosing def binds it.
* ``chained``: ``a = b = []`` binds one object under both names.
* ``defaults``: defaults that read a prior attribute, a module name and an
  enclosing local, evaluated once, at the def.
* ``descriptors``: ``property(getter)`` and ``staticmethod(f)`` over sibling
  defs, the usual way a class body builds descriptors.
* ``annotations``: a method's annotations, alongside a non-constant default.
* ``body_frame``: inside a class-body expression the running frame is the class
  body's, named for the class, at that expression's line.
* ``error_frames``: an error raised by a class-body expression is reported in
  the class-body frame, at its line, below the enclosing def.
"""

import sys
import traceback

r = {}

G = 10
later = 'module later'


def modfunc(n):
    return n * 2


def namespace_reads():
    class C:
        base = G + 1
        twice = base * 2

        def meth(self):
            return 'meth'
        alias = meth
        ln = len
        mf = modfunc
        mv = G
        computed = modfunc(base)
        ...
    return (C.base, C.twice, C.__dict__['alias'] is C.__dict__['meth'],
            C.alias(None), C.ln('abc'), C.mf is modfunc, C.mv,
            C.computed)


def not_yet_bound():
    class C:
        early = later
        later = 'class later'
        after = later
    return C.early, C.after


def enclosing_reads(p):
    q = p + 1

    def inner():
        class C:
            a = p
            b = q
            c = (p, q, G)
        return C
    C = inner()
    return C.a, C.b, C.c


def unbound_free():
    try:
        class C:
            y = z
    except NameError as e:
        msg = str(e)
    z = 1
    return type(z).__name__, msg


def chained():
    class C:
        a = b = []
        c = d = modfunc(3)
    return C.a is C.b, C.c, C.d


def defaults(local):
    calls = []

    def note(v):
        calls.append(v)
        return v

    class C:
        k = 5

        def m(self, a=k, b=G, c=local, d=note('d')):
            return a, b, c, d
    return C().m(), calls


def descriptors():
    class C:
        def _get(self):
            return 'got'
        x = property(_get)

        def _helper():
            return 'helped'
        helper = staticmethod(_helper)
    return C().x, C.helper(), type(C.__dict__['x']).__name__


def annotations():
    class C:
        def m(self, x: int, y=modfunc(1)) -> str:
            return str(x + y)
    return C().m(1), C.m.__annotations__


def body_frame():
    class C:
        name = sys._getframe(0).f_code.co_name
        line = sys._getframe(0).f_lineno
        caller = sys._getframe(1).f_code.co_name
    return C.name, C.line - BASE, C.caller


BASE = sys._getframe().f_lineno


def error_frames():
    try:
        class C:
            ok = 1
            boom = 1 // 0              # BASE + 7
    except ZeroDivisionError as e:
        tb = traceback.extract_tb(e.__traceback__)
        return [(f.name, f.lineno - BASE) for f in tb]


r['namespace_reads'] = namespace_reads()
r['not_yet_bound'] = not_yet_bound()
r['enclosing_reads'] = enclosing_reads(3)
r['unbound_free'] = unbound_free()
r['chained'] = chained()
r['defaults'] = defaults('loc')
r['descriptors'] = descriptors()
r['annotations'] = annotations()
r['body_frame'] = body_frame()
r['error_frames'] = error_frames()


EXPECTED = {
    'namespace_reads': (11, 22, True, 'meth', 3, True, 10, 22),
    'not_yet_bound': ('module later', 'class later'),
    'enclosing_reads': (3, 4, (3, 4, 10)),
    'unbound_free': ('int', "cannot access free variable 'z' where it is not "
                            "associated with a value in enclosing scope"),
    'chained': (True, 6, 6),
    'defaults': (((5, 10, 'loc', 'd'), ['d'])),
    'descriptors': ('got', 'helped', 'property'),
    'annotations': ('3', {'x': int, 'return': str}),
    'body_frame': ('C', -5, 'body_frame'),
    'error_frames': [('error_frames', 5), ('C', 7)],
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        print('%-5s %-24s -> %r' % ('OK' if r[key] == EXPECTED[key] else 'FAIL', key, r[key]))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-24s is not in EXPECTED' % ('FAIL', extra))
