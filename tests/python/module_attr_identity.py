"""Fixture for ModuleAttrIdentityTestCase.

Grail's Python SymbolDictionary is FLAT, so a class CPython reaches only
through a module gets a flattened Smalltalk name: ``functools_partial`` for
functools.partial, ``sys_flags`` for type(sys.flags), ``string_formatter``
for string.Formatter.  That spelling is an implementation detail, but it
leaked into every Python-visible report:

    functools.partial.__name__      -> 'functools_partial'   (CPython: 'partial')
    string.Formatter.__name__       -> 'string_formatter'    (CPython: 'Formatter')
    numbers.Number.__module__       -> absent                (CPython: 'numbers')
    os.path.__name__                -> 'os_path'             (CPython: 'posixpath')

Every expectation below was read off CPython 3.14 rather than guessed.
``EXPECTED`` is the whole contract in one table; probe() reports what this
interpreter actually answers, so the test compares like with like.
"""

import functools
import numbers
import os
import string
import sys
import time

# (label, __name__, __module__) -- __module__ None means "must be absent".
EXPECTED = [
    ("functools.partial", "partial", "functools"),
    ("functools.partialmethod", "partialmethod", "functools"),
    ("functools.cached_property", "cached_property", "functools"),
    ("type(cache_info())", "CacheInfo", "functools"),
    ("type(cmp_to_key(f)(1))", "KeyWrapper", "functools"),
    ("type(Placeholder)", "_PlaceholderType", "functools"),
    ("numbers.Number", "Number", "numbers"),
    ("numbers.Complex", "Complex", "numbers"),
    ("numbers.Real", "Real", "numbers"),
    ("numbers.Rational", "Rational", "numbers"),
    ("numbers.Integral", "Integral", "numbers"),
    ("os.PathLike", "PathLike", "os"),
    ("string.Formatter", "Formatter", "string"),
    ("time.struct_time", "struct_time", "time"),
    ("type(sys.flags)", "flags", "sys"),
    ("type(sys.float_info)", "float_info", "sys"),
    ("type(sys.hash_info)", "hash_info", "sys"),
    ("type(sys.int_info)", "int_info", "sys"),
    # sys.implementation is a plain types.SimpleNamespace in CPython.
    ("type(sys.implementation)", "SimpleNamespace", "types"),
]


def _subjects():
    return {
        "functools.partial": functools.partial,
        "functools.partialmethod": functools.partialmethod,
        "functools.cached_property": functools.cached_property,
        "type(cache_info())": type(functools.lru_cache()(lambda: 0).cache_info()),
        "type(cmp_to_key(f)(1))": type(functools.cmp_to_key(lambda a, b: 0)(1)),
        "type(Placeholder)": type(functools.Placeholder),
        "numbers.Number": numbers.Number,
        "numbers.Complex": numbers.Complex,
        "numbers.Real": numbers.Real,
        "numbers.Rational": numbers.Rational,
        "numbers.Integral": numbers.Integral,
        "os.PathLike": os.PathLike,
        "string.Formatter": string.Formatter,
        "time.struct_time": time.struct_time,
        "type(sys.flags)": type(sys.flags),
        "type(sys.float_info)": type(sys.float_info),
        "type(sys.hash_info)": type(sys.hash_info),
        "type(sys.int_info)": type(sys.int_info),
        "type(sys.implementation)": type(sys.implementation),
    }


def _absent(fn):
    """True when the attribute is absent, as CPython reports it."""
    try:
        fn()
    except AttributeError:
        return True
    return False


def _attr(o, name):
    """Attribute value, or '<absent>' -- never raises, so one broken entry
    cannot hide the verdict on the other eighteen."""
    try:
        return getattr(o, name)
    except AttributeError:
        return "<absent>"


def report():
    """One line per entry: 'label|__name__|__module__'. Compared to EXPECTED."""
    subs = _subjects()
    lines = []
    for label, _, _ in EXPECTED:
        o = subs[label]
        lines.append("%s|%s|%s" % (label, _attr(o, "__name__"), _attr(o, "__module__")))
    return "\n".join(lines)


def expected():
    return "\n".join("%s|%s|%s" % row for row in EXPECTED)


def probe():
    import html.entities

    return {
        "matches_expected": report() == expected(),
        "report": report(),
        # Modules keep their real dotted name, not the flattened class name.
        "os_path_name": _attr(os.path, "__name__"),
        "html_entities_name": _attr(html.entities, "__name__"),
        # The one instance in the set that carries __module__ in CPython...
        "placeholder_module": _attr(functools.Placeholder, "__module__"),
        # ...and the structseq singletons, which do not.
        "sys_flags_instance_absent": _absent(lambda: sys.flags.__module__),
        "sys_impl_instance_absent": _absent(lambda: sys.implementation.__module__),
        # __qualname__ tracks __name__ for these (all top-level in their module).
        "partial_qualname": _attr(functools.partial, "__qualname__"),
        "formatter_qualname": _attr(string.Formatter, "__qualname__"),
    }
