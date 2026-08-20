"""Fixture for BuiltinNamespaceNarrowingTestCase.

An unqualified name in Python resolves through LEGB and then the BUILTINS
namespace -- and nowhere else.  Grail compiles to Smalltalk, where a bare
identifier resolves against the user's whole symbol list, and Grail's own
``Python`` SymbolDictionary doubles as its implementation namespace.  So a
name that CPython would never resolve used to bind anyway:

  * implementation classes    -- PyDict, PyRawSocket, BoundMethod
  * module classes            -- json, math (with no import at all)
  * flattened module attrs    -- sys_flags, os_path
  * the entire GemStone kernel -- Array, OrderedCollection
  * and worst, a WRONG object -- ``Decimal`` bound to GemStone's ScaledDecimal

Every ``_missing`` entry below is a NameError in CPython.  The ``_works``
entries are the other half of the contract: narrowing must not disturb real
builtins, real imports, module globals, or the module dunders (which are
module attributes, not builtins, and are deliberately excluded from the
manifest).
"""

MODULE_GLOBAL = "module-global"


def _nameerror(fn):
    """True when fn() raises NameError -- CPython's answer for every probe."""
    try:
        fn()
    except NameError:
        return True
    except Exception:
        return False
    return False


def probe():
    return {
        # --- names CPython does not resolve: all must raise NameError ---
        "impl_class_missing": _nameerror(lambda: PyDict),
        "impl_boundmethod_missing": _nameerror(lambda: BoundMethod),
        "module_class_missing": _nameerror(lambda: json),
        "module_math_missing": _nameerror(lambda: math),
        "flattened_attr_missing": _nameerror(lambda: sys_flags),
        "flattened_ospath_missing": _nameerror(lambda: os_path),
        "kernel_array_missing": _nameerror(lambda: Array),
        "kernel_collection_missing": _nameerror(lambda: OrderedCollection),
        # ``Decimal`` is the sharp one: it used to bind to GemStone's
        # ScaledDecimal, so code got a wrong object rather than an error.
        "wrong_object_missing": _nameerror(lambda: Decimal),
        # --- the contract the narrowing must not break ---
        "builtin_type_works": int("7"),
        "builtin_exception_works": ValueError("boom").args[0],
        "builtin_func_works": len([1, 2, 3]),
        "builtin_constant_works": True is not None,
        "module_global_works": MODULE_GLOBAL,
        "module_dunder_works": __name__,
        "import_works": _imported(),
        "from_import_works": _from_imported(),
    }


def _imported():
    import json

    return json.dumps([1])


def _from_imported():
    from math import floor

    return floor(2.7)
