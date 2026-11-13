"""Fixture: memoryview.hex takes bytes.hex's separator and group size.

CPython's memoryview.hex(sep, bytes_per_sep) formats the view's bytes as
bytes.hex does, keywords included (Objects/memoryobject.c:2338).  Grail's took
no argument at all, so its own docstring's examples -- ``value.hex(':', 2)'' --
raised TypeError.  Every check holds under CPython 3.14, which is what makes it
evidence.
"""

r = {}
view = memoryview(bytes([0xB9, 0x01, 0xEF]))


def outcome(call):
    try:
        return call()
    except (TypeError, ValueError) as error:
        return '%s: %s' % (type(error).__name__, error)


r['the_docstrings_examples'] = [view.hex(), outcome(lambda: view.hex(':')), outcome(lambda: view.hex(':', 2)),
                                outcome(lambda: view.hex(':', -2))]
r['keywords'] = [outcome(lambda: view.hex(sep='-')), outcome(lambda: view.hex(sep=':', bytes_per_sep=2)),
                 outcome(lambda: view.hex(bytes_per_sep=2))]
r['a_bytes_separator'] = outcome(lambda: view.hex(b'|', 1))
r['as_bytes_and_bytearray_answer'] = [outcome(lambda: view.hex(':', 2)) == bytes(view).hex(':', 2),
                                      outcome(lambda: view.hex(' ', -1)) == bytearray(view).hex(' ', -1)]
r['a_slice_of_a_view'] = outcome(lambda: memoryview(b'abcdef')[1:5].hex('.', 2))
r['a_long_separator_is_refused'] = [outcome(lambda: view.hex('::')), outcome(lambda: view.hex(b''))]

EXPECTED = {
    'the_docstrings_examples': ['b901ef', 'b9:01:ef', 'b9:01ef', 'b901:ef'],
    'keywords': ['b9-01-ef', 'b9:01ef', 'b901ef'],
    'a_bytes_separator': 'b9|01|ef',
    'as_bytes_and_bytearray_answer': [True, True],
    'a_slice_of_a_view': '6263.6465',
    'a_long_separator_is_refused': ['ValueError: sep must be length 1.', 'ValueError: sep must be length 1.'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-34s -> %s' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, ascii(actual)))
    print(SUMMARY)
