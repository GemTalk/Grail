# ``__builtins__'' in the globals mapping REPLACES the builtins namespace for
# the code exec()/eval() runs.
#
# That is the whole of CPython's sandboxing story: exec(src, {'__builtins__':
# {}}) runs source that cannot reach print, open or __import__, and
# {'__builtins__': m} runs it with m's names instead of the real ones.  It is
# an EXCLUSIVE choice, not an extra place to look -- falling back to the real
# builtins after the override missed hands back exactly the name the caller
# took away.
#
# Grail resolved builtins against the one real builtins singleton and never
# looked at the mapping, so every such call ran with the full builtins
# available: the restriction was accepted and then silently ignored, which is
# worse than refusing it.
#
# Two halves had to move for that, and only the second is obvious:
#
#   * the RUNTIME resolver (NameError>>___resolveBuiltinOrSignal___:), which is
#     where a name the compiler could not bind ends up.  It now consults the
#     override through __getitem__ -- the mapping is deliberately exotic (a
#     dict subclass, a MappingProxyType, one whose __getitem__ raises) and
#     subscripting is the only thing they all agree on.
#
#   * the COMPILE-TIME binding.  A call to a name Grail knows is a builtin
#     never reaches the resolver: it compiles straight to a send on the
#     builtins singleton, so print() under an empty __builtins__ printed.  A
#     doit compiled while an override is installed declines those fast paths,
#     and the call goes through the resolver instead.
#
# test_builtin's test_exec_globals, test_exec_globals_dict_subclass and
# test_eval_builtins_mapping.

import types

r = {}


def outcome(fn):
    try:
        return 'ok -> %r' % (fn(),)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


class customdict(dict):
    """A dict subclass that does nothing fancy -- the plain-substitution case."""


class setonlyerror(Exception):
    pass


class setonlydict(dict):
    def __getitem__(self, key):
        raise setonlyerror


# --- a name resolved THROUGH the override ------------------------------------

r['found_in_dict'] = outcome(
    lambda: eval("superglobal", {'__builtins__': {'superglobal': 1}}))
r['found_in_subclass'] = outcome(
    lambda: eval("superglobal", {'__builtins__': customdict({'superglobal': 1})}))
r['found_in_proxy'] = outcome(
    lambda: eval("superglobal", {'__builtins__': types.MappingProxyType({'superglobal': 1})}))

# --- and a name the override does NOT have -----------------------------------
#
# The real builtins are NOT consulted afterwards.  ``len'' is the row that
# says so: it exists, and under an empty override it must not.

r['missing_in_dict'] = outcome(
    lambda: eval("superglobal", {'__builtins__': {}}))
r['missing_in_subclass'] = outcome(
    lambda: eval("superglobal", {'__builtins__': customdict()}))
r['missing_in_proxy'] = outcome(
    lambda: eval("superglobal", {'__builtins__': types.MappingProxyType({})}))
r['real_builtin_is_gone'] = outcome(
    lambda: eval("len([1, 2])", {'__builtins__': {}}))

# --- a COMPILE-TIME-bound builtin is gated too --------------------------------
#
# The half that is easy to miss.  print() and len() are calls Grail binds while
# compiling, so they never reach the resolver unless the compile declines.

r['print_call_gated'] = outcome(
    lambda: exec("print('x')", {'__builtins__': {}}))
r['len_call_gated'] = outcome(
    lambda: exec("y = len([1])", {'__builtins__': {}}))
r['print_substituted'] = outcome(
    lambda: eval("print('a', 'b')", {'__builtins__': {'print': lambda *a: a}}))

# --- a mapping whose __getitem__ raises ---------------------------------------
#
# Only KeyError means ``no such name''.  Anything else is the caller's mapping
# saying something, and turning it into a NameError would report the wrong
# thing entirely.

r['getitem_raises'] = outcome(
    lambda: eval("superglobal", {'__builtins__': setonlydict({'superglobal': 1})}))

# --- a NON-mapping __builtins__ is lazy, not eager ----------------------------
#
# CPython does not check the type at exec() time: source that never asks
# builtins for a name runs to completion, and source that does gets whatever
# subscripting the object raises.

r['nonmapping_unused'] = outcome(
    lambda: exec("x = 1", {'__builtins__': 123}))
r['nonmapping_int'] = outcome(
    lambda: exec("print('h')", {'__builtins__': 123}))
r['nonmapping_none'] = outcome(
    lambda: exec("print('h')", {'__builtins__': None}))

# --- controls: nothing without an override changes ----------------------------

r['no_override_builtin'] = outcome(lambda: eval("len([1, 2])", {}))
r['no_override_print'] = outcome(lambda: exec("y = len('abc')", {}))
r['restored_after'] = outcome(lambda: len([1, 2, 3]))
r['nested_exec_restores'] = outcome(
    lambda: exec("exec('pass', {'__builtins__': {}})\ny = len([1])", {}))
r['module_scope_unaffected'] = outcome(lambda: abs(-4))


EXPECTED = {
    'found_in_dict': 'ok -> 1',
    'found_in_proxy': 'ok -> 1',
    'found_in_subclass': 'ok -> 1',
    'getitem_raises': 'setonlyerror: ',
    'len_call_gated': "NameError: name 'len' is not defined",
    'missing_in_dict': "NameError: name 'superglobal' is not defined",
    'missing_in_proxy': "NameError: name 'superglobal' is not defined",
    'missing_in_subclass': "NameError: name 'superglobal' is not defined",
    'module_scope_unaffected': 'ok -> 4',
    'nested_exec_restores': 'ok -> None',
    'no_override_builtin': 'ok -> 2',
    'no_override_print': 'ok -> None',
    'nonmapping_int': "TypeError: 'int' object is not subscriptable",
    'nonmapping_none': "TypeError: 'NoneType' object is not subscriptable",
    'nonmapping_unused': 'ok -> None',
    'print_call_gated': "NameError: name 'print' is not defined",
    'print_substituted': "ok -> ('a', 'b')",
    'real_builtin_is_gone': "NameError: name 'len' is not defined",
    'restored_after': 'ok -> 3',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-26s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
