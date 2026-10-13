"""json.loads() and json.load() take CPython's decoder keywords.

Grail's native json module had a one-argument loads(), so every keyword --
object_pairs_hook, object_hook, parse_float, parse_int, parse_constant, cls,
strict -- failed with ``loads() takes a different number of arguments``.
botocore loads each service model with
``json.loads(payload, object_pairs_hook=OrderedDict)``, so no boto3 client
could be created.  NaN, Infinity and -Infinity, which CPython's decoder
accepts by default, were also refused (``Expecting value``), and a raw
control character inside a string was accepted, as if ``strict`` were always
False -- CPython's default refuses it.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

import collections
import decimal
import io
import json

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


DOC = '{"b": 1, "a": {"y": 2, "x": [3]}, "b": 4}'


class Recorder:
    """A duck-typed ``cls``: CPython calls cls(**kw).decode(s)."""

    def __init__(self, **kw):
        self.kw = kw

    def decode(self, s):
        return ('decoded', s, sorted(self.kw))


t('object_pairs_hook=OrderedDict (botocore)',
  lambda: json.loads('{"b": 1, "a": 2}', object_pairs_hook=collections.OrderedDict))
t('object_pairs_hook sees every pair in order, duplicates included',
  lambda: json.loads(DOC, object_pairs_hook=list))
t('object_hook', lambda: json.loads('{"a": {"b": 1}}', object_hook=lambda d: ('obj', sorted(d))))
t('object_pairs_hook wins over object_hook',
  lambda: json.loads('{"a": 1}', object_hook=lambda d: 'object_hook',
                     object_pairs_hook=lambda p: 'pairs_hook'))
t('an empty object goes through the hook', lambda: json.loads('{}', object_pairs_hook=lambda p: ('pairs', p)))
t('parse_float=Decimal', lambda: json.loads('[1.10, 2e3]', parse_float=decimal.Decimal))
t('parse_int=str', lambda: json.loads('[1, -20]', parse_int=str))
t('parse_float leaves ints alone', lambda: json.loads('[1, 1.5]', parse_float=str))
t('NaN, Infinity, -Infinity by default', lambda: json.loads('[NaN, Infinity, -Infinity]'))
t('parse_constant', lambda: json.loads('[NaN, -Infinity]', parse_constant=lambda c: 'const:' + c))
t('a hook of None is no hook', lambda: json.loads('{"a": 1}', object_hook=None, parse_float=None))
t('a raw control character is refused by default', lambda: json.loads('"a\tb"'))
t('strict=False accepts it', lambda: json.loads('"a\tb"', strict=False))
t('strict=True refuses it', lambda: json.loads('"a\tb"', strict=True))
t('an escaped control character is always fine', lambda: json.loads('"a\\tb"'))
t('cls is called with the other keywords', lambda: json.loads('[1]', cls=Recorder, parse_int=str))
t('load(fp, **kw)', lambda: json.load(io.StringIO('{"z": 1, "y": 2}'), object_pairs_hook=list))
t('an unknown keyword is a TypeError', lambda: json.loads('1', foo=1))
t('a truncated constant is still an error', lambda: json.loads('[NaNx]'))


EXPECTED = {
    'object_pairs_hook=OrderedDict (botocore)': "OrderedDict({'b': 1, 'a': 2})",
    'object_pairs_hook sees every pair in order, duplicates included': "[('b', 1), ('a', [('y', 2), ('x', [3])]), ('b', 4)]",
    'object_hook': "('obj', ['a'])",
    'object_pairs_hook wins over object_hook': "'pairs_hook'",
    'an empty object goes through the hook': "('pairs', [])",
    'parse_float=Decimal': "[Decimal('1.10'), Decimal('2E+3')]",
    'parse_int=str': "['1', '-20']",
    'parse_float leaves ints alone': "[1, '1.5']",
    'NaN, Infinity, -Infinity by default': '[nan, inf, -inf]',
    'parse_constant': "['const:NaN', 'const:-Infinity']",
    'a hook of None is no hook': "{'a': 1}",
    'a raw control character is refused by default': 'JSONDecodeError: Invalid control character at: line 1 column 3 (char 2)',
    'strict=False accepts it': "'a\\tb'",
    'strict=True refuses it': 'JSONDecodeError: Invalid control character at: line 1 column 3 (char 2)',
    'an escaped control character is always fine': "'a\\tb'",
    'cls is called with the other keywords': "('decoded', '[1]', ['parse_int'])",
    'load(fp, **kw)': "[('z', 1), ('y', 2)]",
    'an unknown keyword is a TypeError': "TypeError: JSONDecoder.__init__() got an unexpected keyword argument 'foo'",
    'a truncated constant is still an error': "JSONDecodeError: Expecting ',' delimiter: line 1 column 5 (char 4)",
}


def mismatches():
    """The rows that differ from CPython's, as 'label: got X, CPython Y'."""
    return ['%s: got %s, CPython %s' % (k, r.get(k), v)
            for k, v in EXPECTED.items() if r.get(k) != v]
