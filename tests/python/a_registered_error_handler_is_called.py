"""Fixture: str.encode and bytes.decode call a handler codecs.register_error registered.

CPython calls such a handler for every error a codec meets, with a
UnicodeEncodeError or UnicodeDecodeError naming the codec, the whole input,
the span and the reason.  The codec then resumes where the handler says:
unicode_encode_call_errorhandler and unicode_decode_call_errorhandler_writer
(Objects/unicodeobject.c).  Grail's str.encode and bytes.decode honoured only
the eight built-in handlers, and treated any other name as 'strict'.

Every check holds under CPython 3.14, which is what makes it evidence.
"""

import _codecs
import codecs

r = {}
seen = []


def outcome(call):
    try:
        return call()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def recording(exc):
    seen.append((exc.encoding, exc.start, exc.end, exc.reason))
    return ('<%d:%d>' % (exc.start, exc.end), exc.end)


def recorded(call):
    del seen[:]
    return [outcome(call), list(seen)]


def handler_answering(answer):
    name = 'fixture.answers.%d' % len(ANSWERING)
    ANSWERING.append(name)
    codecs.register_error(name, lambda exc: answer)
    return name


ANSWERING = []
codecs.register_error('fixture.recording', recording)

resumed = []


def resuming_once_at_the_start(exc):
    resumed.append(exc.start)
    if len(resumed) == 1:
        return ('[', 0)
    return (']', exc.end)


codecs.register_error('fixture.resuming', resuming_once_at_the_start)


def mutating(exc):
    exc.object = b'\xffxyz'
    return ('?', 1)


def mutating_to_a_str(exc):
    exc.object = 'xyz'
    return ('?', 1)


codecs.register_error('fixture.mutating', mutating)
codecs.register_error('fixture.mutating_to_a_str', mutating_to_a_str)

TEXT = 'a\xff€\udc80\udc81b'

r['ascii_and_latin_1_call_it_once_for_a_run'] = [
    recorded(lambda: TEXT.encode('ascii', 'fixture.recording')),
    recorded(lambda: TEXT.encode('latin-1', 'fixture.recording'))]
r['utf_8_calls_it_once_for_a_run_of_surrogates'] = recorded(
    lambda: TEXT.encode('utf-8', 'fixture.recording'))
r['utf_16_and_utf_32_call_it_for_each_surrogate'] = [
    recorded(lambda: 'a\udc80\udc81'.encode('utf-16', 'fixture.recording')),
    recorded(lambda: 'a\udc80'.encode('utf-32-be', 'fixture.recording'))]
r['iso_8859_15_calls_it_as_its_charmap_does'] = recorded(
    lambda: 'a\xa4あ€b'.encode('iso-8859-15', 'fixture.recording'))
r['decoding_calls_it_for_each_error'] = [
    recorded(lambda: b'a\xff\xfeb'.decode('ascii', 'fixture.recording')),
    recorded(lambda: b'a\xff\xe2\x82b\xed\xa0\x80d\xe2'.decode('utf-8', 'fixture.recording'))]
r['utf_16_decoding_names_the_byte_order_and_counts_the_bom'] = recorded(
    lambda: b'\xfe\xff\x00a\xd8\x00\x00b'.decode('utf-16', 'fixture.recording'))
r['utf_32_reports_the_first_error_first'] = recorded(
    lambda: b'a\x00\x00\x00\x00\x00\x11\x00b'.decode('utf-32-le', 'fixture.recording'))
r['the_escape_codecs_call_it_too'] = recorded(
    lambda: b'a\\xZ\\u12b'.decode('unicode-escape', 'fixture.recording'))
r['a_codec_written_in_python_calls_it_for_a_surrogate_too'] = [
    recorded(lambda: 'a\udc80b'.encode('cp1252', 'fixture.recording')),
    recorded(lambda: '\udc80\udc81'.encode('gb2312', 'fixture.recording'))]
r['every_way_in_reaches_it'] = [
    outcome(lambda: bytearray(b'a\xffb').decode('ascii', 'fixture.recording')),
    outcome(lambda: str(b'a\xffb', 'ascii', 'fixture.recording')),
    outcome(lambda: codecs.decode(b'a\xffb', 'ascii', 'fixture.recording')),
    outcome(lambda: codecs.encode('a\xffb', 'ascii', 'fixture.recording'))]
r['the_replacement_may_be_bytes_when_encoding'] = outcome(
    lambda: 'a\xffb'.encode('ascii', handler_answering((b'\xfe\xfd', 2))))
r['a_str_replacement_the_codec_cannot_encode_is_the_error'] = [
    outcome(lambda: 'a\xffb'.encode('ascii', handler_answering(('€', 2)))),
    outcome(lambda: 'a\udc80b'.encode('utf-8', handler_answering(('\xe9', 2))))]
r['a_utf_16_replacement_is_whole_code_units'] = outcome(
    lambda: 'a\udc80b'.encode('utf-16-le', handler_answering((b'\xff', 2))))
r['the_position_is_where_it_resumes'] = [
    outcome(lambda: 'ab\xffc'.encode('ascii', 'fixture.resuming')),
    outcome(lambda: 'a\xffbc'.encode('ascii', handler_answering(('', -1))))]
r['a_position_outside_the_input_is_refused'] = [
    outcome(lambda: 'a\xffb'.encode('ascii', handler_answering(('x', 100)))),
    outcome(lambda: b'a\xffb'.decode('ascii', handler_answering(('x', -100)))),
    outcome(lambda: 'a\xffb'.encode('ascii', handler_answering(('x', 2 ** 70))))]
r['an_encode_handler_must_answer_str_or_bytes_and_a_position'] = [
    outcome(lambda: 'a\xffb'.encode('ascii', handler_answering(42))),
    outcome(lambda: 'a\xffb'.encode('ascii', handler_answering(('x',)))),
    outcome(lambda: 'a\xffb'.encode('ascii', handler_answering(['x', 2]))),
    outcome(lambda: 'a\xffb'.encode('ascii', handler_answering((1, 2)))),
    outcome(lambda: 'a\xffb'.encode('ascii', handler_answering(('x', 'y'))))]
r['a_decode_handler_must_answer_a_str_and_a_position'] = [
    outcome(lambda: b'a\xffb'.decode('utf-8', handler_answering((b'x', 2)))),
    outcome(lambda: b'a\xffb'.decode('utf-8', handler_answering(('x', 'y'))))]
r['a_decode_goes_on_in_what_the_handler_left_in_the_object'] = [
    outcome(lambda: b'\xff12345'.decode('ascii', 'fixture.mutating')),
    outcome(lambda: b'\xff12345'.decode('utf-8', 'fixture.mutating_to_a_str')),
    outcome(lambda: b'++'.decode('utf-7', 'fixture.mutating'))]
r['an_unknown_name_is_looked_up_at_the_first_error'] = [
    outcome(lambda: 'abc'.encode('ascii', 'fixture.unknown')),
    outcome(lambda: b'abc'.decode('utf-8', 'fixture.unknown')),
    outcome(lambda: 'a\xffb'.encode('ascii', 'fixture.unknown')),
    outcome(lambda: b'a\xffb'.decode('utf-8', 'fixture.unknown'))]

for name in ['fixture.recording', 'fixture.resuming', 'fixture.mutating',
             'fixture.mutating_to_a_str'] + ANSWERING:
    _codecs._unregister_error(name)

ASCII_REASON = 'ordinal not in range(128)'
SURROGATES = 'surrogates not allowed'
ANSWER = 'TypeError: encoding error handler must return (str/bytes, int) tuple'
DECODE_ANSWER = 'TypeError: decoding error handler must return (str, int) tuple'

EXPECTED = {
    'ascii_and_latin_1_call_it_once_for_a_run': [
        [b'a<1:5>b', [('ascii', 1, 5, ASCII_REASON)]],
        [b'a\xff<2:5>b', [('latin-1', 2, 5, 'ordinal not in range(256)')]]],
    'utf_8_calls_it_once_for_a_run_of_surrogates': [
        b'a\xc3\xbf\xe2\x82\xac<3:5>b', [('utf-8', 3, 5, SURROGATES)]],
    'utf_16_and_utf_32_call_it_for_each_surrogate': [
        ['a<1:2><2:3>'.encode('utf-16'), [('utf-16', 1, 2, SURROGATES), ('utf-16', 2, 3, SURROGATES)]],
        ['a<1:2>'.encode('utf-32-be'), [('utf-32-be', 1, 2, SURROGATES)]]],
    'iso_8859_15_calls_it_as_its_charmap_does': [
        b'a<1:3>\xa4b', [('charmap', 1, 3, 'character maps to <undefined>')]],
    'decoding_calls_it_for_each_error': [
        ['a<1:2><2:3>b', [('ascii', 1, 2, ASCII_REASON), ('ascii', 2, 3, ASCII_REASON)]],
        ['a<1:2><2:4>b<5:6><6:7><7:8>d<9:10>', [
            ('utf-8', 1, 2, 'invalid start byte'), ('utf-8', 2, 4, 'invalid continuation byte'),
            ('utf-8', 5, 6, 'invalid continuation byte'), ('utf-8', 6, 7, 'invalid start byte'),
            ('utf-8', 7, 8, 'invalid start byte'), ('utf-8', 9, 10, 'unexpected end of data')]]],
    'utf_16_decoding_names_the_byte_order_and_counts_the_bom': [
        'a<4:6>b', [('utf-16-be', 4, 6, 'illegal UTF-16 surrogate')]],
    'utf_32_reports_the_first_error_first': [
        'a<4:8><8:9>', [('utf-32-le', 4, 8, 'code point not in range(0x110000)'),
                        ('utf-32-le', 8, 9, 'truncated data')]],
    'the_escape_codecs_call_it_too': [
        'a<1:3>Z<4:9>', [('unicodeescape', 1, 3, 'truncated \\xXX escape'),
                         ('unicodeescape', 4, 9, 'truncated \\uXXXX escape')]],
    'a_codec_written_in_python_calls_it_for_a_surrogate_too': [
        [b'a<1:2>b', [('charmap', 1, 2, 'character maps to <undefined>')]],
        [b'<0:1><1:2>', [('gb2312', 0, 1, 'illegal multibyte sequence'),
                         ('gb2312', 1, 2, 'illegal multibyte sequence')]]],
    'every_way_in_reaches_it': ['a<1:2>b', 'a<1:2>b', 'a<1:2>b', b'a<1:2>b'],
    'the_replacement_may_be_bytes_when_encoding': b'a\xfe\xfdb',
    'a_str_replacement_the_codec_cannot_encode_is_the_error': [
        "UnicodeEncodeError: 'ascii' codec can't encode character '\\xff' in position 1: " + ASCII_REASON,
        "UnicodeEncodeError: 'utf-8' codec can't encode character '\\udc80' in position 1: " + SURROGATES],
    'a_utf_16_replacement_is_whole_code_units':
        "UnicodeEncodeError: 'utf-16-le' codec can't encode character '\\udc80' in position 1: " + SURROGATES,
    'the_position_is_where_it_resumes': [b'ab[ab]c', b'ac'],
    'a_position_outside_the_input_is_refused': [
        'IndexError: position 100 from error handler out of bounds',
        'IndexError: position -97 from error handler out of bounds',
        'OverflowError: Python int too large to convert to C ssize_t'],
    'an_encode_handler_must_answer_str_or_bytes_and_a_position': [
        ANSWER, ANSWER, ANSWER, ANSWER,
        "TypeError: 'str' object cannot be interpreted as an integer"],
    'a_decode_handler_must_answer_a_str_and_a_position': [
        DECODE_ANSWER, "TypeError: 'str' object cannot be interpreted as an integer"],
    'a_decode_goes_on_in_what_the_handler_left_in_the_object': [
        '?xyz', "TypeError: UnicodeError 'object' attribute must be a bytes", '?xyz'],
    'an_unknown_name_is_looked_up_at_the_first_error': [
        b'abc', 'abc',
        "LookupError: unknown error handler name 'fixture.unknown'",
        "LookupError: unknown error handler name 'fixture.unknown'"],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-58s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
