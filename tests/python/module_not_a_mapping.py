"""A module is not a mapping, and its errors name its type, ``module``.

Grail's module is a Smalltalk SymbolDictionary, so it inherited the dict
protocol Grail gives dictionaries -- against the kernel dictionary's own slots,
not the module's globals.  ``json['dumps']`` raised KeyError where CPython says
the module is not subscriptable, ``len(json)`` counted those slots,
``json['x'] = 1`` stored an attribute, ``hasattr(json, '__getitem__')`` and
``hasattr(json, 'get')`` were True, and a key that was not a string --
``collections.abc[int]`` -- was an uncatchable MessageNotUnderstood.  Error
messages named the Smalltalk class Grail mints per module: ``'json' object is
not callable``.

Self-running: ``python3 module_not_a_mapping.py`` prints one line per check
against what CPython 3.14 answers.
"""

import collections.abc
import json
import types


class OwnModuleType(types.ModuleType):
    pass


made = types.ModuleType("made")
subclassed = OwnModuleType("subclassed")

PROTOCOL = ("__getitem__", "__setitem__", "__delitem__", "__contains__", "__len__", "__iter__")
DICT_METHODS = ("keys", "values", "items", "get", "pop", "popitem", "update", "setdefault",
                "copy", "clear", "fromkeys")


def _outcome(action):
    try:
        return "ok -> %r" % (action(),)
    except Exception as e:
        return "%s: %s" % (type(e).__name__, e)


def _store(module):
    module["grail_probe"] = 1


def _delete(module):
    del module["dumps"]


def _operations(module):
    return (
        _outcome(lambda: module["dumps"]),
        _outcome(lambda: _store(module)),
        _outcome(lambda: _delete(module)),
        _outcome(lambda: "dumps" in module),
        _outcome(lambda: len(module)),
        _outcome(lambda: iter(module)),
    )


r = {
    "imported_operations": _operations(json),
    "made_operations": _operations(made),
    "subclassed_operations": _operations(subclassed),
    "a_non_string_key": _outcome(lambda: collections.abc[int]),
    "an_object_key": _outcome(lambda: json[object()]),
    "a_store_is_no_attribute": hasattr(json, "grail_probe"),
    "imported_has_protocol": tuple(n for n in PROTOCOL if hasattr(json, n)),
    "made_has_protocol": tuple(n for n in PROTOCOL if hasattr(made, n)),
    "is_a_mapping": isinstance(json, collections.abc.Mapping),
    "calling_names_module": _outcome(lambda: json()),
    "an_operand_names_module": _outcome(lambda: json + 1),
    "a_comparison_names_module": _outcome(lambda: json < json),
    "the_namespace_still_reads": (json.__dict__["dumps"] is json.dumps, "dumps" in vars(json),
                                  getattr(json, "dumps") is json.dumps),
    "a_module_is_true": bool(json),
    "dict_methods": tuple(n for n in DICT_METHODS if hasattr(json, n)),
}

EXPECTED = {
    'a_comparison_names_module': "TypeError: '<' not supported between instances of 'module' and 'module'",
    'a_module_is_true': True,
    'a_non_string_key': "TypeError: 'module' object is not subscriptable",
    'a_store_is_no_attribute': False,
    'an_object_key': "TypeError: 'module' object is not subscriptable",
    'an_operand_names_module': "TypeError: unsupported operand type(s) for +: 'module' and 'int'",
    'calling_names_module': "TypeError: 'module' object is not callable",
    'imported_has_protocol': (),
    'imported_operations': (
        "TypeError: 'module' object is not subscriptable",
        "TypeError: 'module' object does not support item assignment",
        "TypeError: 'module' object does not support item deletion",
        "TypeError: argument of type 'module' is not a container or iterable",
        "TypeError: object of type 'module' has no len()",
        "TypeError: 'module' object is not iterable",
    ),
    'is_a_mapping': False,
    'made_has_protocol': (),
    'made_operations': (
        "TypeError: 'module' object is not subscriptable",
        "TypeError: 'module' object does not support item assignment",
        "TypeError: 'module' object does not support item deletion",
        "TypeError: argument of type 'module' is not a container or iterable",
        "TypeError: object of type 'module' has no len()",
        "TypeError: 'module' object is not iterable",
    ),
    'subclassed_operations': (
        "TypeError: 'OwnModuleType' object is not subscriptable",
        "TypeError: 'OwnModuleType' object does not support item assignment",
        "TypeError: 'OwnModuleType' object does not support item deletion",
        "TypeError: argument of type 'OwnModuleType' is not a container or iterable",
        "TypeError: object of type 'OwnModuleType' has no len()",
        "TypeError: 'OwnModuleType' object is not iterable",
    ),
    'the_namespace_still_reads': (True, True, True),
}

# A Grail limitation this fixture documents: what GRAIL answers, which CPython
# does not (``()'').  module >> update: is Grail's own, written when CallAst
# compiled ``globals()'' to the module itself; it now compiles to a PyModuleDict
# view and nothing sends update: to a module, but a reinstall cannot yet delete
# an env-1 method (#1727).
GRAIL_ONLY = {
    'dict_methods': ('update',),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS,
    sorted(r) == sorted(list(EXPECTED) + list(GRAIL_ONLY)))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-28s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    for k in sorted(GRAIL_ONLY):
        actual = r[k]
        print('%-28s %s %r' % (k, 'XPASS' if actual == GRAIL_ONLY[k] else 'XFAIL', actual))
    print(SUMMARY)
