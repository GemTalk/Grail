"""Fixture: a class body that imports inside a ``try''.

CPython executes a class body as a namespace, so EVERY binding form there
produces a class attribute -- ``import'' included.  Grail compiles a class body
structurally, each form declaring which attributes it yields, EXCEPT for the
four compound statements ClassDefAst emits verbatim (``try'', ``for'',
``while'', ``with''): re-deriving their codegen would duplicate it, so the
statements inside them go through their own ordinary emit and each binding form
is responsible for noticing it is in a class body.  Assignment noticed.  The
two import forms did not, so they emitted a bare ``x := ...'' -- an undeclared
Smalltalk temp -- and the binding vanished, or failed to compile at all.

THE SHAPE IS NOT EXOTIC.  It is how the stdlib guards an optional dependency at
class scope, and CPython's own test_socket opens with it:

    class CmsgMacroTests(unittest.TestCase):
        try:
            import _testcapi
        except ImportError:
            socklen_t_limit = 0x7fffffff
        else:
            socklen_t_limit = min(0x7fffffff, _testcapi.INT_MAX)

That class body is why test_socket could not be imported at all: since
``_testcapi'' does not exist here, the emitted reference was to a symbol
nothing declared and the whole module died with a CompileError -- naming the
symbol, but not the class body, the try, or the import.  Over a module that
DOES exist the same shape gets past the compiler and raises NameError when the
class is defined, which is the likelier way to meet it.

``plain_class_body_import'' is the case that always worked, kept because it is
what made the bug look like an import bug: an import written DIRECTLY in a
class body is seen by ClassDefAst and handled.  Only nesting it in a compound
statement moves it onto the path that had the gap -- which is also why all four
compound statements are covered here and not just ``try''.
"""

import math


class TryImportSuccess:
    try:
        import math
    except ImportError:
        limit = 0x7fffffff
    else:
        limit = min(0x7fffffff, math.floor(2.5))


class TryImportMissing:
    try:
        import _no_such_module_for_grail
    except ImportError:
        limit = 0x7fffffff
    else:
        limit = min(0x7fffffff, _no_such_module_for_grail.LIMIT)


class TryFromImport:
    try:
        from math import floor
    except ImportError:
        value = -1
    else:
        value = floor(3.7)


class TryImportAliased:
    try:
        import math as _m
    except ImportError:
        value = -1
    else:
        value = _m.floor(4.2)


class PlainClassBodyImport:
    import math
    value = math.floor(5.9)


class ForBodyImport:
    for _i in range(1):
        import math
        value = math.floor(6.1)


class WhileBodyImport:
    _done = False
    while not _done:
        import math
        value = math.floor(7.2)
        _done = True


class WithBodyImport:
    import contextlib
    with contextlib.suppress(ImportError):
        from math import ceil
        value = ceil(7.2)


def try_import_success():
    return TryImportSuccess.limit


def try_import_missing():
    # The except branch ran, so the class attribute is the fallback -- and the
    # class exists at all, which is the part that used to fail.
    return TryImportMissing.limit


def imported_name_is_a_class_attribute():
    # The binding is a CLASS attribute, exactly as CPython leaves it.
    return TryImportSuccess.math is math


def try_from_import():
    return TryFromImport.value


def try_import_aliased():
    return [TryImportAliased.value, TryImportAliased._m is math]


def plain_class_body_import():
    return [PlainClassBodyImport.value, PlainClassBodyImport.math is math]


def for_body_import():
    return [ForBodyImport.value, ForBodyImport.math is math]


def while_body_import():
    return [WhileBodyImport.value, WhileBodyImport.math is math]


def with_body_import():
    return WithBodyImport.value


def module_scope_import_still_works():
    # The branch this change shares code with, so a regression in either home
    # shows up here.
    return math.floor(8.9)


def function_scope_import_still_works():
    import math as _local
    return _local.floor(9.9)


r = {
    'try_import_success': try_import_success(),
    'try_import_missing': try_import_missing(),
    'imported_name_is_a_class_attribute': imported_name_is_a_class_attribute(),
    'try_from_import': try_from_import(),
    'try_import_aliased': try_import_aliased(),
    'plain_class_body_import': plain_class_body_import(),
    'for_body_import': for_body_import(),
    'while_body_import': while_body_import(),
    'with_body_import': with_body_import(),
    'module_scope_import_still_works': module_scope_import_still_works(),
    'function_scope_import_still_works': function_scope_import_still_works(),
}


EXPECTED = {
    'try_import_success': 2,
    'try_import_missing': 0x7fffffff,
    'imported_name_is_a_class_attribute': True,
    'try_from_import': 3,
    'try_import_aliased': [4, True],
    'plain_class_body_import': [5, True],
    'for_body_import': [6, True],
    'while_body_import': [7, True],
    'with_body_import': 8,
    'module_scope_import_still_works': 8,
    'function_scope_import_still_works': 9,
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-38s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-38s is not in EXPECTED' % ('FAIL', extra))
