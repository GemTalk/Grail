"""Fixture: str.encode and bytes.decode refuse their arguments as Argument Clinic does.

encode(encoding='utf-8', errors='strict') and decode(encoding='utf-8',
errors='strict') are bound by Argument Clinic: more than two arguments in
all is "takes at most 2 arguments", a keyword naming neither parameter is
"got an unexpected keyword argument", one given both ways is "given by
name ... and position", and either argument that is no str is "argument
'encoding' must be str, not int" (_PyArg_BadArgument, Python/getargs.c).

Grail sent a non-str encoding asLowercase -- a MessageNotUnderstood no
Python code can catch, which ended test_str's test_codecs_errors -- took a
non-str errors, read a third argument as nothing, and bytes.decode ignored
an unknown keyword.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def refusal(thunk):
    try:
        thunk()
        return 'accepted'
    except TypeError as e:
        return str(e)


r['encode_types'] = [refusal(lambda: 'hello'.encode(42)), refusal(lambda: 'hello'.encode(encoding=42)),
                     refusal(lambda: 'hello'.encode('utf-8', 42)), refusal(lambda: 'hello'.encode(errors=42))]
r['encode_arity'] = [refusal(lambda: 'hello'.encode(42, 42, 42)),
                     refusal(lambda: 'hello'.encode('utf-8', 'strict', 'x')),
                     refusal(lambda: 'hello'.encode('utf-8', encoding='ascii')),
                     refusal(lambda: 'hello'.encode(x=1))]
r['decode_types'] = [refusal(lambda: b'hi'.decode(42)), refusal(lambda: b'hi'.decode('utf-8', 42)),
                     refusal(lambda: bytearray(b'hi').decode(42))]
r['decode_arity'] = [refusal(lambda: b'hi'.decode(42, 42, 42)), refusal(lambda: b'hi'.decode(x=1)),
                     refusal(lambda: b'hi'.decode('utf-8', encoding='ascii'))]
r['the_valid_spellings'] = ['hello'.encode(), 'hello'.encode('ascii'), 'hello'.encode(errors='strict'),
                            b'hi'.decode(), b'hi'.decode(encoding='latin-1', errors='strict')]
r['str_construction_keeps_its_words'] = refusal(lambda: str(b'x', 1))

EXPECTED = {
    'encode_types': ["encode() argument 'encoding' must be str, not int"] * 2
                    + ["encode() argument 'errors' must be str, not int"] * 2,
    'encode_arity': ['encode() takes at most 2 arguments (3 given)'] * 2
                    + ["argument for encode() given by name ('encoding') and position (1)",
                       "encode() got an unexpected keyword argument 'x'"],
    'decode_types': ["decode() argument 'encoding' must be str, not int",
                     "decode() argument 'errors' must be str, not int",
                     "decode() argument 'encoding' must be str, not int"],
    'decode_arity': ['decode() takes at most 2 arguments (3 given)',
                     "decode() got an unexpected keyword argument 'x'",
                     "argument for decode() given by name ('encoding') and position (1)"],
    'the_valid_spellings': [b'hello', b'hello', b'hello', 'hi', 'hi'],
    'str_construction_keeps_its_words': "str() argument 'encoding' must be str, not int",
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-34s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
