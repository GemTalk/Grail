"""Fixture: sys.implementation has PEP 421's and PEP 734's attributes.

PEP 421 asks for name, version, hexversion and cache_tag, with version a
version_info-like struct sequence (``version.major'' as well as
``version[:2]''), and PEP 734 adds supports_isolated_interpreters, a bool.
Grail's version was a plain tuple and the flag was missing, so test_sys's
test_implementation failed on both.  What the values are is the
implementation's own business; only the shape is checked.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import sys

r = {}

implementation = sys.implementation
version = implementation.version
levels = {'alpha': 0xA, 'beta': 0xB, 'candidate': 0xC, 'final': 0xF}

r['the_attributes'] = [hasattr(implementation, name) for name in
                       ('name', 'version', 'hexversion', 'cache_tag', 'supports_isolated_interpreters')]
r['the_version_is_named'] = version[:2] == (version.major, version.minor)
r['the_hexversion_is_the_version'] = implementation.hexversion == (
    version.major << 24 | version.minor << 16 | version.micro << 8
    | levels[version.releaselevel] << 4 | version.serial)
r['the_name_is_lower_case'] = implementation.name == implementation.name.lower()
r['the_flag_is_a_bool'] = type(implementation.supports_isolated_interpreters).__name__

EXPECTED = {
    'the_attributes': [True, True, True, True, True],
    'the_version_is_named': True,
    'the_hexversion_is_the_version': True,
    'the_name_is_lower_case': True,
    'the_flag_is_a_bool': 'bool',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-30s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
