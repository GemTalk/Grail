"""Fixture: a UnicodeError's fields are attributes its str reads, as CPython's are.

CPython keeps a UnicodeEncodeError's encoding, object, start, end and reason in
slots, and its str reads them as they stand: assigning ``exc.end`` changes the
message, ``del exc.object`` leaves it unset, and str() names one offending item
only when start and end bracket exactly one in range.  Grail read the
constructor's ``args`` instead, so (test_exceptions):

* an assignment after construction never showed (test_unicode_change_attributes);
* a start of -1 indexed before the object, an uncatchable crash
  (test_unicode_error_str_does_not_crash);
* a reason whose __str__ changed or deleted the object went unnoticed
  (test_unicode_error_evil_str_set_none_object, _del_self_object);
* UnicodeTranslateError printed its arguments as a tuple;
* UnicodeDecodeError kept a bytearray rather than bytes (testAttributes).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

from itertools import product

r = {}


def refusal(call):
    try:
        return call()
    except TypeError as exc:
        return str(exc)


def changes(exc, edits):
    seen = [str(exc)]
    for name, value in edits:
        setattr(exc, name, value)
        seen.append(str(exc))
    return seen


big = 0x345345345345345345
r['encode'] = changes(UnicodeEncodeError('baz', 'xxxxx', 1, 5, 'foo'),
                      [('end', 2), ('end', 5), ('reason', big), ('encoding', 4000), ('start', 1000)])
r['decode'] = changes(UnicodeDecodeError('baz', b'xxxxx', 1, 5, 'foo'),
                      [('end', 2), ('end', 5), ('reason', big), ('start', 1000)])
r['translate'] = changes(UnicodeTranslateError('xxxx', 1, 5, 'foo'),
                         [('end', 2), ('end', 5), ('start', 1000)])
r['any_bounds_is_a_str'] = all(
    isinstance(str(exc), str)
    for start, end, size in product(range(-5, 5), range(-5, 5), range(7))
    for exc in (UnicodeEncodeError('utf-8', 'a' * size, start, end, ''),
                UnicodeTranslateError('a' * size, start, end, ''),
                UnicodeDecodeError('utf-8', b'a' * size, start, end, '')))


def mutated_by_reason(side_effect):
    class Evil(str):
        def __str__(self):
            side_effect(exc)
            return self
    exc = UnicodeEncodeError('utf-8', 'abc', 0, 1, Evil('reason'))
    return refusal(lambda: str(exc))


def set_none(exc):
    exc.object = None


def delete(exc):
    del exc.object


r['object_changed_by_str'] = [mutated_by_reason(set_none), mutated_by_reason(delete)]
deleted = UnicodeEncodeError('ascii', '€', 0, 1, 'x')
del deleted.object
r['deleted_object'] = [deleted.object, str(deleted), UnicodeTranslateError('x', 0, 1, 'r').encoding]
decoded = UnicodeDecodeError('ascii', bytearray(b'\xff'), 0, 1, 'ordinal not in range')
r['decode_object_is_bytes'] = [type(decoded.object).__name__, type(decoded.args[1]).__name__, str(decoded)]
r['escapes'] = [str(UnicodeEncodeError('ascii', '€', 0, 1, 'r')),
                str(UnicodeEncodeError('ascii', '\U0001f600', 0, 1, 'r')),
                str(UnicodeTranslateError('\xe9', 0, 1, 'r'))]

EXPECTED = {
    'encode': ["'baz' codec can't encode characters in position 1-4: foo",
               "'baz' codec can't encode character '\\x78' in position 1: foo",
               "'baz' codec can't encode characters in position 1-4: foo",
               "'baz' codec can't encode characters in position 1-4: 965230951443685724997",
               "'4000' codec can't encode characters in position 1-4: 965230951443685724997",
               "'4000' codec can't encode characters in position 1000-4: 965230951443685724997"],
    'decode': ["'baz' codec can't decode bytes in position 1-4: foo",
               "'baz' codec can't decode byte 0x78 in position 1: foo",
               "'baz' codec can't decode bytes in position 1-4: foo",
               "'baz' codec can't decode bytes in position 1-4: 965230951443685724997",
               "'baz' codec can't decode bytes in position 1000-4: 965230951443685724997"],
    'translate': ["can't translate characters in position 1-4: foo",
                  "can't translate character '\\x78' in position 1: foo",
                  "can't translate characters in position 1-4: foo",
                  "can't translate characters in position 1000-4: foo"],
    'any_bounds_is_a_str': True,
    'object_changed_by_str': ["UnicodeError 'object' attribute must be a string",
                              "UnicodeError 'object' attribute is not set"],
    'deleted_object': [None, '', None],
    'decode_object_is_bytes': ['bytes', 'bytearray',
                               "'ascii' codec can't decode byte 0xff in position 0: ordinal not in range"],
    'escapes': ["'ascii' codec can't encode character '\\u20ac' in position 0: r",
                "'ascii' codec can't encode character '\\U0001f600' in position 0: r",
                "can't translate character '\\xe9' in position 0: r"],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-22s %-5s -> %r' % (key, 'OK' if actual == EXPECTED[key] else 'FAIL', actual))
    print(SUMMARY)
