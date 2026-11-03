"""Fixture: time.struct_time, os.stat_result and sys.version_info are CPython's struct sequences.

A struct sequence (Objects/structseq.c) is a tuple of its sequence fields --
the named ones, then any unnamed -- with its named-only fields beside it.  Its
type derives from tuple directly, reports n_fields, n_sequence_fields and
n_unnamed_fields, and takes ``T(sequence, dict={})``: any iterable of a length
between n_sequence_fields and n_fields, and a dict filling the named-only
fields the sequence left unset, each refused in CPython's words.  Its fields
are read-only and it has no __dict__; it reprs as ``type.name(field=value,
...)``, reduces to ``(type, (tuple, {named-only}))`` and supports
copy.replace() unless it has unnamed fields.

Grail's struct_time took any tuple and had no named-only fields, no n_fields,
no __replace__ and no read-only fields -- test_structseq.

Every check here holds under CPython 3.14, which is what makes it evidence;
os.stat_result's n_fields is the platform's, so it is not checked.
"""

import copy
import os
import pickle
import sys
import time

r = {}


def outcome(thunk):
    try:
        return thunk()
    except (TypeError, AttributeError) as e:
        return '%s: %s' % (type(e).__name__, e)


T = time.struct_time
VersionInfo = type(sys.version_info)
nine = T(range(9))

r['types_derive_from_tuple'] = [[c.__name__ for c in t.__mro__] for t in (T, os.stat_result, VersionInfo)]
r['field_counts'] = [(T.n_fields, T.n_sequence_fields, T.n_unnamed_fields),
                     (os.stat_result.n_sequence_fields, os.stat_result.n_unnamed_fields),
                     (VersionInfo.n_fields, VersionInfo.n_sequence_fields, VersionInfo.n_unnamed_fields),
                     nine.n_fields]
r['match_args'] = [T.__match_args__, VersionInfo.__match_args__]
r['a_sequence_and_a_dict'] = [nine == tuple(range(9)), nine.tm_year, nine.tm_isdst, nine.tm_zone,
                              T(range(9), {'tm_zone': 'X'}).tm_zone, T(range(10)).tm_zone,
                              T(sequence=range(9)).tm_mon, T([0] * 11).tm_gmtoff]
r['lengths_refused'] = [outcome(lambda: T(range(8))), outcome(lambda: T(range(12))),
                        outcome(lambda: T())]
r['arguments_refused'] = [outcome(lambda: T(5)), outcome(lambda: T(range(9), 5)),
                          outcome(lambda: T(range(9), {'bogus': 1})),
                          outcome(lambda: T(range(10), {'tm_zone': 'X'}))]
r['fields_are_read_only'] = [outcome(lambda: setattr(nine, 'tm_year', 1)),
                             outcome(lambda: setattr(nine, 'tm_zone', 1)),
                             outcome(lambda: setattr(nine, 'foo', 1))]
r['repr'] = repr(nine)
r['reduce'] = nine.__reduce__() == (T, (tuple(range(9)), {'tm_zone': None, 'tm_gmtoff': None}))
r['pickle_round_trip'] = [type(pickle.loads(pickle.dumps(nine))) is T,
                          pickle.loads(pickle.dumps(T(range(9), {'tm_zone': 'X'}))).tm_zone]
r['replace'] = [copy.replace(nine, tm_year=5)[:2], copy.replace(nine, tm_zone='Z').tm_zone,
                outcome(lambda: copy.replace(nine, bogus=1)),
                outcome(lambda: nine.__replace__(1)),
                outcome(lambda: os.stat('.').__replace__(st_mode=1))]
r['version_info_refuses_instances'] = [outcome(lambda: VersionInfo((3, 14, 0, 'final', 0))),
                                       outcome(lambda: VersionInfo(sequence=(3, 14, 0, 'final', 0)))]

EXPECTED = {
    'types_derive_from_tuple': [['struct_time', 'tuple', 'object'], ['stat_result', 'tuple', 'object'],
                                ['version_info', 'tuple', 'object']],
    'field_counts': [(11, 9, 0), (10, 3), (5, 5, 0), 11],
    'match_args': [('tm_year', 'tm_mon', 'tm_mday', 'tm_hour', 'tm_min', 'tm_sec', 'tm_wday',
                    'tm_yday', 'tm_isdst'),
                   ('major', 'minor', 'micro', 'releaselevel', 'serial')],
    'a_sequence_and_a_dict': [True, 0, 8, None, 'X', 9, 1, 0],
    'lengths_refused': ['TypeError: time.struct_time() takes an at least 9-sequence (8-sequence given)',
                        'TypeError: time.struct_time() takes an at most 11-sequence (12-sequence given)',
                        "TypeError: structseq() missing required argument 'sequence' (pos 1)"],
    'arguments_refused': ['TypeError: constructor requires a sequence',
                          'TypeError: time.struct_time() takes a dict as second arg, if any',
                          'TypeError: time.struct_time() got duplicate or unexpected field name(s)',
                          'TypeError: time.struct_time() got duplicate or unexpected field name(s)'],
    'fields_are_read_only': ['AttributeError: readonly attribute', 'AttributeError: readonly attribute',
                             "AttributeError: 'time.struct_time' object has no attribute 'foo' "
                             "and no __dict__ for setting new attributes"],
    'repr': 'time.struct_time(tm_year=0, tm_mon=1, tm_mday=2, tm_hour=3, tm_min=4, tm_sec=5, '
            'tm_wday=6, tm_yday=7, tm_isdst=8)',
    'reduce': True,
    'pickle_round_trip': [True, 'X'],
    'replace': [(5, 1), 'Z', "TypeError: Got unexpected field name(s): ['bogus']",
                'TypeError: __replace__() takes no positional arguments',
                'TypeError: __replace__() is not supported for os.stat_result '
                'because it has unnamed field(s)'],
    'version_info_refuses_instances': ["TypeError: cannot create 'sys.version_info' instances"] * 2,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-31s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
