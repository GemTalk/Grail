# ``__build_class__'' is what a class STATEMENT compiles to, and a
# ``__builtins__'' override owns it: exec(src, {'__builtins__': {}}) must
# refuse a class definition with ``NameError: __build_class__ not found'',
# which is most of the point of passing an empty one.
#
# Grail does not route class creation through a builtin -- ClassDefAst emits
# importlib sends directly -- so there was nothing for the override to
# withhold, and a sandboxed exec defined classes freely.
#
# Asserting the requirement needs the name to EXIST, and that is where the
# real defect was.  ``__build_class__'' was listed in Grail's spec of
# dir(builtins) and implemented by no method, and dir()/__dict__ enumerate
# METHODS -- so every copy of builtins came out without it.  An override is
# very often a copy: a bare exec(src) inside a function gets one.  A gate
# written before the name existed therefore refused class definitions CPython
# allows, and cost test_scope two tests.
#
# THE ENUMERATION BUG UNDER THAT IS THE ONE WORTH KEEPING.  A selector was
# treated as Grail machinery if it began with three underscores.  Grail's
# internal names are ``___name___'' -- three leading AND three trailing -- and
# a varargs Python builtin compiles to ``_<name>:kw:'', so a Python DUNDER
# builtin becomes ``___import__:kw:'' / ``___build_class__:kw:'': three
# leading and only TWO trailing.  The rule could not tell them apart, so both
# were missing from builtins.__dict__ while dir(builtins) listed them -- it
# answers a curated spec list for that module instead.  Requiring the trailing
# ``___'' separates machinery from a dunder cleanly.
#
# test_builtin's test_exec_globals_frozen.

import builtins
import types

r = {}


def outcome(fn):
    try:
        return 'ok -> %r' % (fn(),)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


class frozendict_error(Exception):
    pass


class frozendict(dict):
    def __setitem__(self, key, value):
        raise frozendict_error("frozendict is readonly")


if isinstance(builtins, types.ModuleType):
    _frozen = frozendict(builtins.__dict__)
else:
    _frozen = frozendict(builtins)

_CLASS = compile("class A: pass", "", "exec")

# --- the name exists, and both enumerations report it --------------------------

r['in_dict'] = '__build_class__' in builtins.__dict__
r['in_dir'] = '__build_class__' in dir(builtins)
r['import_in_dict'] = '__import__' in builtins.__dict__
r['import_in_dir'] = '__import__' in dir(builtins)

# CPython's invariant, and the one that was broken: a membership test and an
# enumeration of the same mapping must agree.

r['dir_and_vars_agree'] = set(vars(builtins)) == set(dir(builtins))
r['copy_carries_it'] = '__build_class__' in _frozen

# --- and a class statement is gated on it ---------------------------------------

r['empty_builtins'] = outcome(lambda: exec(_CLASS, {'__builtins__': {}}))
r['empty_frozendict'] = outcome(lambda: exec(_CLASS, {'__builtins__': frozendict()}))
r['frozen_real_builtins'] = outcome(lambda: exec(_CLASS, {'__builtins__': _frozen}))

# --- controls: nothing without an override changes -------------------------------


def _plain_class_in_exec():
    ns = {}
    exec("class K:\n    v = 7", ns)
    return ns['K'].v


def _module_scope_class():
    class Local:
        v = 9
    return Local.v


r['class_in_plain_exec'] = outcome(_plain_class_in_exec)
r['class_at_module_scope'] = outcome(_module_scope_class)
r['class_with_a_base'] = outcome(
    lambda: (lambda d: (exec("class J(int): pass", d), d['J'](5))[1])({}))
r['internal_names_stay_hidden'] = sorted(
    k for k in vars(builtins) if k.startswith('___'))
r['bare_exec_still_builds_classes'] = outcome(
    lambda: (lambda d: (exec("class M: pass", d), d['M'].__name__)[1])({}))


EXPECTED = {
    'bare_exec_still_builds_classes': "ok -> 'M'",
    'class_at_module_scope': 'ok -> 9',
    'class_in_plain_exec': 'ok -> 7',
    'class_with_a_base': 'ok -> 5',
    'copy_carries_it': True,
    'dir_and_vars_agree': True,
    'empty_builtins': 'NameError: __build_class__ not found',
    'empty_frozendict': 'NameError: __build_class__ not found',
    'frozen_real_builtins': 'ok -> None',
    'import_in_dict': True,
    'import_in_dir': True,
    'in_dict': True,
    'in_dir': True,
    'internal_names_stay_hidden': [],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-32s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
