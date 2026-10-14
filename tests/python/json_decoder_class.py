"""``json.JSONDecoder`` exists and can be subclassed, as in CPython (#1591).

Grail's json module had no JSONDecoder at all, on ``json`` or on
``json.decoder``, so ``class MyDecoder(json.JSONDecoder)`` failed and
``json.loads(s, cls=...)`` had no base class to be given.  The rows cover the
class itself, its keyword attributes, decode and raw_decode with their error
cases, and the subclassing idioms real code uses: hooks passed up through
``super().__init__``, a hook as a method, an overridden decode, an attribute
reassigned after construction (which CPython's scanner ignores: it captured
the hooks in __init__).

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

import decimal
import json
import json.decoder

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


D = json.JSONDecoder


class Tagged(json.JSONDecoder):
    """The usual idiom: a hook method handed up through super().__init__."""

    def __init__(self, *args, **kwargs):
        super().__init__(object_hook=self.tag, *args, **kwargs)

    def tag(self, d):
        return ('tagged', sorted(d.items()))


class Upper(json.JSONDecoder):
    """An overridden decode, reached by json.loads(cls=...)."""

    def decode(self, s):
        return ('wrapped', super().decode(s.strip('*')))


class Pairs(json.JSONDecoder):
    pass


class NoInit(json.JSONDecoder):
    def __init__(self):
        pass


def stream(text):
    """raw_decode as a streaming reader: values separated by whitespace."""
    d, out, i = D(), [], 0
    while i < len(text):
        while i < len(text) and text[i].isspace():
            i += 1
        if i == len(text):
            break
        v, i = d.raw_decode(text, i)
        out.append(v)
    return out


def reassigned_after_init():
    d = D()
    d.parse_int = lambda s: ('int', s)
    return d.decode('[1, 2.5]')


t('class identity', lambda: (json.JSONDecoder is json.decoder.JSONDecoder, isinstance(json.JSONDecoder, type)))
t('names', lambda: (D.__module__, D.__name__, D.__qualname__, repr(D)))
t('defaults', lambda: (D().object_hook, D().parse_float is float, D().parse_int is int, D().strict, D().object_pairs_hook, callable(D().parse_constant)))
t('keywords stored', lambda: (lambda d: (d.object_hook is dict, d.strict))(D(object_hook=dict, strict=False)))
t('a positional argument', lambda: D(None))
t('an unknown keyword', lambda: D(foo=1))
t('decode', lambda: D().decode('  {"a": [1, 2.5, null, true]}  '))
t('decode extra data', lambda: D().decode('1 2'))
t('decode empty', lambda: D().decode(''))
t('decode bytes', lambda: D().decode(b'1'))
t('raw_decode at 0', lambda: D().raw_decode('[1] tail'))
t('raw_decode at idx', lambda: D().raw_decode('xx[1, 2] tail', 2))
t('raw_decode idx keyword', lambda: D().raw_decode('  7', idx=2))
t('raw_decode does not skip whitespace', lambda: D().raw_decode(' 1'))
t('raw_decode negative idx', lambda: D().raw_decode('[1]', -1))
t('raw_decode past the end', lambda: D().raw_decode('[1]', 9))
t('raw_decode bytes', lambda: D().raw_decode(b'1'))
t('raw_decode as a stream', lambda: stream('1 "two" [3]  {"four": 4}'))
t('object_hook', lambda: D(object_hook=lambda d: sorted(d)).decode('{"b": 1, "a": 2}'))
t('object_pairs_hook', lambda: D(object_pairs_hook=list).decode('{"b": 1, "a": 2}'))
t('parse_float', lambda: D(parse_float=decimal.Decimal).decode('[1.10, 2]'))
t('parse_int', lambda: D(parse_int=str).decode('[1, 2.5]'))
t('parse_constant', lambda: D(parse_constant=lambda c: 'const:' + c).decode('[NaN, -Infinity]'))
t('default parse_constant', lambda: (D().parse_constant('Infinity'), D().decode('[Infinity]')))
t('strict=False allows a control character', lambda: D(strict=False).decode('"a\tb"'))
t('strict refuses a control character', lambda: D().decode('"a\tb"'))
t('attribute reassigned after init', reassigned_after_init)
t('strict reassigned after init', lambda: (lambda d: (setattr(d, 'strict', False), d.decode('"a\tb"')))(D()))
t('subclass without super().__init__: decode', lambda: NoInit().decode('1'))
t('subclass without super().__init__: raw_decode', lambda: NoInit().raw_decode('1'))
t('subclass: hook through super().__init__', lambda: json.loads('{"x": 1}', cls=Tagged))
t('subclass: overridden decode via loads(cls=)', lambda: json.loads('**[true]**', cls=Upper))
t('subclass: loads(cls=) passes keywords to it', lambda: json.loads('{"b": 1, "a": 2}', cls=Pairs, object_pairs_hook=list))
t('subclass: isinstance and names', lambda: (isinstance(Tagged(), D), Tagged.__qualname__, issubclass(Upper, json.decoder.JSONDecoder)))
t('loads(cls=JSONDecoder)', lambda: json.loads('[1]', cls=json.JSONDecoder))


EXPECTED = {
    'class identity': '(True, True)',
    'names': '(\'json.decoder\', \'JSONDecoder\', \'JSONDecoder\', "<class \'json.decoder.JSONDecoder\'>")',
    'defaults': '(None, True, True, True, None, True)',
    'keywords stored': '(True, False)',
    'a positional argument': 'TypeError: JSONDecoder.__init__() takes 1 positional argument but 2 were given',
    'an unknown keyword': "TypeError: JSONDecoder.__init__() got an unexpected keyword argument 'foo'",
    'decode': "{'a': [1, 2.5, None, True]}",
    'decode extra data': 'JSONDecodeError: Extra data: line 1 column 3 (char 2)',
    'decode empty': 'JSONDecodeError: Expecting value: line 1 column 1 (char 0)',
    'decode bytes': 'TypeError: cannot use a string pattern on a bytes-like object',
    'raw_decode at 0': '([1], 3)',
    'raw_decode at idx': '([1, 2], 8)',
    'raw_decode idx keyword': '(7, 3)',
    'raw_decode does not skip whitespace': 'JSONDecodeError: Expecting value: line 1 column 1 (char 0)',
    'raw_decode negative idx': 'ValueError: idx cannot be negative',
    'raw_decode past the end': 'JSONDecodeError: Expecting value: line 1 column 10 (char 9)',
    'raw_decode bytes': 'TypeError: first argument must be a string, not bytes',
    'raw_decode as a stream': "[1, 'two', [3], {'four': 4}]",
    'object_hook': "['a', 'b']",
    'object_pairs_hook': "[('b', 1), ('a', 2)]",
    'parse_float': "[Decimal('1.10'), 2]",
    'parse_int': "['1', 2.5]",
    'parse_constant': "['const:NaN', 'const:-Infinity']",
    'default parse_constant': '(inf, [inf])',
    'strict=False allows a control character': "'a\\tb'",
    'strict refuses a control character': 'JSONDecodeError: Invalid control character at: line 1 column 3 (char 2)',
    'attribute reassigned after init': '[1, 2.5]',
    'strict reassigned after init': 'JSONDecodeError: Invalid control character at: line 1 column 3 (char 2)',
    'subclass without super().__init__: decode': "AttributeError: 'NoInit' object has no attribute 'scan_once'",
    'subclass without super().__init__: raw_decode': "AttributeError: 'NoInit' object has no attribute 'scan_once'",
    'subclass: hook through super().__init__': "('tagged', [('x', 1)])",
    'subclass: overridden decode via loads(cls=)': "('wrapped', [True])",
    'subclass: loads(cls=) passes keywords to it': "[('b', 1), ('a', 2)]",
    'subclass: isinstance and names': "(True, 'Tagged', True)",
    'loads(cls=JSONDecoder)': '[1]',
}


def mismatches():
    """The rows that differ from CPython's, as 'label: got X, CPython Y'."""
    return ['%s: got %s, CPython %s' % (k, r.get(k), v)
            for k, v in EXPECTED.items() if r.get(k) != v]


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
