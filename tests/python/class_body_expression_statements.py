# A bare EXPRESSION statement in a class body, which CPython executes at
# class-definition time like any other body statement.
#
#     class Foo(Enum):
#         vars().update({'FOO_CAT': 'aloof', 'FOO_HORSE': 'big'})
#
# Grail compiles a class body STRUCTURALLY -- it scans the body for the names it
# binds and emits one store per name -- so a statement that binds no name
# carried nothing to emit and was DROPPED whole.  A class-body ``print(...)''
# produced no output and no error; the ``vars().update(...)'' idiom above, which
# is how test_enum defines members computed at runtime, silently produced an
# enum with no members at all.
#
# Two halves had to work:
#
#   * the statement must be EMITTED (ClassDefAst), alongside the try/for/while/
#     with statements that already were;
#   * ``.update()'' on the class-body vars() must reach the class.  dict's
#     mutators store with at:put: rather than through __setitem__ -- right for a
#     dict, since CPython's dict.update does not call a subclass's __setitem__
#     either, but wrong for a namespace whose whole job is to be connected.
#     Subscript assignment already went through __setitem__ and worked.
#
# The class-body namespace stays a snapshot for READS (docs/Class_Body_Namespace.md);
# nothing here depends on reading a name back.
#
# Emitting the statement then exposed two things a dropped statement had hidden,
# both about a comprehension in a class body: a free name there skips the class
# namespace (so it is a global read, not a class attribute), and a WALRUS there
# is a SyntaxError CPython raises at compile time.
#
# test_enum test_dynamic_members_with_static_methods, test_listcomps
# test_name_error_in_class_scope, test_named_expressions
# test_named_expression_invalid_in_class_body.

from enum import Enum


def a_bare_call_runs():
    """The statement executes; its side effect is visible afterwards."""
    seen = []

    class C:
        seen.append('ran')

    return seen == ['ran']


def vars_update_defines_class_attributes():
    class C:
        vars().update({'A': 1, 'B': 2})

    return C.A == 1 and C.B == 2


def vars_update_keyword_form_defines_them_too():
    class C:
        vars().update({'A': 1}, B=2)

    return C.A == 1 and C.B == 2


def vars_setdefault_defines_one():
    class C:
        X = 1
        vars().setdefault('X', 99)
        vars().setdefault('Y', 2)

    return C.X == 1 and C.Y == 2


def vars_update_defines_enum_members():
    """The shape test_enum uses: members computed at class-definition time."""
    defines = {'FOO_CAT': 'aloof', 'BAR_DOG': 'friendly', 'FOO_HORSE': 'big'}

    class Foo(Enum):
        vars().update({k: v for k, v in defines.items() if k.startswith('FOO_')})

        def upper(self):
            return self.value.upper()

    return (list(Foo) == [Foo.FOO_CAT, Foo.FOO_HORSE]
            and Foo.FOO_CAT.value == 'aloof'
            and Foo.FOO_HORSE.upper() == 'BIG')


def a_duplicate_member_is_still_refused():
    """The write reaches enum's namespace, so the namespace can refuse it --
    the keyword half repeats a name the positional half already defined."""
    defines = {'FOO_CAT': 'aloof', 'FOO_HORSE': 'big'}
    try:
        class Foo(Enum):
            vars().update(defines, **{'FOO_CAT': 'small'})
    except TypeError as e:
        return str(e) == "'FOO_CAT' already defined as 'aloof'"
    return False


def a_docstring_is_not_executed_as_a_statement():
    """The leading bare string is lifted into __doc__, not evaluated."""

    class C:
        """the docstring"""

    return C.__doc__ == 'the docstring'


def a_class_body_comprehension_skips_class_scope():
    """A comprehension is its own scope and does not see the class namespace,
    so ``y'' here is a global read -- and there is no global ``y''."""
    src = 'class _C:\n    y = 1\n    [x + y for x in range(2)]\n'
    try:
        exec(src, {})
    except NameError as e:
        return str(e) == "name 'y' is not defined"
    return False


def a_class_body_comprehension_may_not_walrus():
    """PEP 572 forbids it: a walrus binds in the scope ENCLOSING the
    comprehension, and a comprehension cannot write to a class namespace.  So
    CPython refuses the program at compile time rather than pick an answer."""
    src = 'class Foo():\n    [(42, 1 + ((( j := i )))) for i in range(5)]\n'
    try:
        exec(src, {}, {})
    except SyntaxError as e:
        return ('assignment expression within a comprehension cannot be used '
                'in a class body') in str(e)
    return False


def a_walrus_in_a_method_comprehension_is_fine():
    """The enclosing scope is then the function, not the class."""

    class C:
        def m(self):
            return [(j := i) for i in range(3)]

    return C().m() == [0, 1, 2]


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    checks = [
        a_bare_call_runs,
        vars_update_defines_class_attributes,
        vars_update_keyword_form_defines_them_too,
        vars_setdefault_defines_one,
        vars_update_defines_enum_members,
        a_duplicate_member_is_still_refused,
        a_docstring_is_not_executed_as_a_statement,
        a_class_body_comprehension_skips_class_scope,
        a_class_body_comprehension_may_not_walrus,
        a_walrus_in_a_method_comprehension_is_fine,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
