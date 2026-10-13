"""Fixture: what counts as a MAPPING on the right of % formatting.

CPython's rule decides two things at once: where ``%(key)s'' looks a key up,
and whether arguments left over at the end are an error.  The right operand is
a mapping when it supports subscripting and is not a tuple or a str -- and, for
bytes formatting, not bytes or bytearray either.  So a list, a range, a
ChainMap, a mappingproxy and any class with __getitem__ all count:

    '%(x)s' % collections.ChainMap({'x': 2})   ->  '2'
    'abc' % [1]                                ->  'abc'  (no leftover error)

Grail accepted only a dict, so every other mapping got ``format requires a
mapping'' and ``'abc' % [1]'' got ``not all arguments converted'' (#1220).
bytes formatting had the same test, and also turned a dict operand into
``format requires a mapping'' for an UNKEYED specifier, where CPython formats
it as one value: ``b'%r' % {}'' is b'{}'.

THE EXCLUSIONS MATTER AS MUCH AS THE INCLUSIONS.  Grail gives int and None
methods that exist only to refuse subscripting, every Python instance inherits
a refusing __getitem__, a builtin function subscripts as a PEP 585 no-op, and a
module is a dictionary underneath.  None of those is a mapping to CPython, and
the ``not_a_mapping'' checks pin each one.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import collections
import types

r = {}


def outcome(fn):
    try:
        return 'ok -> %r' % (fn(),)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


class Upper:
    """A mapping in CPython's sense: __getitem__, and nothing else."""

    def __getitem__(self, key):
        return key.upper()


class Plain:
    pass


# --- a mapping that is not a dict serves %(key)s ------------------------------

r['chainmap'] = outcome(lambda: '%(x)s' % collections.ChainMap({'x': 2}))
r['mappingproxy'] = outcome(lambda: '%(x)s' % types.MappingProxyType({'x': 1}))
r['class_with_getitem'] = outcome(lambda: '%(x)s and %(y)s' % Upper())
r['bytes_class_with_getitem'] = outcome(lambda: b'%(x)s' % Upper())

# --- ...and is exempt from the leftover-argument check -------------------------

r['unused_list'] = outcome(lambda: 'abc' % [1])
r['unused_range'] = outcome(lambda: 'abc' % range(3))
r['unused_bytes_on_str'] = outcome(lambda: 'abc' % b'x')
r['unused_custom_mapping'] = outcome(lambda: 'abc' % Upper())
r['bytes_unused_list'] = outcome(lambda: b'abc' % [1])

# --- a list keyed by a name fails in the list, as in CPython -------------------

r['keyed_list'] = outcome(lambda: '%(x)s' % [1])

# --- a mapping is still ONE positional value -----------------------------------

r['list_is_one_value'] = outcome(lambda: '%s' % [1, 2])
r['dict_is_one_value'] = outcome(lambda: '%s' % {'a': 1})
r['bytes_dict_is_one_value'] = outcome(lambda: b'%r' % {})
r['one_value_only'] = outcome(lambda: '%s %s' % [1])

# --- not a mapping --------------------------------------------------------------

r['not_a_mapping'] = [
    outcome(lambda: '%(x)s' % 5),
    outcome(lambda: '%(x)s' % 5.0),
    outcome(lambda: '%(x)s' % None),
    outcome(lambda: '%(x)s' % (1,)),
    outcome(lambda: '%(x)s' % 'str'),
    outcome(lambda: '%(x)s' % len),
    outcome(lambda: '%(x)s' % collections),
    outcome(lambda: '%(x)s' % Plain()),
]
r['leftovers_still_an_error'] = [
    outcome(lambda: 'abc' % 5),
    outcome(lambda: 'abc' % 'x'),
    outcome(lambda: 'abc' % Plain()),
]
r['bytes_not_a_mapping'] = [
    outcome(lambda: b'%(x)s' % 5),
    outcome(lambda: b'%(x)s' % (1,)),
    outcome(lambda: b'%(x)s' % b'x'),
    outcome(lambda: b'abc' % b'x'),
    outcome(lambda: b'abc' % bytearray(b'x')),
]

# --- controls: #1220's original cases ------------------------------------------

r['missing_key'] = outcome(lambda: '%(x)s' % {})
r['defaultdict'] = outcome(lambda: '%(x)s' % collections.defaultdict(int))


EXPECTED = {
    'chainmap': "ok -> '2'",
    'mappingproxy': "ok -> '1'",
    'class_with_getitem': "ok -> 'X and Y'",
    'bytes_class_with_getitem': "ok -> b'X'",
    'unused_list': "ok -> 'abc'",
    'unused_range': "ok -> 'abc'",
    'unused_bytes_on_str': "ok -> 'abc'",
    'unused_custom_mapping': "ok -> 'abc'",
    'bytes_unused_list': "ok -> b'abc'",
    'keyed_list': 'TypeError: list indices must be integers or slices, not str',
    'list_is_one_value': "ok -> '[1, 2]'",
    'dict_is_one_value': 'ok -> "{\'a\': 1}"',
    'bytes_dict_is_one_value': "ok -> b'{}'",
    'one_value_only': 'TypeError: not enough arguments for format string',
    'not_a_mapping': ['TypeError: format requires a mapping'] * 8,
    'leftovers_still_an_error':
        ['TypeError: not all arguments converted during string formatting'] * 3,
    'bytes_not_a_mapping': ['TypeError: format requires a mapping'] * 3
        + ['TypeError: not all arguments converted during bytes formatting'] * 2,
    'missing_key': "KeyError: 'x'",
    'defaultdict': "ok -> '0'",
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-26s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
