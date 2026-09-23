"""A class header is evaluated once, left to right, before anything uses it.

CPython's order is fixed and observable: the base expressions in the order
written, then the keyword expressions in the order written, then __prepare__,
then the body.  Each is evaluated exactly once, and PEP 560 asks each non-class
base for __mro_entries__ exactly once.

Grail re-emitted the same expressions at every place that consumed them, so a
base or keyword with a side effect -- a registry, a counter, a factory -- did it
twice, or after the body, with no error to say so.  Every check here counts or
orders the calls, because a header evaluated twice builds the same class and
looks correct from the outside.
"""

import enum

r = {}

LOG = []


def f(value, label=None):
    """Record the call, and answer the value unchanged."""
    LOG.append(label if label is not None else getattr(value, '__name__', repr(value)))
    return value


def run(build):
    """The calls build() makes, and what it answered."""
    del LOG[:]
    result = build()
    return list(LOG), result


class P:
    pass


class Q:
    pass


# --- the bases ----------------------------------------------------------------

def _two():
    class R(f(P), f(Q)):
        pass
    return R


r['two_bases_evaluated_once'] = run(_two)[0]


def _three():
    class R3(f(P), f(Q), f(object)):
        pass
    return R3


r['three_bases_evaluated_once'] = run(_three)[0]


def _one():
    class S(f(P)):
        pass
    return S


r['one_base_evaluated_once'] = run(_one)[0]

# --- the metaclass and the other keywords -------------------------------------


def _meta():
    class T(f(P), f(Q), metaclass=f(type)):
        pass
    return T


r['metaclass_evaluated_once'] = run(_meta)[0]


class HookBase:
    def __init_subclass__(cls, **kw):
        cls.seen = sorted(kw)


def _keywords():
    class K(HookBase, b=f(2, 'b'), a=f(1, 'a')):
        pass
    return K


_calls, _K = run(_keywords)
r['keywords_evaluated_once_in_order'] = _calls
r['keywords_reach_the_hook'] = _K.seen


class PrepMeta(type):
    @classmethod
    def __prepare__(mcls, name, bases, **kw):
        LOG.append('__prepare__')
        return {}

    def __new__(mcls, name, bases, ns, **kw):
        return super().__new__(mcls, name, bases, ns)


def _prepare_order():
    class K2(HookBase, metaclass=f(PrepMeta), tag=f('t', 'tag')):
        pass
    return K2


# ALL of the header before __prepare__ -- the keyword included.
r['whole_header_before_prepare'] = run(_prepare_order)[0]


def _splat():
    class K3(HookBase, **f({'x': 1}, 'splat')):
        pass
    return K3


_calls, _K3 = run(_splat)
r['splat_evaluated_once'] = _calls
r['splat_reaches_the_hook'] = _K3.seen


def _boundary():
    class Fl(enum.Flag, boundary=f(enum.KEEP, 'boundary')):
        A = 1
    return Fl


_calls, _Fl = run(_boundary)
r['boundary_evaluated_once'] = _calls
r['boundary_took_effect'] = _Fl._boundary_ is enum.KEEP

# --- __mro_entries__ ---------------------------------------------------------


class Entry:
    def __mro_entries__(self, bases):
        LOG.append('__mro_entries__')
        return (P,)


_entry = Entry()


def _entries():
    class U(_entry, Q):
        pass
    return U


_calls, _U = run(_entries)
r['mro_entries_asked_once'] = _calls
r['orig_bases_kept'] = _U.__orig_bases__ == (_entry, Q)
r['bases_resolved'] = [b.__name__ for b in _U.__bases__]
r['mro_after_resolution'] = [b.__name__ for b in _U.__mro__]


class V(P, Q):
    pass


# __orig_bases__ exists only when a hook actually substituted something.
r['no_hook_no_orig_bases'] = '__orig_bases__' not in vars(V)

# --- a header that raises ------------------------------------------------------


def _raises():
    def boom():
        LOG.append('boom')
        raise LookupError('base failed')
    try:
        class W(f(P), boom()):
            pass
    except LookupError as e:
        return str(e)
    return 'no raise'


_calls, _msg = run(_raises)
r['raising_base_stops_the_statement'] = [_calls, _msg]

# --- scope --------------------------------------------------------------------


def _nested_in_body():
    class Outer(f(P, 'outerP'), f(Q, 'outerQ')):
        class Inner(f(P, 'innerP'), f(Q, 'innerQ')):
            pass
    return Outer


# A class statement inside another class's body has its own header; the two
# must neither share nor clobber each other's evaluated values.
_calls, _Outer = run(_nested_in_body)
r['nested_headers_are_separate'] = _calls
r['nested_inner_bases'] = [b.__name__ for b in _Outer.Inner.__bases__]
r['nested_outer_bases'] = [b.__name__ for b in _Outer.__bases__]

# --- what __prepare__ is given ------------------------------------------------
#
# CPython calls ``__prepare__(name, bases, **kwds)`` with the RESOLVED bases (after
# PEP 560 substitution) and every class keyword except ``metaclass``.  Grail
# called it as ``__prepare__(name, ())``: no bases and no keywords at all,
# because a sole base was emitted inline, where nothing else could read it.

_PREP = {}


class RecordingPrep(type):
    @classmethod
    def __prepare__(mcls, name, bases, **kw):
        _PREP[name] = (name, [b.__name__ for b in bases], sorted(kw.items()),
                       type(bases).__name__)
        return {}

    def __new__(mcls, name, bases, ns, **kw):
        return super().__new__(mcls, name, bases, ns)


class PrepBase:
    pass


class Prepared(PrepBase, metaclass=RecordingPrep, tag=1):
    pass


r['prepare_receives_bases_and_keywords'] = _PREP['Prepared'][:3]
r['prepare_bases_is_a_tuple'] = _PREP['Prepared'][3]


class PreparedMany(P, Q, metaclass=RecordingPrep, b=2, a=1):
    pass


r['prepare_receives_several_bases'] = _PREP['PreparedMany'][:3]


class PreparedBare(metaclass=RecordingPrep):
    pass


# No base written is an EMPTY tuple, not (object,).
r['prepare_receives_no_bases'] = _PREP['PreparedBare'][:3]


class PreparedChild(Prepared):
    pass


# The metaclass is inherited, and so is being asked.
r['prepare_inherited_metaclass'] = _PREP['PreparedChild'][:3]


def _prepare_sole_entry():
    class PreparedEntry(_entry, metaclass=RecordingPrep):
        pass
    return PreparedEntry


_calls, _PE = run(_prepare_sole_entry)
# The RESOLVED base, and the hook still asked only once.
r['prepare_receives_resolved_sole_base'] = [_calls, _PREP['PreparedEntry'][:3],
                                            [b.__name__ for b in _PE.__bases__]]


def _prepare_many_entry():
    class PreparedEntries(_entry, Q, metaclass=RecordingPrep):
        pass
    return PreparedEntries


_calls, _PEs = run(_prepare_many_entry)
r['prepare_receives_resolved_bases'] = [_calls, _PREP['PreparedEntries'][:3],
                                        [b.__name__ for b in _PEs.__bases__]]

# __mro_entries__ runs inside __build_class__, so AFTER every keyword is
# evaluated -- not between the bases and the keywords.


def _entries_after_keywords_sole():
    class O1(f(_entry, 'base'), metaclass=PrepMeta, kw=f(1, 'kw')):
        pass
    return O1


r['mro_entries_after_keywords_sole'] = run(_entries_after_keywords_sole)[0]


def _entries_after_keywords_many():
    class O2(f(_entry, 'base'), f(Q), metaclass=PrepMeta, kw=f(1, 'kw')):
        pass
    return O2


r['mro_entries_after_keywords_many'] = run(_entries_after_keywords_many)[0]


# --- controls: multiple inheritance still works ------------------------------


class Greeter:
    def hello(self):
        return 'hello'


class Mixed(P, Greeter):
    pass


r['secondary_base_method_merged'] = Mixed().hello()


class Mapping(Greeter, dict):
    pass


# The storage base still decides what the instance IS.
_m = Mapping(k=1)
r['storage_base_chosen'] = [isinstance(_m, dict), _m['k'], _m.hello()]

EXPECTED = {
    'two_bases_evaluated_once': ['P', 'Q'],
    'three_bases_evaluated_once': ['P', 'Q', 'object'],
    'one_base_evaluated_once': ['P'],
    'metaclass_evaluated_once': ['P', 'Q', 'type'],
    'keywords_evaluated_once_in_order': ['b', 'a'],
    'keywords_reach_the_hook': ['a', 'b'],
    'whole_header_before_prepare': ['PrepMeta', 'tag', '__prepare__'],
    'splat_evaluated_once': ['splat'],
    'splat_reaches_the_hook': ['x'],
    'boundary_evaluated_once': ['boundary'],
    'boundary_took_effect': True,
    'mro_entries_asked_once': ['__mro_entries__'],
    'orig_bases_kept': True,
    'bases_resolved': ['P', 'Q'],
    'mro_after_resolution': ['U', 'P', 'Q', 'object'],
    'no_hook_no_orig_bases': True,
    'raising_base_stops_the_statement': [['P', 'boom'], 'base failed'],
    'nested_headers_are_separate': ['outerP', 'outerQ', 'innerP', 'innerQ'],
    'nested_inner_bases': ['P', 'Q'],
    'nested_outer_bases': ['P', 'Q'],
    'secondary_base_method_merged': 'hello',
    'storage_base_chosen': [True, 1, 'hello'],
    'prepare_receives_bases_and_keywords': ('Prepared', ['PrepBase'], [('tag', 1)]),
    'prepare_bases_is_a_tuple': 'tuple',
    'prepare_receives_several_bases': ('PreparedMany', ['P', 'Q'], [('a', 1), ('b', 2)]),
    'prepare_receives_no_bases': ('PreparedBare', [], []),
    'prepare_inherited_metaclass': ('PreparedChild', ['Prepared'], []),
    'prepare_receives_resolved_sole_base': [
        ['__mro_entries__'], ('PreparedEntry', ['P'], []), ['P']],
    'prepare_receives_resolved_bases': [
        ['__mro_entries__'], ('PreparedEntries', ['P', 'Q'], []), ['P', 'Q']],
    'mro_entries_after_keywords_sole': ['base', 'kw', '__mro_entries__', '__prepare__'],
    'mro_entries_after_keywords_many': ['base', 'Q', 'kw', '__mro_entries__', '__prepare__'],
}

XFAIL = set()

_disagreeing = sorted(
    k for k, v in EXPECTED.items() if k not in XFAIL and r.get(k) != v)

SUMMARY = '%d checks, %d xfail, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(XFAIL), len(_disagreeing), _disagreeing,
    sorted(r) == sorted(EXPECTED))

if __name__ == '__main__':
    for key in sorted(EXPECTED):
        got = r.get(key)
        want = EXPECTED[key]
        if key in XFAIL:
            status = 'XFAIL' if got == want else 'FAIL'
        else:
            status = 'OK' if got == want else 'FAIL'
        print('%-34s %-5s got=%r want=%r' % (key, status, got, want))
    print(SUMMARY)
