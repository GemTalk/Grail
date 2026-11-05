"""Fixture: sys.thread_info is a struct sequence, as CPython's is.

CPython's sys.thread_info is a three-field struct sequence -- name, lock and
version (Python/thread.c, PyThread_GetInfo) -- which test_sys's
test_thread_info measures.  Grail's was None.  Grail's threads are GemStone
processes, none of the implementations CPython names, so each field is
None, which the test admits for each and the documentation gives lock and
version as "unknown".

Only the shape is checked against CPython here: its field VALUES describe
the machine's own thread library.
"""

import sys

r = {}

info = sys.thread_info
r['a_three_field_struct_sequence'] = [len(info), info.n_fields, info.n_sequence_fields, isinstance(info, tuple)]
r['its_type'] = [type(info).__name__, type(info).__module__, repr(info).startswith('sys.thread_info(name=')]
r['the_fields_read_by_name'] = [info[0] is info.name, info[1] is info.lock, info[2] is info.version]
r['test_sys_accepts_its_values'] = [info.name in ('nt', 'pthread', 'pthread-stubs', 'solaris', None),
                                    info.lock in ('semaphore', 'mutex+cond', None),
                                    info.version is None or isinstance(info.version, str)]

EXPECTED = {
    'a_three_field_struct_sequence': [3, 3, 3, True],
    'its_type': ['thread_info', 'sys', True],
    'the_fields_read_by_name': [True, True, True],
    'test_sys_accepts_its_values': [True, True, True],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-32s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
