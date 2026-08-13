"""Fixtures for ClassBodyLocalsTestCase -- locals() inside a class body.

A class body executes as a namespace, so its locals() is the mapping being
built into the class -- not the enclosing function's locals, which Python's
scoping rules say a class body cannot even see as closure names.

Each function answers a plain list/primitive so the Smalltalk test can assert
on it directly.  Every expectation was checked against CPython 3.14, with the
one documented shape difference noted per function: Grail does not seed the
namespace with CPython's implicit __module__ / __qualname__ / __firstlineno__,
so the fixtures compare only names the body itself binds.
"""


def enclosing_local_is_not_in_class_locals():
    """THE POINT.  ``x'' is a local of the enclosing def; a class body does not
    see it, so it must not appear in the class body's locals().  Grail used to
    answer the enclosing FUNCTION's locals here, which listed exactly that."""
    def f(x):
        class C:
            y = x
            def m(self):
                return x
            z = [n for n in locals() if not n.startswith('__')]
        return C
    return sorted(f(1).z)


def only_names_bound_so_far():
    """A class body executes sequentially, so a name bound LATER is absent."""
    class C:
        a = 1
        early = [n for n in locals() if not n.startswith('__')]
        b = 2
        late = [n for n in locals() if not n.startswith('__')]
    return [sorted(C.early), sorted(C.late)]


def methods_are_included():
    """A sibling ``def'' is a class-body binding like any other."""
    class C:
        def m(self):
            return 1
        seen = [n for n in locals() if not n.startswith('__')]
    return sorted(C.seen)


def calling_locals_does_not_pollute():
    """test_scope's testLocalsClass first half: calling locals() must not
    insert a free variable into the class namespace, so the class attribute
    ``x'' keeps the value the body assigned it."""
    def f(x):
        class C:
            x = 12
            def m(self):
                return x
            locals()
        return C
    return f(1).x


def vars_with_no_argument_agrees():
    """Zero-arg vars() is locals() by definition, in a class body too."""
    class C:
        a = 1
        b = 2
        seen = [n for n in vars() if not n.startswith('__')]
    return sorted(C.seen)


def function_locals_still_work_inside_a_method():
    """A method body is a FUNCTION scope, so locals() there is unchanged --
    the class-body rewrite must not capture it."""
    class C:
        def m(self, a):
            b = a + 1
            return sorted(n for n in locals() if n != 'self')
    return C().m(1)
