"""Fixture: ``__class__`` in a CLASS BODY is the ENCLOSING class.

Not the class being defined -- that class does not exist yet while its body is
running, which is exactly why it cannot be the answer.  CPython makes
``__class__`` a free variable of the enclosing scope, so for a class nested in a
method it is the class that METHOD was defined in:

    class Host:
        def run(self):
            class X:
                x = __class__          # Host, not X

Grail resolved this to a BoundMethod for ``builtins.__class__`` -- an object with
no relationship to any class at all -- because the ``__class__`` codegen branch
stood down inside a class body (correctly, since the inner class is not the
answer) and the read then fell all the way through to a module-attribute lookup.
Nothing errored; ``X.x is type(self)`` was simply False.  That is test_super's
test_various___class___pathologies.

Both ways of reaching the enclosing class are covered, because they compile
differently: a module-scope enclosing class is read off the module instance,
while a method-local one is reached through the closure cell that holds it --
and the cell store is only emitted for names registered as captured, so the
read has to register itself against the ENCLOSING class rather than the inner
one.

With NO enclosing class, CPython raises NameError -- covered here for both
shapes that have none: a class body at module scope, and a class body nested
directly inside another class body (a class body is not a function scope, so
the name does not resolve through it).
"""


class Host:
    def run(self):
        class X:
            x = __class__

            @staticmethod
            def f():
                # Referencing __class__ from a METHOD of the inner class is the
                # ORDINARY rule and must be unaffected: here it is X.  Written as
                # a @staticmethod deliberately -- a bare ``def f():`` called as
                # ``X.f()`` is a SEPARATE Grail gap ("unbound method 'f' must be
                # called with an instance"), and letting it in here would make
                # this fixture fail for a reason that has nothing to do with
                # __class__.
                return __class__
        return X


def make_local_host():
    # The enclosing class is itself method-local, so it is reached through its
    # closure cell rather than as a module attribute.
    class LocalHost:
        def run(self):
            class Y:
                y = __class__
            return Y
    return LocalHost


r = {}

_X = Host().run()
r['enclosing_is_module_scope_class'] = _X.x is Host
r['inner_method_still_gets_inner_class'] = _X.f() is _X
r['inner_class_is_not_the_answer'] = _X.x is not _X

_LocalHost = make_local_host()
_Y = _LocalHost().run()
r['enclosing_is_method_local_class'] = _Y.y is _LocalHost

# No enclosing class: NameError in both shapes.
try:
    class AtModuleScope:
        x = __class__
    r['module_scope_body'] = 'NOT RAISED'
except NameError:
    r['module_scope_body'] = 'NameError'

try:
    class Outer:
        class Inner:
            x = __class__
    r['class_body_in_class_body'] = 'NOT RAISED'
except NameError:
    r['class_body_in_class_body'] = 'NameError'


EXPECTED = {
    'enclosing_is_module_scope_class': True,
    'inner_method_still_gets_inner_class': True,
    'inner_class_is_not_the_answer': True,
    'enclosing_is_method_local_class': True,
    'module_scope_body': 'NameError',
    'class_body_in_class_body': 'NameError',
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-4s %s -> %r' % ('OK' if actual == expected else 'FAIL',
                                 key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('FAIL', extra))
