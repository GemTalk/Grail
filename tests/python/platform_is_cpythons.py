"""Fixture: platform is CPython's, so it describes the host it runs on.

Grail's platform module was a hand-written stub that answered 'Darwin' for
system() on every host -- CI's Linux included -- and '' for release(),
version(), machine() and node(), had no libc_ver() (test_strptime and
test_time read it at import), and answered uname() as a plain 6-tuple.  It is
now CPython's Lib/platform.py, which builds everything from os.uname() and
the files and commands of the host, with one GRAIL ADAPTATION that parses
Grail's sys.version.

The checks hold on any POSIX host, and every one holds under CPython 3.14,
which is what makes it evidence.  The python_*() answers name the
implementation and are left out: CPython's say CPython.
"""

import os
import platform
import sys

r = {}


def outcome(call):
    try:
        return call()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


names = outcome(lambda: os.uname())


def unpacked_uname():
    system, node, release, version, machine, processor = platform.uname()
    return [system == names.sysname, node == names.nodename, isinstance(processor, str)]


r['the_names_are_the_hosts'] = outcome(lambda: [
    platform.system() == names.sysname, platform.node() == names.nodename,
    platform.release() == names.release, platform.version() == names.version,
    platform.machine() == names.machine])
r['the_system_is_the_platforms'] = outcome(lambda: platform.system().lower() == sys.platform)
r['uname_is_six_fields_with_the_processor'] = outcome(lambda: [
    type(platform.uname()).__name__, len(platform.uname()), tuple(platform.uname())[:5] == tuple(names)])
r['uname_unpacks_into_six'] = outcome(unpacked_uname)
r['platform_names_the_system_first'] = outcome(
    lambda: platform.platform().startswith('macOS-' if sys.platform == 'darwin' else 'Linux-'))
r['the_python_version_is_the_language_level'] = outcome(lambda: [
    platform.python_version() == '%d.%d.%d' % sys.version_info[:3],
    platform.python_version_tuple() == tuple(str(n) for n in sys.version_info[:3])])
r['libc_ver_answers_two_strs'] = outcome(lambda: [isinstance(part, str) for part in platform.libc_ver()])
r['mac_ver_answers_only_on_macos'] = outcome(lambda: bool(platform.mac_ver()[0]) == (sys.platform == 'darwin'))
r['a_cpython_version_still_parses'] = outcome(lambda: platform._sys_version(
    '3.14.8 (main, Oct 29 2026, 11:07:44) [Clang 21.0.0 ]')[:2])

EXPECTED = {
    'the_names_are_the_hosts': [True, True, True, True, True],
    'the_system_is_the_platforms': True,
    'uname_is_six_fields_with_the_processor': ['uname_result', 6, True],
    'uname_unpacks_into_six': [True, True, True],
    'platform_names_the_system_first': True,
    'the_python_version_is_the_language_level': [True, True],
    'libc_ver_answers_two_strs': [True, True],
    'mac_ver_answers_only_on_macos': True,
    'a_cpython_version_still_parses': ('CPython', '3.14.8'),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-44s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
