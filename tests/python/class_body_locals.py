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


# ------------------------------------------------- writing through locals()


def a_write_binds_a_class_attribute():
    """THE WRITE HALF.  CPython's class-body locals() IS the namespace being
    built into the class, so storing into it binds a class attribute -- and the
    body reads it back, because a class-body name read is LOAD_NAME against
    that namespace.  The dict Grail answered was a snapshot, so both halves
    were lost: the attribute never appeared and the read fell through to the
    enclosing scope (test_scope testClassAndGlobal)."""
    looked_up_by_load_name = False

    class X:
        locals()['looked_up_by_load_name'] = True
        passed = looked_up_by_load_name

    return (X.passed, looked_up_by_load_name, X.looked_up_by_load_name)


def a_write_outranks_the_enclosing_closure():
    """test_scope's testClassNamespaceOverridesClosure.  ``x'' is a local of
    the enclosing def, and the class body's own binding -- made through
    locals() -- is what ``y = x'' must see.  The enclosing binding is left
    alone."""
    x = 42

    class X:
        locals()["x"] = 43
        y = x

    return (X.y, x)


def a_write_then_del_leaves_no_attribute():
    """...and the second half of that test: deleting the name the locals()
    write bound leaves the class without it, and still does not touch the
    enclosing x."""
    x = 42

    class X:
        locals()["x"] = 43
        del x

    return (hasattr(X, 'x'), x)


def vars_writes_the_same_namespace():
    """Zero-arg vars() is locals(), for writes as much as for reads."""
    class C:
        vars()['a'] = 7
        b = a
    return (C.a, C.b)


def a_write_through_an_alias_lands_too():
    """The mapping is an OBJECT, not a compile-time spelling: binding it to a
    name and writing through that must work the same way.  This is the shape
    enum's ``Period = vars()'' then ``Period['month_0'] = ...'' uses, and no
    rewrite of ``locals()[k] = v'' as a special form could reach it."""
    class C:
        ns = locals()
        ns['w'] = 5
        got = w
    return (C.got, hasattr(C, 'w'))


def an_enclosing_local_is_still_not_readable():
    """The probe added for the write half must not make a class body see the
    enclosing scope's locals as class-body names -- ``x'' is bound in f, the
    class binds nothing of that name, so the read is the enclosing one (12)
    and the class gets no attribute."""
    def f(x):
        class C:
            locals()['other'] = 1
            y = x
        return C
    c = f(12)
    return (c.y, hasattr(c, 'x'))
