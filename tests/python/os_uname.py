"""Fixture: os.uname() answers uname(2)'s five names in a posix.uname_result.

CPython's os.uname (Modules/posixmodule.c, os_uname_impl) calls uname(2) and
answers its sysname, nodename, release, version and machine, each decoded as
a filesystem name, in a struct sequence whose type is posix.uname_result.
Grail had no os.uname at all, so CPython's own platform.uname() could not
run.

The checks hold on any POSIX machine -- the names themselves are the host's
-- and every one holds under CPython 3.14, which is what makes it evidence.
A name read at the wrong offset of the struct, whose field size differs
between Darwin and glibc, shows up as an empty or NUL-holding name, or as a
sysname that is not the platform's.
"""

import os
import sys

r = {}


def outcome(call):
    try:
        return call()
    except (AttributeError, TypeError, OSError) as e:
        return '%s: %s' % (type(e).__name__, e)


def names():
    return os.uname()


r['its_type_is_posix_uname_result'] = outcome(
    lambda: [type(names()).__name__, type(names()).__module__, os.uname_result is type(names())])
r['it_has_five_fields'] = outcome(
    lambda: [len(names()), os.uname_result.n_fields, os.uname_result.n_sequence_fields])
r['its_fields_are_named_in_order'] = outcome(
    lambda: tuple(names()) == (names().sysname, names().nodename, names().release,
                               names().version, names().machine))
r['every_name_is_a_nonempty_str'] = outcome(
    lambda: [isinstance(name, str) and name != '' for name in names()])
r['no_name_holds_a_nul'] = outcome(lambda: ['\0' in name for name in names()])
r['the_system_is_the_platforms'] = outcome(lambda: names().sysname.lower() == sys.platform)
r['its_repr_names_the_type'] = outcome(lambda: repr(names()).startswith("posix.uname_result(sysname='"))
r['it_answers_the_same_names_again'] = outcome(lambda: names() == names())

EXPECTED = {
    'its_type_is_posix_uname_result': ['uname_result', 'posix', True],
    'it_has_five_fields': [5, 5, 5],
    'its_fields_are_named_in_order': True,
    'every_name_is_a_nonempty_str': [True, True, True, True, True],
    'no_name_holds_a_nul': [False, False, False, False, False],
    'the_system_is_the_platforms': True,
    'its_repr_names_the_type': True,
    'it_answers_the_same_names_again': True,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-34s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
