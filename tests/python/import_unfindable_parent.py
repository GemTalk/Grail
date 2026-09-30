"""Fixtures for importing a dotted name whose PARENT package cannot be found.

Driven by PythonTests>>TracebackTestCase>>testImportOfAnUnfindableParentRaises.
Each check answers True when the behaviour matches CPython.

``__import__('a.b')'' with no fromlist answers the TOP package, ``a''.  Grail
answered whatever its registry held under ``a'' -- and when the leaf ``a.b''
could be found but ``a'' could not, that was nil.  Nothing raised.  So:

    import a.b as m        UnboundLocalError: local variable referenced before
                           assignment (received #'b' on nil)   -- in a def
                           NameError: name 'm' is not defined  -- at module level
    import a.b             binds ``a'' to nil, which reads as unbound

where CPython raises ``ModuleNotFoundError: No module named 'a''', the error
``import a'' and ``from a import b'' already gave.  CPython's __import__ ends by
importing the top package itself, and that import is what raises.

It is not a contrived case.  A module compiled into a GemStone repository is
found by its full name from a session whose sys.path does not reach its
package: ``gemdb -c 'import brainfreeze.analysis as analysis''' run from
outside the checkout produced the UnboundLocalError above, naming neither the
package nor the path.  Here the leaf is put in sys.modules with no parent,
which is the same shape and is portable to CPython.

Run this file under CPython (``python3 tests/python/import_unfindable_parent.py'')
to see what it produces -- that is where the expectations come from.
"""

import sys
import types

PARENT = 'grail_unfindable_parent_pkg'
LEAF = PARENT + '.leaf'


def _with_leaf_only(fn):
    """Run fn() with LEAF in sys.modules and PARENT absent, then clean up."""
    sys.modules.pop(PARENT, None)
    sys.modules[LEAF] = types.ModuleType(LEAF)
    try:
        return fn()
    finally:
        sys.modules.pop(LEAF, None)
        sys.modules.pop(PARENT, None)


def _raises_module_not_found_for_parent(source):
    def go():
        try:
            exec(source, {})
        except ModuleNotFoundError as e:
            return type(e).__name__ == 'ModuleNotFoundError'
        except Exception:
            return False
        return False
    return _with_leaf_only(go) is True


def dunder_import_of_the_leaf_raises():
    """The primitive every other form goes through."""
    def go():
        try:
            __import__(LEAF)
        except ModuleNotFoundError:
            return True
        except Exception:
            return False
        return False
    return _with_leaf_only(go) is True


def the_error_names_the_parent_package():
    def go():
        try:
            __import__(LEAF)
        except ModuleNotFoundError as e:
            return str(e) == "No module named '%s'" % PARENT
        return False
    return _with_leaf_only(go) is True


def the_error_carries_the_parent_as_its_name():
    """``e.name'' is what importlib.util and pkgutil callers compare against."""
    def go():
        try:
            __import__(LEAF)
        except ModuleNotFoundError as e:
            return getattr(e, 'name', None) == PARENT
        return False
    return _with_leaf_only(go) is True


def import_as_in_a_function_raises_module_not_found():
    """The reported form: UnboundLocalError, naming neither module nor path."""
    return _raises_module_not_found_for_parent(
        'def f():\n'
        '    import %s as m\n'
        '    return m\n'
        'f()\n' % LEAF)


def import_as_at_module_level_raises_module_not_found():
    """Where it read ``NameError: name 'm' is not defined''."""
    return _raises_module_not_found_for_parent('import %s as m\n' % LEAF)


def a_plain_dotted_import_raises_module_not_found():
    """``import a.b'' binds ``a'', and ``a'' was nil."""
    return _raises_module_not_found_for_parent('import %s\n' % LEAF)


def a_from_import_still_raises_module_not_found():
    """Unchanged, and the form the others now agree with."""
    return _raises_module_not_found_for_parent('from %s import leaf\n' % PARENT)


def with_the_parent_present_import_as_binds_the_leaf():
    """The guard: nothing that worked may change.  With both in sys.modules the
    alias binds the leaf, reached as an attribute of the parent."""
    sys.modules.pop(PARENT, None)
    parent = types.ModuleType(PARENT)
    leaf = types.ModuleType(LEAF)
    parent.leaf = leaf
    sys.modules[PARENT] = parent
    sys.modules[LEAF] = leaf
    try:
        ns = {}
        exec('import %s as m\n' % LEAF, ns)
        return ns.get('m') is leaf
    finally:
        sys.modules.pop(LEAF, None)
        sys.modules.pop(PARENT, None)


def with_the_parent_present_a_plain_import_binds_the_parent():
    sys.modules.pop(PARENT, None)
    parent = types.ModuleType(PARENT)
    leaf = types.ModuleType(LEAF)
    parent.leaf = leaf
    sys.modules[PARENT] = parent
    sys.modules[LEAF] = leaf
    try:
        ns = {}
        exec('import %s\n' % LEAF, ns)
        return ns.get(PARENT) is parent
    finally:
        sys.modules.pop(LEAF, None)
        sys.modules.pop(PARENT, None)


CHECKS = (
    dunder_import_of_the_leaf_raises,
    the_error_names_the_parent_package,
    the_error_carries_the_parent_as_its_name,
    import_as_in_a_function_raises_module_not_found,
    import_as_at_module_level_raises_module_not_found,
    a_plain_dotted_import_raises_module_not_found,
    a_from_import_still_raises_module_not_found,
    with_the_parent_present_import_as_binds_the_leaf,
    with_the_parent_present_a_plain_import_binds_the_parent,
)


if __name__ == '__main__':
    for check in CHECKS:
        print('%-4s %s' % ('OK' if check() is True else 'FAIL', check.__name__))
