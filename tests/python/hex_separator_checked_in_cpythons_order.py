"""Fixture: bytes.hex and bytearray.hex check a separator in CPython's order.

CPython's _Py_strhex_impl (Python/pystrhex.c:15-41) takes the separator's
len() first, then refuses a length other than 1, then accepts only a str or a
bytes, then only ASCII.  Grail checked the type first: an int raised ``sep must
be str or bytes.'' where CPython raises len()'s own TypeError, None raised a
message of Grail's own, and a bytearray separator was accepted.  Every check
holds under CPython 3.14, which is what makes it evidence.
"""

r = {}
data = bytes([0xB9, 0x01, 0xEF])


class Text(str):
    pass


def outcome(call):
    try:
        return call()
    except (TypeError, ValueError) as error:
        return '%s: %s' % (type(error).__name__, error)


def both(sep):
    return [outcome(lambda: data.hex(sep)), outcome(lambda: bytearray(data).hex(sep, 2))]


r['what_has_no_len_raises_lens_error'] = [both(5), both(None)]
r['a_bytearray_or_memoryview_is_not_bytes'] = [both(bytearray(b'|')), both(memoryview(b'|'))]
r['a_one_item_list_is_not_a_str'] = both(['x'])
r['a_length_other_than_one'] = [both(''), both('::'), both(b'')]
r['only_ascii'] = [both(chr(0xE9)), both(chr(0x20AC)), both(bytes([0xE9]))]
r['what_is_accepted'] = [both(':'), both(b'-'), both(Text('.'))]

LENGTH = 'ValueError: sep must be length 1.'
ASCII = 'ValueError: sep must be ASCII.'
TYPE = 'TypeError: sep must be str or bytes.'
EXPECTED = {
    'what_has_no_len_raises_lens_error': [["TypeError: object of type 'int' has no len()"] * 2,
                                          ["TypeError: object of type 'NoneType' has no len()"] * 2],
    'a_bytearray_or_memoryview_is_not_bytes': [[TYPE, TYPE], [TYPE, TYPE]],
    'a_one_item_list_is_not_a_str': [TYPE, TYPE],
    'a_length_other_than_one': [[LENGTH, LENGTH], [LENGTH, LENGTH], [LENGTH, LENGTH]],
    'only_ascii': [[ASCII, ASCII], [ASCII, ASCII], [ASCII, ASCII]],
    'what_is_accepted': [['b9:01:ef', 'b9:01ef'], ['b9-01-ef', 'b9-01ef'], ['b9.01.ef', 'b9.01ef']],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-40s -> %s' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, ascii(actual)[:160]))
    print(SUMMARY)
