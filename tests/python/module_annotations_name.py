"""Fixture: a module's ``__annotations__`` is no global until it is read as an attribute.

PEP 649 keeps a module's annotations behind ``__annotate__``; CPython's
module type computes ``mod.__annotations__`` from it on first read and only
then caches the dict in the namespace.  So until something reads the
attribute, the bare name ``__annotations__`` -- at module level or in a
function -- is a NameError, as test_grammar's test_var_annot_in_module
expects of ann_module3.  Under ``from __future__ import annotations`` the
dict is a real global from the start.  Grail resolved the bare name from the
first read.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import importlib
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
r = {}


def fresh(name):
    sys.modules.pop('pkg_module_annotations.' + name, None)
    return importlib.import_module('pkg_module_annotations.' + name)


def outcome(call):
    try:
        return call()
    except NameError as e:
        return 'NameError: ' + str(e)


annotated = fresh('annotated')
r['before_attribute_read'] = [outcome(annotated.reads_name), outcome(annotated.stores_into_name),
                              '__annotations__' in vars(annotated), '__annotate__' in vars(annotated)]
r['attribute'] = annotated.__annotations__
r['after_attribute_read'] = [outcome(annotated.reads_name), '__annotations__' in vars(annotated)]
future = fresh('future')
r['future_import'] = [future.seen_at_module_level, '__annotations__' in vars(future)]
ns = {}
exec("x: int = 1\ntry:\n    found = __annotations__\nexcept NameError:\n    found = 'NameError'\n", ns)
r['exec'] = ns['found']

EXPECTED = {
    'before_attribute_read': ["NameError: name '__annotations__' is not defined",
                              "NameError: name '__annotations__' is not defined", False, True],
    'attribute': {'x': int},
    'after_attribute_read': [{'x': int}, True],
    'future_import': [{'y': 'list[int]'}, True],
    'exec': 'NameError',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-22s %-5s -> %r' % (key, 'OK' if actual == EXPECTED[key] else 'FAIL', actual))
    print(SUMMARY)
