# ``x op= y'' -- augmented assignment, for every kind of target.
#
# An augmented assignment is not a read, a binary operation and a store.  It
# tries the IN-PLACE dunder first (``__iadd__'', ``__ior__'', ...) so a mutable
# object is mutated rather than replaced, and if the forward binary dunder
# DECLINES -- answers NotImplemented -- it tries the right operand's reflected
# one, exactly as the plain operator does.
#
# Grail did that for ONE kind of target: a plain local name inside a function.
# For a module-scope name, an attribute and a subscript, AugAssignAst emitted
# the bare binary operator, so neither half happened:
#
#   * the in-place dunder never ran.  ``d |= other'' at module scope built a
#     NEW dict and rebound the name; any other name bound to the same object
#     kept the old contents.  ``l += [x]'' on a list is the common spelling of
#     the same thing.
#
#   * the reflected dunder never ran, and this one produces a VALUE rather
#     than an error:
#
#         d = {0: 'a'}
#         d |= types.MappingProxyType({1: 'c'})    # d is NotImplemented
#
#     while ``d | proxy'' on the line above answers a dict.  NotImplemented was
#     stored, and the failure surfaced wherever d was next used.
#
# The same statement inside a function was always right, which is what kept it
# hidden -- and why every check below is written at BOTH scopes.
#
# Found from test_userdict's test_mixed_or / test_mixed_ior, which had been
# passing vacuously: they loop over UserDict, dict and types.MappingProxyType,
# and MappingProxyType was a stub that answered its argument, so the third case
# was testing a plain dict for the second time.

import types

r = {}


def outcome(fn):
    try:
        return 'ok -> %r' % (fn(),)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


class DeclinesOr:
    """Forward __or__ declines and there is no __ior__ at all.

    The pair below is the ONLY clean way to exercise "forward declines, so the
    reflected one runs" through an augmented assignment.  A dict cannot do it:
    dict HAS an __ior__, and handed something that is not a mapping it RAISES
    rather than declining, so ``d |= obj'' never reaches the reflected step in
    CPython either.
    """

    def __or__(self, other):
        return NotImplemented


class AcceptsRor:
    def __ror__(self, other):
        return 'ror-ran'


class TracksInPlace:
    """Answers which dunder ran, so a fallback cannot masquerade as in-place."""

    def __init__(self):
        self.log = []

    def __iadd__(self, other):
        self.log.append('iadd')
        return self

    def __add__(self, other):
        self.log.append('add')
        return self


_PROXY = types.MappingProxyType({1: 'c'})


# --- MODULE scope ------------------------------------------------------------

_md = {0: 'a'}
_md_alias = _md
_md |= {1: 'b'}
r['module_dict_ior_value'] = _md
r['module_dict_ior_in_place'] = _md is _md_alias

_ml = [1]
_ml_alias = _ml
_ml += [2]
r['module_list_iadd_value'] = _ml
r['module_list_iadd_in_place'] = _ml is _ml_alias

_ms = {'a'}
_ms_alias = _ms
_ms |= {'b'}
r['module_set_ior_value'] = sorted(_ms)
r['module_set_ior_in_place'] = _ms is _ms_alias

# The reflected half: a forward dunder that declines must not have its
# NotImplemented stored.
_mp_target = {0: 'a'}
_mp_target |= _PROXY
r['module_reflected_proxy'] = _mp_target

_decl = DeclinesOr()
_decl |= AcceptsRor()
r['module_reflected_custom'] = _decl

_track = TracksInPlace()
_track += 1
r['module_inplace_dunder_ran'] = _track.log

# Immutables are unaffected -- there is no in-place dunder, so the binary one
# runs exactly as before.  These are the control.
_mi = 5
_mi += 1
r['module_int_iadd'] = _mi
_mstr = 'a'
_mstr += 'b'
r['module_str_iadd'] = _mstr
_mt = (1,)
_mt_alias = _mt
_mt += (2,)
r['module_tuple_iadd'] = _mt
r['module_tuple_is_replaced'] = _mt is _mt_alias


# --- FUNCTION scope (always worked; here so a fix cannot break it) -----------

def _in_function():
    d = {0: 'a'}
    alias = d
    d |= _PROXY
    l = [1]
    lalias = l
    l += [2]
    t = TracksInPlace()
    t += 1
    return {
        'function_reflected_proxy': d,
        'function_dict_in_place': d is alias,
        'function_list_iadd_value': l,
        'function_list_in_place': l is lalias,
        'function_inplace_dunder_ran': t.log,
    }


r.update(_in_function())


# --- ATTRIBUTE targets -------------------------------------------------------

class Holder:
    pass


_h = Holder()
_h.lst = [1]
_h_alias = _h.lst
_h.lst += [2]
r['attr_list_iadd_value'] = _h.lst
r['attr_list_iadd_in_place'] = _h.lst is _h_alias

_h.d = {0: 'a'}
_h.d |= _PROXY
r['attr_reflected_proxy'] = _h.d

_h.n = 1
_h.n += 4
r['attr_int_iadd'] = _h.n

_h.t = TracksInPlace()
_h.t += 1
r['attr_inplace_dunder_ran'] = _h.t.log


# ``self.x op= y'' takes a different emit from ``obj.x op= y'' -- the
# instance's own storage rather than the polymorphic protocol -- so it is
# probed separately rather than assumed to follow.
class SelfAttr:
    def __init__(self):
        self.lst = [1]
        self.d = {0: 'a'}

    def extend(self):
        alias = self.lst
        self.lst += [2]
        return self.lst is alias

    def merge(self):
        self.d |= _PROXY
        return self.d


_sa = SelfAttr()
r['self_attr_in_place'] = _sa.extend()
r['self_attr_reflected_proxy'] = _sa.merge()


# --- SUBSCRIPT targets -------------------------------------------------------

_sub = {'k': [1]}
_sub_alias = _sub['k']
_sub['k'] += [2]
r['subscript_list_iadd_value'] = _sub['k']
r['subscript_list_iadd_in_place'] = _sub['k'] is _sub_alias

_sub2 = {'k': {0: 'a'}}
_sub2['k'] |= _PROXY
r['subscript_reflected_proxy'] = _sub2['k']

_sub3 = {'n': 1}
_sub3['n'] += 5
r['subscript_int_iadd'] = _sub3['n']

_sub4 = {'t': TracksInPlace()}
_sub4['t'] += 1
r['subscript_inplace_dunder_ran'] = _sub4['t'].log


# --- the plain operator, which was always right ------------------------------
#
# The control that says the fix closed a gap between two spellings rather than
# moving the gap: ``a | b'' and ``a |= b'' must now agree.

r['binary_reflected_proxy'] = {0: 'a'} | _PROXY
r['binary_reflected_custom'] = DeclinesOr() | AcceptsRor()


EXPECTED = {
    'attr_inplace_dunder_ran': ['iadd'],
    'attr_int_iadd': 5,
    'attr_list_iadd_in_place': True,
    'attr_list_iadd_value': [1, 2],
    'attr_reflected_proxy': {0: 'a', 1: 'c'},
    'binary_reflected_custom': 'ror-ran',
    'binary_reflected_proxy': {0: 'a', 1: 'c'},
    'function_dict_in_place': True,
    'function_inplace_dunder_ran': ['iadd'],
    'function_list_iadd_value': [1, 2],
    'function_list_in_place': True,
    'function_reflected_proxy': {0: 'a', 1: 'c'},
    'module_dict_ior_in_place': True,
    'module_dict_ior_value': {0: 'a', 1: 'b'},
    'module_inplace_dunder_ran': ['iadd'],
    'module_int_iadd': 6,
    'module_list_iadd_in_place': True,
    'module_list_iadd_value': [1, 2],
    'module_reflected_custom': 'ror-ran',
    'module_reflected_proxy': {0: 'a', 1: 'c'},
    'module_set_ior_in_place': True,
    'module_set_ior_value': ['a', 'b'],
    'module_str_iadd': 'ab',
    'module_tuple_iadd': (1, 2),
    'module_tuple_is_replaced': False,
    'self_attr_in_place': True,
    'self_attr_reflected_proxy': {0: 'a', 1: 'c'},
    'subscript_inplace_dunder_ran': ['iadd'],
    'subscript_int_iadd': 6,
    'subscript_list_iadd_in_place': True,
    'subscript_list_iadd_value': [1, 2],
    'subscript_reflected_proxy': {0: 'a', 1: 'c'},
}

# A NAMED roll-up, not a count -- see the SUnit peer.
DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-34s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
