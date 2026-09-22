# Two builtins that a piece of code reaches WITHOUT naming them, and which a
# ``__builtins__'' override therefore also owns.
#
# __reduce__ ON AN ITERATOR names the callable that rebuilds it, and CPython
# resolves that name in the FRAME's builtins -- listiter_reduce calls
# _PyEval_GetBuiltin on 'iter'.  So under an empty __builtins__ it raises
# AttributeError for the bare name rather than answering the real iter.
# Grail's list_iterator had no __reduce__ at all and fell through to the
# inherited NotImplemented, so a list iterator simply did not pickle.
#
# AN ``import'' STATEMENT calls __import__, looked up the same way.  An empty
# __builtins__ forbids importing -- ``ImportError: __import__ not found'' --
# and a mapping supplying one has THAT called, with the five arguments CPython
# passes, the globals and locals being the mappings exec() was GIVEN.
#
# The gate is emitted by ImportAst/ImportFromAst rather than checked inside the
# shared __import__ entry point, and the difference is not cosmetic: a check in
# the shared method gates every import made while an override is installed,
# INCLUDING GRAIL'S OWN.  Raising a NameError inside exec'd code makes the
# traceback machinery import 're', which then replaced the exception the caller
# was waiting for with an ImportError naming a module the source never
# mentions.  Three already-closed tests regressed that way.
#
# test_builtin's test_eval_builtins_mapping_reduce and
# test_exec_builtins_mapping_import.

import pickle
import types

r = {}


def outcome(fn):
    try:
        return 'ok -> %r' % (fn(),)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


# --- a list iterator reduces ---------------------------------------------------

r['fresh'] = outcome(lambda: iter([1, 2]).__reduce__())


def _partial():
    it = iter([1, 2, 3])
    next(it)
    return it.__reduce__()


def _spent():
    it = iter([1, 2])
    list(it)
    return it.__reduce__()


r['partial'] = outcome(_partial)
r['spent'] = outcome(_spent)

# A SPENT iterator answers a two-element tuple over an EMPTY list and no index
# at all -- that is how CPython says 'nothing left' without encoding a position
# that the list may since have invalidated.

r['spent_has_no_index'] = outcome(lambda: len(_spent()) == 2)

# --- reversed() reduces to reversed --------------------------------------------
#
# Compared by IDENTITY rather than by repr: CPython's reversed is a class and
# Grail's is a builtin function, which is the same long-standing difference
# iterator>>___builtinNamed___ documents for map/filter/zip.  What must agree
# is which callable, and the state.


def _rev(n):
    it = reversed([1, 2, 3])
    for _ in range(n):
        next(it)
    return it.__reduce__()


r['reversed_callable'] = outcome(lambda: _rev(0)[0] is reversed)
r['reversed_state'] = outcome(lambda: _rev(0)[1:])
r['reversed_after_one'] = outcome(lambda: _rev(1)[1:])
r['forward_callable'] = outcome(lambda: iter([1, 2])[0:0] if False else iter([1, 2]).__reduce__()[0] is iter)

# --- and it round-trips through pickle ------------------------------------------

r['pickle_fresh'] = outcome(lambda: list(pickle.loads(pickle.dumps(iter([1, 2, 3])))))


def _pickle_partial():
    it = iter([1, 2, 3])
    next(it)
    return list(pickle.loads(pickle.dumps(it)))


r['pickle_partial'] = outcome(_pickle_partial)

# --- the callable is resolved in the CODE's builtins -----------------------------

r['reduce_no_builtins'] = outcome(lambda: eval(
    "x.__reduce__()", {'__builtins__': types.MappingProxyType({}), 'x': iter([1, 2])}))
r['reduce_iter_supplied'] = outcome(lambda: eval(
    "x.__reduce__()",
    {'__builtins__': types.MappingProxyType({'iter': iter}), 'x': iter([1, 2])}))

# --- import is gated the same way -------------------------------------------------

r['import_no_builtins'] = outcome(lambda: exec(
    "import foo.bar", {'__builtins__': types.MappingProxyType({})}))


def _custom_import():
    ns = {'__builtins__': types.MappingProxyType({'__import__': lambda *args: args})}
    exec("import foo.bar", ns)
    return ns['foo'] == ('foo.bar', ns, ns, None, 0)


r['import_custom_called'] = outcome(_custom_import)


# The ``from X import y'' emit is a different site and needs the same gate.

r['import_from_gated'] = outcome(lambda: exec(
    "from foo import bar", {'__builtins__': types.MappingProxyType({})}))

# --- controls ---------------------------------------------------------------------
#
# The gate must fire ONLY for an import the exec'd source wrote.  An exec that
# RAISES is the row that caught the first cut: Grail imports 're' for the
# traceback, and gating that turned the NameError into an ImportError.

r['normal_import_in_exec'] = outcome(
    lambda: (lambda d: (exec("import math\nv = math.floor(2.5)", d), d['v'])[1])({}))
r['raising_exec_keeps_its_error'] = outcome(
    lambda: exec("undefined_name_xyz", {'__builtins__': {}}))
r['raising_exec_plain'] = outcome(lambda: exec("undefined_name_xyz", {}))
r['module_scope_import_unaffected'] = outcome(lambda: pickle.HIGHEST_PROTOCOL >= 2)
r['map_reduce_unchanged'] = outcome(lambda: map(str, [1, 2]).__reduce__()[0] is map)


EXPECTED = {
    'forward_callable': 'ok -> True',
    'fresh': 'ok -> (<built-in function iter>, ([1, 2],), 0)',
    'import_custom_called': 'ok -> True',
    'import_from_gated': 'ImportError: __import__ not found',
    'import_no_builtins': 'ImportError: __import__ not found',
    'map_reduce_unchanged': 'ok -> True',
    'module_scope_import_unaffected': 'ok -> True',
    'normal_import_in_exec': 'ok -> 2',
    'partial': 'ok -> (<built-in function iter>, ([1, 2, 3],), 1)',
    'pickle_fresh': 'ok -> [1, 2, 3]',
    'pickle_partial': 'ok -> [2, 3]',
    'raising_exec_keeps_its_error': "NameError: name 'undefined_name_xyz' is not defined",
    'raising_exec_plain': "NameError: name 'undefined_name_xyz' is not defined",
    'reduce_iter_supplied': 'ok -> (<built-in function iter>, ([1, 2],), 0)',
    'reduce_no_builtins': 'AttributeError: iter',
    'reversed_after_one': 'ok -> (([1, 2, 3],), 1)',
    'reversed_callable': 'ok -> True',
    'reversed_state': 'ok -> (([1, 2, 3],), 2)',
    'spent': 'ok -> (<built-in function iter>, ([],))',
    'spent_has_no_index': 'ok -> True',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-30s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
