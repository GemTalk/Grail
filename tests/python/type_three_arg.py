# ``type(name, bases, namespace)'' -- the three-argument form that builds a
# class dynamically.
#
# Grail did NO argument checking here at all.  Every refusal CPython makes was
# a class Grail built instead, and the result is the shape of bug that reads
# as working code:
#
#     type(b'A', (), {})     built a class NAMED 'aByteArray' -- the
#                            printString of the bytes object
#     type('A', [], {})      accepted a LIST of bases; a str would have been
#                            taken apart into one base per character
#     type('A', (int, str))  answered an int-backed class that claimed str in
#                            its bases and behaved as neither
#     __slots__ = '42'       made a slot no Python source can name
#     __slots__ = 'x', x=0   made a slot and a class variable of one name
#
# Three further things the namespace is supposed to decide, and did not:
#
#   * __doc__.  CPython puts a __doc__ entry in EVERY class's __dict__ -- the
#     docstring or None -- which is what makes an undocumented class answer
#     None instead of inheriting its base's.  ClassDefAst emits an accessor
#     for every class the class STATEMENT builds, so those were always right;
#     a class built by type() had neither entry nor accessor, so the read fell
#     through to object>>__doc__ and EVERY such class claimed object's own
#     docstring -- ``The base class of the class hierarchy...'' -- whatever
#     the caller passed.
#
#   * __name__ / __qualname__.  The Smalltalk class name WAS the Python name,
#     so a name GemStone will not take was refused ('42', '', '\U0001f40d')
#     and a dotted one came back mangled ('B.A' -> 'B_A').  The two are now
#     separate: the class gets a name GemStone accepts and ___name___ carries
#     the one the caller asked for.
#
#   * __firstlineno__.  CPython drops it when __module__ is assigned -- the
#     compiler recorded the line a class was defined on, and a class that now
#     claims a different module has no valid line any more.
#
# test_builtin's test_bad_args, test_bad_slots, test_type_doc,
# test_type_firstlineno, test_type_name and test_type_qualname.

import collections
import types

r = {}


def outcome(fn):
    """The exception type and message, or the value -- whichever happened."""
    try:
        return 'ok -> %r' % (fn(),)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def kind(fn):
    """The exception TYPE only.

    Used where CPython's wording and Grail's are both reasonable and both
    stable -- an arity complaint, say -- so that pinning one would make this
    fixture a test of the prose rather than of the behaviour.
    """
    try:
        fn()
        return 'no exception'
    except Exception as e:
        return type(e).__name__


class _Plain:
    def ham(self):
        return 'ham%d' % self


# --- arguments ---------------------------------------------------------------
#
# The zero-argument call is the one that needed its own fix: type's own
# _new:kw: has always answered "type() takes 1 or 3 arguments", but the generic
# instantiation path dispatches 0 positional and no keywords straight to
# __new__, ahead of the branch that reaches it -- so ``type()'' inherited
# object's __new__ and ALLOCATED one.

r['args_none'] = kind(lambda: type())
r['args_two'] = kind(lambda: type('A', ()))
r['args_four'] = kind(lambda: type('A', (), {}, ()))
r['args_keyword_dict'] = kind(lambda: type('A', (), dict={}))
r['args_keyword_extra'] = kind(lambda: type('A', (), {}, x=5))
r['bases_list'] = kind(lambda: type('A', [], {}))
r['ns_mappingproxy'] = kind(lambda: type('A', (), types.MappingProxyType({})))
r['base_none'] = kind(lambda: type('A', (None,), {}))
r['base_bool'] = kind(lambda: type('A', (bool,), {}))
# Two bases that each carry storage cannot both be the layout; CPython and
# Grail refuse for the same reason, under the same words.
r['base_layout_conflict'] = outcome(lambda: type('A', (int, str), {}))
r['name_bytes'] = kind(lambda: type(b'A', (), {}))

# A NUL is a ValueError, not a TypeError: CPython separates "wrong kind of
# thing" from "right kind, impossible value", and the two tests assert the
# distinction separately.
r['name_nul'] = outcome(lambda: type('A\x00B', (), {}))
r['name_surrogate'] = kind(lambda: type('A\udcdcB', (), {}))

# --- __slots__ ---------------------------------------------------------------
#
# Ten refusals.  b'x' needs no special case: it iterates to INTEGERS, which the
# per-item string check rejects with the message CPython uses for exactly that
# input.

r['slots_bytes'] = outcome(lambda: type('A', (), {'__slots__': b'x'}))
r['slots_not_iterable'] = outcome(lambda: type('A', (), {'__slots__': 42}))
r['slots_on_int_base'] = kind(lambda: type('A', (int,), {'__slots__': 'x'}))
r['slots_empty_name'] = kind(lambda: type('A', (), {'__slots__': ''}))
r['slots_digit_name'] = kind(lambda: type('A', (), {'__slots__': '42'}))
r['slots_nul_name'] = kind(lambda: type('A', (), {'__slots__': 'x\x00y'}))
# ValueError, not TypeError: both halves are well formed and it is the
# COMBINATION that cannot work.
r['slots_clashes_with_classvar'] = kind(
    lambda: type('A', (), {'__slots__': 'x', 'x': 0}))
r['slots_dict_twice'] = kind(
    lambda: type('A', (), {'__slots__': ('__dict__', '__dict__')}))
r['slots_weakref_twice'] = kind(
    lambda: type('A', (), {'__slots__': ('__weakref__', '__weakref__')}))
r['slots_dict_on_plain_base'] = kind(
    lambda: type('A', (_Plain,), {'__slots__': '__dict__'}))
r['slots_weakref_on_plain_base'] = kind(
    lambda: type('A', (_Plain,), {'__slots__': '__weakref__'}))

# --- the class that IS built --------------------------------------------------
#
# The control in the other direction: validation must not refuse what CPython
# accepts, and the ordinary three-argument call is by far the common one.

_A = type('A', (), {})
r['ok_name'] = _A.__name__
r['ok_qualname'] = _A.__qualname__
# COMPARED to __name__, not pinned: a fixture is run both as __main__ (by the
# fixture gate) and as an import (by the SUnit peer), and type() takes
# __module__ from the calling frame -- so the literal would differ between the
# two runs and one of them would always be wrong.
r['ok_module'] = _A.__module__ == __name__
# str(), because the EXPECTED table has to be a literal a reader can check
# and a parser can read back -- repr of a class is not re-evaluable.
r['ok_bases'] = str(_A.__bases__)
r['ok_base_is_object'] = _A.__base__ is object
r['ok_no_firstlineno'] = '__firstlineno__' in _A.__dict__
r['ok_instance_type'] = type(_A()) is _A
r['ok_attrs_work'] = (lambda c: (setattr(c, 'zz', 5), c.zz)[1])(
    type('B', (), {}))
r['ok_namespace_entry'] = type('B', (), {'zz': 5}).zz
r['ok_namespace_order'] = list(type('C', (), (lambda od: (od.move_to_end('a'), od)[1])(
    collections.OrderedDict([('a', 1), ('b', 2)]))).__dict__.items())[:2]

# --- names GemStone would refuse ---------------------------------------------

for _nm, _label in (('A', 'plain'), ('\xc4', 'latin1'), ('\U0001f40d', 'astral'),
                    ('B.A', 'dotted'), ('42', 'digits'), ('', 'empty')):
    _C = type(_nm, (), {})
    r['name_' + _label] = (_C.__name__, _C.__qualname__)

# Assignment takes the same three refusals, because ``A.__name__ = x'' and
# ``type(x, (), {})'' are one constraint arriving by two routes.  The
# read-back after each rejection is the half that catches a
# validate-then-store-anyway mistake.
_R = type('C', (), {})
r['assign_name_nul'] = kind(lambda: setattr(_R, '__name__', 'A\x00B'))
r['assign_name_nul_kept'] = _R.__name__
r['assign_name_bytes'] = kind(lambda: setattr(_R, '__name__', b'A'))
r['assign_name_bytes_kept'] = _R.__name__
r['assign_name_ok'] = (setattr(_R, '__name__', '\U0001f40d'),
                       _R.__name__, _R.__qualname__)[1:]

_Q = type('A', (), {'__qualname__': 'B.C'})
r['qualname_from_namespace'] = (_Q.__name__, _Q.__qualname__)
r['assign_qualname_bytes'] = kind(lambda: setattr(_Q, '__qualname__', b'B'))
r['assign_qualname_kept'] = _Q.__qualname__
r['assign_qualname_ok'] = (setattr(_Q, '__qualname__', 'D.E'), _Q.__qualname__)[1]

# --- __doc__ ------------------------------------------------------------------
#
# __doc__ takes ANY object in CPython -- bytes and ints included -- so the only
# value that is an error is a str carrying a lone surrogate, which cannot be
# encoded as UTF-8.

for _doc, _label in (('x', 'str'), ('\xc4', 'latin1'), ('\U0001f40d', 'astral'),
                     ('x\x00y', 'nul'), (b'x', 'bytes'), (42, 'int'),
                     (None, 'none')):
    r['doc_' + _label] = type('A', (), {'__doc__': _doc}).__doc__
r['doc_surrogate'] = kind(lambda: type('A', (), {'__doc__': 'x\udcdcy'}))
r['doc_default_is_none'] = type('A', (), {}).__doc__
_D = type('A', (), {})
for _doc, _label in (('x', 'str'), (b'x', 'bytes'), (42, 'int'), (None, 'none')):
    r['doc_assign_' + _label] = (setattr(_D, '__doc__', _doc), _D.__doc__)[1]

# A class's __doc__ is its OWN, never inherited -- the reason CPython gives
# every class an entry rather than letting the lookup walk.


class _Documented:
    """bdoc"""


class _Undocumented(_Documented):
    pass


r['doc_not_inherited'] = _Undocumented.__doc__
r['doc_of_base'] = _Documented.__doc__

# --- __firstlineno__ ----------------------------------------------------------

_F = type('A', (), {'__firstlineno__': 42})
r['firstlineno_kept'] = _F.__dict__['__firstlineno__']
r['firstlineno_module_set'] = (setattr(_F, '__module__', 'testmodule'),
                               _F.__module__)[1]
r['firstlineno_dropped'] = '__firstlineno__' in _F.__dict__
r['firstlineno_resettable'] = (setattr(_F, '__firstlineno__', 43),
                               _F.__dict__['__firstlineno__'])[1]

# --- MappingProxyType is a real proxy ------------------------------------------
#
# It used to be a stub that answered its argument -- a WRITABLE dict under a
# name whose entire purpose is that it is read-only -- which is why the
# ns_mappingproxy row above could not be refused.

_MP = types.MappingProxyType({'a': 1})
r['proxy_type'] = type(_MP).__name__
r['proxy_read'] = _MP['a']
def _write_through_proxy():
    # Written as an ASSIGNMENT rather than as ``_MP.__setitem__(...)'': a
    # mappingproxy has no __setitem__ attribute at all, so the explicit spelling
    # measures an AttributeError from the lookup and never reaches the refusal
    # this row is about.
    _MP['b'] = 2


r['proxy_is_readonly'] = outcome(_write_through_proxy)
r['proxy_rejects_nonmapping'] = kind(lambda: types.MappingProxyType(42))

EXPECTED = {
    'args_four': 'TypeError',
    'args_keyword_dict': 'TypeError',
    'args_keyword_extra': 'TypeError',
    'args_none': 'TypeError',
    'args_two': 'TypeError',
    'assign_name_bytes': 'TypeError',
    'assign_name_bytes_kept': 'C',
    'assign_name_nul': 'ValueError',
    'assign_name_nul_kept': 'C',
    'assign_name_ok': ('🐍', 'C'),
    'assign_qualname_bytes': 'TypeError',
    'assign_qualname_kept': 'B.C',
    'assign_qualname_ok': 'D.E',
    'base_bool': 'TypeError',
    'base_layout_conflict': 'TypeError: multiple bases have instance lay-out conflict',
    'base_none': 'TypeError',
    'bases_list': 'TypeError',
    'doc_assign_bytes': b'x',
    'doc_assign_int': 42,
    'doc_assign_none': None,
    'doc_assign_str': 'x',
    'doc_astral': '🐍',
    'doc_bytes': b'x',
    'doc_default_is_none': None,
    'doc_int': 42,
    'doc_latin1': 'Ä',
    'doc_none': None,
    'doc_not_inherited': None,
    'doc_nul': 'x\x00y',
    'doc_of_base': 'bdoc',
    'doc_str': 'x',
    'doc_surrogate': 'UnicodeEncodeError',
    'firstlineno_dropped': False,
    'firstlineno_kept': 42,
    'firstlineno_module_set': 'testmodule',
    'firstlineno_resettable': 43,
    'name_astral': ('🐍', '🐍'),
    'name_bytes': 'TypeError',
    'name_digits': ('42', '42'),
    'name_dotted': ('B.A', 'B.A'),
    'name_empty': ('', ''),
    'name_latin1': ('Ä', 'Ä'),
    'name_nul': 'ValueError: type name must not contain null characters',
    'name_plain': ('A', 'A'),
    'name_surrogate': 'UnicodeEncodeError',
    'ns_mappingproxy': 'TypeError',
    'ok_attrs_work': 5,
    'ok_base_is_object': True,
    'ok_bases': "(<class 'object'>,)",
    'ok_instance_type': True,
    'ok_module': True,
    'ok_name': 'A',
    'ok_namespace_entry': 5,
    'ok_namespace_order': [('b', 2), ('a', 1)],
    'ok_no_firstlineno': False,
    'ok_qualname': 'A',
    'proxy_is_readonly': "TypeError: 'mappingproxy' object does not support item assignment",
    'proxy_read': 1,
    'proxy_rejects_nonmapping': 'TypeError',
    'proxy_type': 'mappingproxy',
    'qualname_from_namespace': ('A', 'B.C'),
    'slots_bytes': "TypeError: __slots__ items must be strings, not 'int'",
    'slots_clashes_with_classvar': 'ValueError',
    'slots_dict_on_plain_base': 'TypeError',
    'slots_dict_twice': 'TypeError',
    'slots_digit_name': 'TypeError',
    'slots_empty_name': 'TypeError',
    'slots_not_iterable': "TypeError: 'int' object is not iterable",
    'slots_nul_name': 'TypeError',
    'slots_on_int_base': 'TypeError',
    'slots_weakref_on_plain_base': 'TypeError',
    'slots_weakref_twice': 'TypeError',
}

# A NAMED roll-up, not a count: the SUnit peer asserts on this one string, so
# it has to say WHICH check moved.  The key comparison catches the case a
# count cannot -- a probe added without a measured expectation, or one
# deleted, which would otherwise leave a green number behind.
DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-32s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
