# ``globals()'' inside eval()/exec() answers the GLOBALS mapping, not the
# merged lookup scope.
#
# Grail seeded ONE dictionary from both arguments -- locals laid over globals
# -- and parked it where globals() reads.  That is the right thing for
# resolving a NAME, and the wrong thing for globals(), which is defined to
# answer the globals mapping alone.  So a name supplied as a LOCAL was visible
# through globals():
#
#     data = {'A_GLOBAL_VALUE': 456}
#     eval("globals()['A_GLOBAL_VALUE']", globals=data)   -- 456
#     eval("globals()['A_GLOBAL_VALUE']", locals=data)    -- 456, should be the
#                                                            caller's 123
#
# The two are now kept apart: the merged scope stays the lookup order, and a
# globals-only view is parked for globals() to find.  When the two mappings are
# the same object -- the common case, and every call that passes neither -- the
# view IS the merged scope, so nothing changes.
#
# test_builtin's test_eval_kwargs.

A_GLOBAL_VALUE = 123

r = {}


def outcome(fn):
    try:
        return 'ok -> %r' % (fn(),)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


_data = {'A_GLOBAL_VALUE': 456}

# --- globals() sees only the globals -----------------------------------------

r['globals_kwarg'] = eval("globals()['A_GLOBAL_VALUE']", globals=_data)
r['locals_kwarg'] = eval("globals()['A_GLOBAL_VALUE']", locals=_data)
r['positional_globals'] = eval("globals()['A_GLOBAL_VALUE']", _data)
r['positional_both'] = eval("globals()['A_GLOBAL_VALUE']", globals(), _data)

# --- but a NAME still resolves locals-over-globals ----------------------------
#
# The control for the split: the merged scope is still the lookup order, so the
# local wins for a bare name even though globals() cannot see it.

r['name_prefers_locals'] = eval("A_GLOBAL_VALUE", globals(), _data)
r['name_from_globals'] = eval("A_GLOBAL_VALUE", _data)
r['name_with_no_args'] = eval("A_GLOBAL_VALUE")

# --- exec takes the same split ------------------------------------------------


def _exec_globals_kwarg():
    out = {}
    exec("out_value = globals()['A_GLOBAL_VALUE']", _data, out)
    return out['out_value']


def _exec_locals_kwarg():
    out = {'A_GLOBAL_VALUE': 456}
    exec("out['seen'] = globals()['A_GLOBAL_VALUE']", globals(), out)
    return out['seen']


r['exec_globals'] = outcome(_exec_globals_kwarg)
r['exec_locals'] = outcome(_exec_locals_kwarg)

# --- controls: the common shapes are untouched --------------------------------
#
# Every call that passes one mapping, or none, must behave exactly as before --
# the split is reached only when the two differ.

r['same_mapping_twice'] = eval("globals()['A_GLOBAL_VALUE']", _data, _data)
r['globals_is_a_dict'] = type(eval("globals()", _data)).__name__
r['globals_has_the_key'] = 'A_GLOBAL_VALUE' in eval("globals()", _data)
r['assignment_goes_to_locals'] = (
    lambda: (exec("z = 5", globals(), (d := {})), d.get('z'))[1])()


EXPECTED = {
    'assignment_goes_to_locals': 5,
    'exec_globals': 'ok -> 456',
    'exec_locals': "NameError: name 'out' is not defined",
    'globals_has_the_key': True,
    'globals_is_a_dict': 'dict',
    'globals_kwarg': 456,
    'locals_kwarg': 123,
    'name_from_globals': 456,
    'name_prefers_locals': 456,
    'name_with_no_args': 123,
    'positional_both': 123,
    'positional_globals': 456,
    'same_mapping_twice': 456,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-28s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
