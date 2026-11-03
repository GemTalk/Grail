"""Fixture: os.times() answers an os.times_result, as CPython's does.

os.times() (Modules/posixmodule.c, os_times_impl) is times(2): the user
and system time of the process and of its children, and the elapsed real
time, each a float in seconds, in a struct sequence named
posix.times_result that copy.replace handles field by field.

Grail had no os.times at all (test_structseq
test_copy_replace_all_fields_visible).

Every check here holds under CPython 3.14, which is what makes it evidence;
the values themselves differ by machine, so only their shape and order are
asserted.
"""

import copy
import os

r = {}

before = os.times()
total = 0
for i in range(200000):
    total += i * i
after = os.times()

r['the_type'] = (type(before).__module__, type(before).__qualname__)
r['the_type_is_os_times_result'] = type(before) is os.times_result
r['field_counts'] = (os.times_result.n_fields, os.times_result.n_sequence_fields,
                     os.times_result.n_unnamed_fields)
r['field_names'] = os.times_result.__match_args__
r['five_floats'] = (len(before), all(isinstance(value, float) for value in before))
r['none_negative'] = all(value >= 0 for value in before)
r['the_named_fields_are_the_items'] = (before.user, before.system, before.children_user,
                                       before.children_system, before.elapsed) == tuple(before)
r['time_does_not_run_backwards'] = (after.user >= before.user, after.elapsed >= before.elapsed)
r['the_repr'] = repr(before).startswith('posix.times_result(user=')
replaced = copy.replace(before, user=1.5, system=2.5)
r['copy_replace'] = (type(replaced) is os.times_result, tuple(replaced) == (1.5, 2.5, *before[2:]))
try:
    copy.replace(before, error=-1)
    r['an_unknown_field'] = 'no error'
except TypeError as e:
    r['an_unknown_field'] = 'unexpected field name' in str(e)
r['built_from_a_sequence'] = os.times_result((1.0, 2.0, 3.0, 4.0, 5.0)).elapsed

EXPECTED = {
    'the_type': ('posix', 'times_result'),
    'the_type_is_os_times_result': True,
    'field_counts': (5, 5, 0),
    'field_names': ('user', 'system', 'children_user', 'children_system', 'elapsed'),
    'five_floats': (5, True),
    'none_negative': True,
    'the_named_fields_are_the_items': True,
    'time_does_not_run_backwards': (True, True),
    'the_repr': True,
    'copy_replace': (True, True),
    'an_unknown_field': True,
    'built_from_a_sequence': 5.0,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-32s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
