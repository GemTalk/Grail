"""``sys.stdlib_module_names`` names Python's standard library.

Driven by PythonTests>>StdlibModuleNamesTestCase.

It was an empty frozenset in Grail.  ``traceback.py`` reads it to answer "Did
you forget to import 'io'?" for a NameError that names a stdlib module, so with
it empty that hint could never fire.

CPython's value is a BUILD-TIME CONSTANT compiled into the interpreter, not a
runtime scan of the stdlib directory -- so Grail vendoring the name list
(scripts/cpython_314_stdlib_modules.txt) is the faithful implementation rather
than a shortcut.

The list describes PYTHON's standard library, not what Grail currently ships:
there is no ``io.py`` or ``_io`` in src/python/stdlib yet, and the hint still
names them, because it is advice about the language.  An import of a module
Grail lacks then fails loudly on its own.  Deriving the set from Grail's own
stdlib directory instead was considered and rejected: it cannot answer the two
cases the hint exists for.

The checks below deliberately avoid asserting a COUNT.  The vendored file has
297 names and the CPython 3.14.6 interpreter this runs against reports 290, so a
count check would pin one of them and fail on the other while telling you
nothing about behaviour.  The Smalltalk driver has the exact set comparison
against the vendored file, where it belongs -- under CPython that check would
compare CPython's own list against Grail's file and fail for the wrong reason.
"""

import sys
import traceback


def _last_line(fn):
    try:
        fn()
    except NameError as e:
        text = "".join(traceback.format_exception(type(e), e, e.__traceback__))
        return text.strip().splitlines()[-1]
    return None


def it_is_a_frozenset():
    return isinstance(sys.stdlib_module_names, frozenset)


def it_is_not_empty():
    return len(sys.stdlib_module_names) > 100


def it_contains_public_modules():
    return all(n in sys.stdlib_module_names
               for n in ('io', 'json', 'os', 'sys', 'traceback', 'zlib'))


def it_contains_private_modules():
    """The underscored ones matter: they are half of what the hint is for."""
    return all(n in sys.stdlib_module_names for n in ('_io', '_abc', '_codecs'))


def it_excludes_non_modules():
    return not any(n in sys.stdlib_module_names
                   for n in ('notamodule', 'grail', 'definitely_not_stdlib'))


def a_stdlib_name_gets_an_import_hint():
    def use_io():
        return io.StringIO()          # noqa: F821  -- deliberately undefined
    return "forget to import 'io'" in (_last_line(use_io) or '')


def a_private_stdlib_name_gets_an_import_hint():
    def use_private_io():
        return _io.StringIO()         # noqa: F821  -- deliberately undefined
    return "forget to import '_io'" in (_last_line(use_private_io) or '')


def a_non_stdlib_name_gets_no_import_hint():
    """The guard rail: the hint must not fire for an ordinary misspelling."""
    def use_nonsense():
        return definitely_not_stdlib  # noqa: F821  -- deliberately undefined
    return 'forget to import' not in (_last_line(use_nonsense) or '')


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    checks = [
        it_is_a_frozenset,
        it_is_not_empty,
        it_contains_public_modules,
        it_contains_private_modules,
        it_excludes_non_modules,
        a_stdlib_name_gets_an_import_hint,
        a_private_stdlib_name_gets_an_import_hint,
        a_non_stdlib_name_gets_no_import_hint,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
