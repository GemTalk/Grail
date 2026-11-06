"""Fixture: the built-in error handlers are CPython's.

codecs.ignore_errors, replace_errors and the rest are the handlers a codec
calls by name (Python/codecs.c).  Each takes only the Unicode errors it
handles, refusing anything else with "don't know how to handle <type> in
error callback", and reads the error's object, start and end as
_PyUnicodeError_GetParams does (Objects/exceptions.c:3310-3359).

Grail's handlers took any exception: given a bare UnicodeError they answered
('', None) or failed inside, namereplace never named a character, and
surrogateescape escaped a whole run where CPython escapes four bytes at a
time.

Every check holds under CPython 3.14, which is what makes it evidence.
"""

import codecs

r = {}


def outcome(call):
    try:
        return call()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


class Odd(Exception):
    pass


class ObjectIsAList(UnicodeEncodeError):
    def __init__(self):
        UnicodeEncodeError.__init__(self, 'ascii', '', 0, 1, 'bad')
        self.object = []


class ObjectIsAStr(UnicodeDecodeError):
    def __init__(self):
        UnicodeDecodeError.__init__(self, 'ascii', b'', 0, 1, 'bad')
        self.object = 'x'


class ClaimsToBeAnEncodeError(str):
    __class__ = UnicodeEncodeError


class ClaimsToBeADecodeError(Exception):
    __class__ = UnicodeDecodeError


HANDLERS = ['ignore', 'replace', 'xmlcharrefreplace', 'backslashreplace',
            'namereplace', 'surrogateescape', 'surrogatepass']
MODULE_PREFIX = '' if __name__ == '__main__' else __name__ + '.'
ODD_NAME = MODULE_PREFIX + 'Odd'


NOT_AN_ERROR = "TypeError: don't know how to handle %s in error callback"


def handled(name, exc):
    return outcome(lambda: codecs.lookup_error(name)(exc))


def encoding(text, start, end, codec='ascii'):
    return UnicodeEncodeError(codec, text, start, end, 'ouch')


def decoding(data, start, end, codec='ascii'):
    return UnicodeDecodeError(codec, data, start, end, 'ouch')


def translating(text, start, end):
    return UnicodeTranslateError(text, start, end, 'ouch')


r['strict_raises_only_an_exception'] = [
    handled('strict', 42), handled('strict', encoding('a', 0, 1))]
r['a_handler_refuses_what_is_not_a_unicode_error'] = [handled(name, 42) for name in HANDLERS]
r['a_handler_refuses_a_bare_unicode_error'] = [handled(name, UnicodeError('ouch')) for name in HANDLERS]
r['a_refused_type_is_named_with_its_module'] = handled('ignore', Odd()) == (
    "TypeError: don't know how to handle %s in error callback" % ODD_NAME)
r['a_class_claiming_to_be_an_error_is_not_one'] = [
    handled(name, kind()) == NOT_AN_ERROR % (MODULE_PREFIX + kind.__qualname__)
    for kind in (ClaimsToBeAnEncodeError, ClaimsToBeADecodeError) for name in HANDLERS]
r['the_encode_only_handlers_refuse_a_decode_or_translate_error'] = [
    handled(name, exc) for name in ('xmlcharrefreplace', 'namereplace')
    for exc in (decoding(b'\xff', 0, 1), translating('あ', 0, 1))]
r['the_surrogate_handlers_refuse_a_translate_error'] = [
    handled(name, translating('\udc80', 0, 1)) for name in ('surrogateescape', 'surrogatepass')]
r['the_object_must_be_a_str_or_bytes'] = [
    handled('ignore', ObjectIsAList()), handled('replace', ObjectIsAStr())]
r['ignore_takes_every_direction'] = [
    handled('ignore', encoding('aあb', 1, 2)),
    handled('ignore', decoding(bytearray(b'a\xffb'), 1, 2)),
    handled('ignore', translating('aあb', 1, 2))]
r['replace_writes_one_mark_a_character_or_one_for_the_bytes'] = [
    handled('replace', encoding('aあぃb', 1, 3)),
    handled('replace', decoding(b'a\xff\xfeb', 1, 3)),
    handled('replace', translating('aあぃb', 1, 3))]
r['backslashreplace_escapes_characters_or_bytes'] = [
    handled('backslashreplace', encoding('aあ\U00010000b', 1, 3)),
    handled('backslashreplace', translating('a\nb', 1, 2)),
    handled('backslashreplace', decoding(b'a\n\xffb', 1, 3))]
r['namereplace_names_a_character_that_has_a_name'] = [
    handled('namereplace', encoding('a' + s + 'b', 1, 1 + len(s)))
    for s in ('あ', '\x00', '\U000e007f', '\U0010ffff', '\udc80')]
r['surrogateescape_decodes_four_bytes_at_a_time'] = [
    handled('surrogateescape', decoding(b'\x80\x81\x82\x83\x84\x85', 0, 6)),
    handled('surrogateescape', decoding(b'a\x80b', 1, 2)),
    handled('surrogateescape', decoding(b'a', 0, 1))]
r['surrogateescape_encodes_only_an_escaped_byte'] = [
    handled('surrogateescape', encoding('a\udc80\udcffb', 1, 3)),
    handled('surrogateescape', encoding('\udc7f', 0, 1))]
r['surrogatepass_writes_the_utf_the_error_names'] = [
    handled('surrogatepass', encoding('\ud800', 0, 1, codec)) for codec in (
        'utf-8', 'UTF_16_BE', 'utf16le', 'utf-32-be', 'utf_32')]
r['surrogatepass_reads_one_surrogate_of_that_utf'] = [
    handled('surrogatepass', decoding(data, 0, len(data), codec)) for codec, data in (
        ('utf-8', b'\xed\xa0\x80\xed\xa0\x80'), ('utf-16-be', b'\xd8\x00'),
        ('utf-32le', b'\x00\xd8\x00\x00'))]
r['surrogatepass_raises_the_error_for_any_other_codec'] = [
    handled('surrogatepass', encoding('\ud800', 0, 1, codec)) for codec in (
        'ascii', 'utf-16-xx', 'utf-7')]

EXPECTED = {
    'strict_raises_only_an_exception': [
        'TypeError: codec must pass exception instance',
        "UnicodeEncodeError: 'ascii' codec can't encode character '\\x61' in position 0: ouch"],
    'a_handler_refuses_what_is_not_a_unicode_error': [NOT_AN_ERROR % 'int'] * 7,
    'a_handler_refuses_a_bare_unicode_error': [NOT_AN_ERROR % 'UnicodeError'] * 7,
    'a_refused_type_is_named_with_its_module': True,
    'a_class_claiming_to_be_an_error_is_not_one': [True] * 14,
    'the_encode_only_handlers_refuse_a_decode_or_translate_error': [
        NOT_AN_ERROR % 'UnicodeDecodeError', NOT_AN_ERROR % 'UnicodeTranslateError'] * 2,
    'the_surrogate_handlers_refuse_a_translate_error': [NOT_AN_ERROR % 'UnicodeTranslateError'] * 2,
    'the_object_must_be_a_str_or_bytes': [
        "TypeError: UnicodeError 'object' attribute must be a string",
        "TypeError: UnicodeError 'object' attribute must be a bytes"],
    'ignore_takes_every_direction': [('', 2), ('', 2), ('', 2)],
    'replace_writes_one_mark_a_character_or_one_for_the_bytes': [
        ('??', 3), ('�', 3), ('��', 3)],
    'backslashreplace_escapes_characters_or_bytes': [
        ('\\u3042\\U00010000', 3), ('\\x0a', 2), ('\\x0a\\xff', 3)],
    'namereplace_names_a_character_that_has_a_name': [
        ('\\N{HIRAGANA LETTER A}', 2), ('\\x00', 2), ('\\N{CANCEL TAG}', 2),
        ('\\U0010ffff', 2), ('\\udc80', 2)],
    'surrogateescape_decodes_four_bytes_at_a_time': [
        ('\udc80\udc81\udc82\udc83', 4), ('\udc80', 2),
        "UnicodeDecodeError: 'ascii' codec can't decode byte 0x61 in position 0: ouch"],
    'surrogateescape_encodes_only_an_escaped_byte': [
        (b'\x80\xff', 3),
        "UnicodeEncodeError: 'ascii' codec can't encode character '\\udc7f' in position 0: ouch"],
    'surrogatepass_writes_the_utf_the_error_names': [
        (b'\xed\xa0\x80', 1), (b'\xd8\x00', 1), (b'\x00\xd8', 1),
        (b'\x00\x00\xd8\x00', 1), (b'\x00\xd8\x00\x00', 1)],
    'surrogatepass_reads_one_surrogate_of_that_utf': [
        ('\ud800', 3), ('\ud800', 2), ('\ud800', 4)],
    'surrogatepass_raises_the_error_for_any_other_codec': [
        "UnicodeEncodeError: '%s' codec can't encode character '\\ud800' in position 0: ouch" % codec
        for codec in ('ascii', 'utf-16-xx', 'utf-7')],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-60s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
