"""Fixture: codecs.unicode_escape_decode warns about the escapes it really decoded.

CPython's unicode-escape decoder warns once, about the first invalid escape
it meets (_PyUnicode_DecodeUnicodeEscapeInternal2 and
_PyUnicode_DecodeUnicodeEscapeStateful, Objects/unicodeobject.c:6635-6921).
A handler codecs.register_error registered may replace the input it is
shown (exc.object), and the decode goes on in that, so the escape warned
about can be one the original input never held.  Grail warned about the
original input, so a decode that went on in a replaced one did not warn.

These are test_codeccallbacks' test_mutating_decode_handler_unicode_escape
cases.  Every check holds under CPython 3.14, which is what makes it
evidence.
"""

import _codecs
import codecs
import warnings

r = {}

REPLACING = {
    b'\\x0': (b'\\', 0),
    b'\\x3': (b'xxx\\', 3),
    b'\\x5': (b'x\\', 1),
}


def replacing_the_input(exc):
    replaced = REPLACING.get(exc.object[:exc.end])
    if replaced is None:
        raise exc
    exc.object = replaced[0] + exc.object[exc.end:]
    return ('Є', replaced[1])


codecs.register_error('fixture.replacing_the_input', replacing_the_input)


def decoded(data, errors='fixture.replacing_the_input'):
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter('always')
        try:
            result = codecs.unicode_escape_decode(data, errors)
        except Exception as e:
            result = '%s: %s' % (type(e).__name__, e)
    return [result, [str(each.message).split('.')[0] for each in caught]]


r['an_escape_only_the_replaced_input_holds_is_warned_about'] = [
    decoded(data) for data in (b'\\x0z', b'\\x3zr', b'\\x5z')]
r['an_escape_both_inputs_hold_is_warned_about_once'] = [
    decoded(data) for data in (b'\\x0n\\z', b'\\x3n\\zr', b'\\x5n\\z')]
r['an_octal_escape_past_0o377_is_named_by_its_value'] = decoded(b'\\x0n\\501')
r['a_buffer_decodes_as_its_bytes'] = decoded(memoryview(b'\\x3z5x')[:-1])
r['a_built_in_handler_still_warns_about_the_input'] = decoded(b'a\\qb', 'replace')

_codecs._unregister_error('fixture.replacing_the_input')

INVALID_Z = ['"\\z" is an invalid escape sequence']

EXPECTED = {
    'an_escape_only_the_replaced_input_holds_is_warned_about': [
        [('Є\\z', 4), INVALID_Z], [('Є\\zr', 5), INVALID_Z], [('Є\\z', 4), INVALID_Z]],
    'an_escape_both_inputs_hold_is_warned_about_once': [
        [('Є\n\\z', 6), INVALID_Z], [('Є\n\\zr', 7), INVALID_Z], [('Є\n\\z', 6), INVALID_Z]],
    'an_octal_escape_past_0o377_is_named_by_its_value': [
        ('Є\nŁ', 8), ['"\\501" is an invalid octal escape sequence']],
    'a_buffer_decodes_as_its_bytes': [('Є\\z5', 5), INVALID_Z],
    'a_built_in_handler_still_warns_about_the_input': [
        ('a\\qb', 4), ['"\\q" is an invalid escape sequence']],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-56s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
