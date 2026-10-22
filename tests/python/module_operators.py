"""An operator a module does not support raises CPython's TypeError.

``-mod``, ``+mod``, ``~mod`` and ``abs(mod)`` each send a unary protocol method
the module does not have.  Grail's module answers an unknown no-argument send
with nil -- a bare-annotation slot reads that way -- so each of them handed a
raw Smalltalk nil to Python, ``<UndefinedObject object>``, where CPython raises
TypeError.  ``reversed(mod)`` answered KeyValueDictionary's iterator over the
kernel dictionary's slots, since a module is a SymbolDictionary.

A ModuleType subclass that defines the method still gets it, and a module's
attributes read as before.  Self-running: ``python3 module_operators.py`` prints
one line per check against what CPython 3.14 answers.
"""

import json
import types


class OwnModuleType(types.ModuleType):
    def __neg__(self):
        return "the subclass's __neg__"


made = types.ModuleType("made")
subclassed = OwnModuleType("subclassed")


def _outcome(action):
    try:
        return "ok -> %r" % (action(),)
    except Exception as e:
        return "%s: %s" % (type(e).__name__, e)


def _operators(module):
    return (
        _outcome(lambda: -module),
        _outcome(lambda: +module),
        _outcome(lambda: ~module),
        _outcome(lambda: abs(module)),
        _outcome(lambda: reversed(module)),
    )


r = {
    "imported_operators": _operators(json),
    "made_operators": _operators(made),
    "a_subclass_defines_neg": _outcome(lambda: -subclassed),
    "a_subclass_lacks_abs": _outcome(lambda: abs(subclassed)),
    "has_the_methods": tuple(n for n in ("__neg__", "__pos__", "__invert__", "__abs__", "__reversed__")
                             if hasattr(json, n)),
    "attributes_still_read": (json.dumps is getattr(json, "dumps"), json.__name__, made.__name__),
    "a_missing_attribute": _outcome(lambda: json.no_such_name),
}

EXPECTED = {
    'a_missing_attribute': "AttributeError: module 'json' has no attribute 'no_such_name'",
    'a_subclass_defines_neg': 'ok -> "the subclass\'s __neg__"',
    'a_subclass_lacks_abs': "TypeError: bad operand type for abs(): 'OwnModuleType'",
    'attributes_still_read': (True, 'json', 'made'),
    'has_the_methods': (),
    'imported_operators': (
        "TypeError: bad operand type for unary -: 'module'",
        "TypeError: bad operand type for unary +: 'module'",
        "TypeError: bad operand type for unary ~: 'module'",
        "TypeError: bad operand type for abs(): 'module'",
        "TypeError: 'module' object is not reversible",
    ),
    'made_operators': (
        "TypeError: bad operand type for unary -: 'module'",
        "TypeError: bad operand type for unary +: 'module'",
        "TypeError: bad operand type for unary ~: 'module'",
        "TypeError: bad operand type for abs(): 'module'",
        "TypeError: 'module' object is not reversible",
    ),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-26s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    print(SUMMARY)
