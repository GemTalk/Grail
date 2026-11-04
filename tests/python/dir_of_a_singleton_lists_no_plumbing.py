"""Fixture: dir() of None, ... and NotImplemented lists only their attributes.

Grail's NoneType carries env-1 ``<'', ``<='', ``>'' and ``>='' because a
sort block sends them, and the singletons' classes carry ``instance'' and
``clearInstance'', the accessors of the one instance each has.  dir()
decoded the first as names and listed the second as methods, so dir(None)
held six names CPython's does not -- and rlcompleter, which completes from
dir(), offered ``None.<('' and ``None.instance'' (test_rlcompleter
test_attr_matches).  A Python class's own ``instance'' method is an
attribute like any other.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import sys

r = {}


class Registry:
    def instance(self):
        return 'its own'

    @classmethod
    def clearInstance(cls):
        return 'its own too'


plumbing = ('instance', 'clearInstance')
r['no_name_that_is_no_identifier'] = sorted({name for each in (None, ..., NotImplemented, type(None))
                                             for name in dir(each) if not name.isidentifier()})
r['no_singleton_accessor'] = [[name in dir(each) for name in plumbing]
                              for each in (None, ..., NotImplemented, type(None), sys)]
r['a_python_class_keeps_its_own'] = [[name in dir(Registry) for name in plumbing],
                                     Registry().instance(), Registry.clearInstance()]
r['the_real_attributes_stay'] = [name in dir(None) for name in ('__bool__', '__eq__', '__lt__', '__repr__')]
try:
    None < None
    r['comparing_none_still_refuses'] = 'no error'
except TypeError as error:
    r['comparing_none_still_refuses'] = str(error)

EXPECTED = {
    'no_name_that_is_no_identifier': [],
    'no_singleton_accessor': [[False, False]] * 5,
    'a_python_class_keeps_its_own': [[True, True], 'its own', 'its own too'],
    'the_real_attributes_stay': [True, True, True, True],
    'comparing_none_still_refuses': "'<' not supported between instances of 'NoneType' and 'NoneType'",
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-32s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
