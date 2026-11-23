"""Fixture: an import binding a ``nonlocal`` name past a method-local class (#2233).

In a method of a class defined inside a function, ``nonlocal x; import os as
x`` binds the FUNCTION's x.  The method is compiled apart from that function,
so x is no temp of it; an assignment to the same name already wrote it through
the class's setter cell, but the import wrote a bare ``x := ...'', which did
not compile, and the whole method became a codegen-gap stub on both paths.

NonlocalImportPastClassTestCase loads this file under each codegen path and
asserts that every recorded value is EXPECTED, which is CPython 3.14's answer
(run this file directly).
"""

r = {}


def record(key, fn):
    try:
        r[key] = repr(fn())
    except Exception as exc:
        r[key] = '%s: %s' % (type(exc).__name__, exc)


# The issue's repro.
def import_as():
    x = 1

    class C:
        def m(self):
            nonlocal x
            import os as x
    C().m()
    return x.__name__


# The unaliased form binds the top-level name.
def import_plain():
    os = None

    class C:
        def m(self):
            nonlocal os
            import os
    C().m()
    return os.__name__


# A dotted import with an alias binds the LEAF.
def import_dotted_as():
    p = None

    class C:
        def m(self):
            nonlocal p
            import os.path as p
    C().m()
    return p.__name__ == __import__('os').path.__name__


# from-import, aliased and not.
def from_import_as():
    j = None

    class C:
        def m(self):
            nonlocal j
            from os import path as j
    C().m()
    return j.__name__ == __import__('os').path.__name__


def from_import_plain():
    sep = None

    class C:
        def m(self):
            nonlocal sep
            from os import sep
    C().m()
    return sep == __import__('os').sep


# Several aliases in one statement, only one of them nonlocal.
def import_several():
    a = None

    class C:
        def m(self):
            nonlocal a
            import os as a, sys as b
            return b.__name__
    got = C().m()
    return a.__name__, got


# The import in a def nested in the method: still the outer function's name.
def import_in_nested_def():
    x = None

    class C:
        def m(self):
            def g():
                nonlocal x
                import os as x
            g()
    C().m()
    return x.__name__


# Read back inside the method after the import.
def import_then_read():
    x = None

    class C:
        def m(self):
            nonlocal x
            import os as x
            return x.__name__
    return C().m(), x.__name__


# Control: without ``nonlocal`` the import binds the method's own local.
def import_without_nonlocal():
    x = 1

    class C:
        def m(self):
            import os as x
            return x.__name__
    return C().m(), x


# Control: an import directly in the class body binds a class attribute.
def import_in_class_body():
    x = 1

    class C:
        import os as x
    return C.x.__name__, x


record('import_as', import_as)
record('import_plain', import_plain)
record('import_dotted_as', import_dotted_as)
record('from_import_as', from_import_as)
record('from_import_plain', from_import_plain)
record('import_several', import_several)
record('import_in_nested_def', import_in_nested_def)
record('import_then_read', import_then_read)
record('import_without_nonlocal', import_without_nonlocal)
record('import_in_class_body', import_in_class_body)


EXPECTED = {
    'import_as': "'os'",
    'import_plain': "'os'",
    'import_dotted_as': 'True',
    'from_import_as': 'True',
    'from_import_plain': 'True',
    'import_several': "('os', 'sys')",
    'import_in_nested_def': "'os'",
    'import_then_read': "('os', 'os')",
    'import_without_nonlocal': "('os', 1)",
    'import_in_class_body': "('os', 1)",
}


def mismatches():
    """The rows that differ from CPython's, as 'key: got X, CPython Y'."""
    return ['%s: got %s, CPython %s' % (k, r.get(k), v)
            for k, v in EXPECTED.items() if r.get(k) != v]


if __name__ == '__main__':
    for k in EXPECTED:
        print('%-4s %-26s %s' % ('OK' if r[k] == EXPECTED[k] else 'DIFF', k, r[k]))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('DIFF %s is not in EXPECTED' % extra)
