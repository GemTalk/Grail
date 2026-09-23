# Codec behaviours test_codecs exposed, one check each, all true under CPython.
#
# What each pins, and what it used to do in Grail:
#
#   charmap        the dict-built codecs (cp437, cp850, ...) could not encode
#                  'a' -- charmap_build keyed its map by character where
#                  make_encoding_map keys by code point -- and a replacement
#                  was appended as ASCII, where CPython pushes it back through
#                  the map (EBCDIC's '?' is 0x6F).  charmap_decode refused
#                  int->int and int->str maps.
#   decoder input  every decoder took ``bytes(input)'', so ``decoder(42)''
#                  answered 42 NULs instead of TypeError.
#   UTF-8          the incremental decoder withheld invalid prefixes as if
#                  more input could rescue them; 'ignore' died uncatchably on
#                  an encoded surrogate; surrogatepass accepted a bad
#                  continuation byte; strict accepted an encoded surrogate
#                  after a supplementary character.
#   UTF-16/32      the BOM-sniffing _ex decoders answered byte order -1 with
#                  no BOM, so the vendored stream reader never refused a
#                  BOM-less stream; a truncated final byte ignored the policy.
#   UTF-7          a strict-only decoder: 'replace' raised, and errors named
#                  no position.
#   escapes        warned once per bad escape, without CPython's wording.
#   the registry   lookup kept non-ASCII letters in a name; codecs.decode
#                  tried ``.decode'' on a memoryview; str.encode accepted a
#                  codec answering str.
#   keywords       str.encode took no keywords; str() dropped ``errors''.
#   paths          a str holding a lone surrogate killed the session in any
#                  file call (an uncatchable ArgumentTypeError).
#
# Non-ASCII text is built with chr() or from UTF-8 bytes: the tool that
# wrote this file rewrites a backslash-u escape into the character itself.

import codecs
import importlib.util
import warnings

BS = chr(92)
EURO = chr(0x20AC)
REPL = chr(0xFFFD)


def charmap_dict_codecs_encode():
    return ('abc' + chr(0xE9)).encode('cp437') == b'abc\x82' \
        and b'abc\x82'.decode('cp437') == 'abc' + chr(0xE9)


def charmap_replacement_goes_through_the_map():
    return ('a' + EURO).encode('cp037', 'replace') == b'\x81o' \
        and '?'.encode('cp037') == b'o'


def charmap_decode_accepts_int_maps():
    return (codecs.charmap_decode(b'\x00\x01\x02', 'strict', {0: 97, 1: 98, 2: 0x10FFFF})
            == ('ab' + chr(0x10FFFF), 3)
            and codecs.charmap_decode(b'\x00\x01\x02', 'strict', {0: 'ab', 1: '', 2: 'c'})
            == ('abc', 3))


def charmap_build_is_keyed_by_code_point():
    table = codecs.charmap_build('abc')
    return codecs.charmap_encode('cab', 'strict', table) == (b'\x02\x00\x01', 3)


def single_byte_family_round_trips():
    names = ('cp037', 'cp1250', 'cp1251', 'cp437', 'cp850', 'cp866', 'cp1140',
             'iso8859_2', 'iso8859_5', 'iso8859_7', 'koi8_r', 'mac_roman', 'tis_620',
             'charmap')
    return all('abc123'.encode(n).decode(n) == 'abc123' for n in names)


def decoders_refuse_an_int():
    for name in ('ascii', 'latin_1', 'utf_8', 'utf_16', 'cp1252', 'cp437', 'charmap'):
        try:
            codecs.getdecoder(name)(42)
            return False
        except TypeError:
            pass
    return True


def unicode_escape_decode_accepts_str():
    return codecs.unicode_escape_decode(BS + 'x41') == ('A', 4)


def utf8_incremental_refuses_invalid_prefixes():
    for data in (b'\xc0', b'\xe0\x80', b'\xed\xa0\x80', b'\xf0\x8f', b'\xf4\x90'):
        try:
            codecs.getincrementaldecoder('utf-8')().decode(data)
            return False
        except UnicodeDecodeError:
            pass
    return codecs.getincrementaldecoder('utf-8')().decode(b'a\xe2\x82') == 'a'


def utf8_incremental_surrogatepass_holds_a_surrogate():
    dec = codecs.getincrementaldecoder('utf-8')('surrogatepass')
    parts = [dec.decode(bytes([b])) for b in b'\xed\xa0\x80']
    return parts[:2] == ['', ''] and parts[2].encode('utf-8', 'surrogatepass') == b'\xed\xa0\x80'


def utf8_encoded_surrogate_errors():
    data = b'\xf0\x90\xbf\xbf\xed\xb2\x80A'
    try:
        data.decode('utf-8')
        return False
    except UnicodeDecodeError as e:
        if (e.start, e.end, e.reason) != (4, 5, 'invalid continuation byte'):
            return False
    return (data.decode('utf-8', 'ignore') == chr(0x10FFF) + 'A'
            and data.decode('utf-8', 'replace') == chr(0x10FFF) + REPL * 3 + 'A')


def utf8_surrogatepass_rejects_a_bad_continuation():
    try:
        b'abc\xed\xa0z'.decode('utf-8', 'surrogatepass')
        return False
    except UnicodeDecodeError:
        return True


def utf16_ex_decode_reports_no_bom_as_zero():
    return (codecs.utf_16_ex_decode(b'a\x00', 'strict', 0, False) == ('a', 2, 0)
            and codecs.utf_32_ex_decode(b'a\x00\x00\x00', 'strict', 0, False) == ('a', 4, 0))


def utf16_stream_without_bom_is_refused():
    try:
        codecs.getincrementaldecoder('utf-16')().decode(b'a\x00')
        return False
    except UnicodeDecodeError as e:
        return e.reason == 'Stream does not start with BOM'


def utf16_truncated_final_byte_takes_the_policy():
    return (codecs.utf_16_decode(b'\x01', 'replace', True) == (REPL, 1)
            and codecs.utf_32_decode(b'\x01', 'ignore', True) == ('', 1))


def utf7_replace_follows_the_state_machine():
    cases = [(b'a+IKx-b', 'a' + EURO + REPL + 'b'),
             (b'a+IKwgr,-b', 'a' + EURO + REPL + '-b'),
             (b'a+/,+IKw-b', 'a' + REPL + EURO + 'b'),
             (b'a+@b', 'a' + REPL + 'b')]
    return all(raw.decode('utf-7', 'replace') == want for raw, want in cases)


def utf7_strict_error_has_a_position():
    try:
        codecs.utf_7_decode(b'a+IK', 'strict', True)
        return False
    except UnicodeDecodeError as e:
        return (e.start, e.end, e.reason) == (1, 4, 'unterminated shift sequence')


def escape_decoders_warn_once_in_cpython_words():
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter('always')
        codecs.unicode_escape_decode((BS + 'z' + BS + 'q').encode())
        codecs.escape_decode((BS + 'z').encode())
    messages = [str(w.message) for w in caught]
    return messages == [
        '"' + BS + 'z" is an invalid escape sequence. Such sequences will not work in the future. ',
        'b"' + BS + 'z" is an invalid escape sequence. Such sequences will not work in the future. ']


def lookup_treats_non_ascii_as_punctuation():
    found = (1, 2, 3, 4)
    def search(name):
        return found if name == 'grail_cc_8' else None
    codecs.register(search)
    try:
        return (codecs.lookup('Grail-CC' + chr(0xE9) + EURO + '-8') == found
                and codecs.lookup('grail cc 8') == found)
    finally:
        codecs.unregister(search)


def codecs_decode_accepts_a_memoryview():
    return codecs.decode(memoryview(b'eHl6\n'), 'base64') == b'xyz'


def text_model_rejects_a_str_from_an_encoder():
    def search(name):
        if name == 'grail_cc_str_out':
            return codecs.CodecInfo(lambda s, e='strict': ('not bytes', 0),
                                    lambda b, e='strict': (b'not str', 0), name=name)
        return None
    codecs.register(search)
    try:
        try:
            'x'.encode('grail_cc_str_out')
            return False
        except TypeError as e:
            ok = str(e).startswith("'grail_cc_str_out' encoder returned 'str' instead of 'bytes'")
        return ok and codecs.encode('x', 'grail_cc_str_out') == 'not bytes'
    finally:
        codecs.unregister(search)


def str_encode_takes_keywords():
    return (('a' + chr(0xE9)).encode('ascii', errors='backslashreplace') == b'a' + (BS + 'xe9').encode()
            and ('a' + chr(0xE9)).encode(encoding='utf-8') == b'a\xc3\xa9')


def str_constructor_honours_errors():
    lone = str(b'a\xed\xa0\x80b', 'utf-8', 'surrogatepass')
    return (str(b'a\xffb', errors='replace') == 'a' + REPL + 'b'
            and str(object=5) == '5'
            and lone.encode('utf-8', 'surrogatepass') == b'a\xed\xa0\x80b')


def surrogate_str_slices_and_cases():
    s = b'A\x00\x00\xd8b\x00'.decode('utf-16-le', 'surrogatepass')
    return (s[0:1] == 'A' and s[2:] == 'b' and s[::2] == 'Ab'
            and s.lower().encode('utf-16-le', 'surrogatepass') == b'a\x00\x00\xd8b\x00'
            and s.upper().encode('utf-16-le', 'surrogatepass') == b'A\x00\x00\xd8B\x00')


def surrogate_paths_reach_the_filesystem():
    # os.fsdecode spells an undecodable byte as a lone surrogate (PEP 383);
    # the file calls must take such a name, and refuse one that is not an
    # escaped byte with CPython's UnicodeEncodeError -- not die uncatchably.
    import os
    escaped = b'grail_no_such_file_\x80'.decode('utf-8', 'surrogateescape')
    other = b'\x00\xd8'.decode('utf-16-le', 'surrogatepass')
    try:
        os.stat(escaped)
        return False
    except FileNotFoundError:
        pass
    try:
        os.stat(other)
        return False
    except UnicodeEncodeError:
        pass
    return os.path.exists(escaped) is False


def find_spec_finds_what_exists():
    return (importlib.util.find_spec('json') is not None
            and importlib.util.find_spec('encodings.cp437') is not None
            and importlib.util.find_spec('grail_no_such_module_xyz') is None)


CHECKS = [
    charmap_dict_codecs_encode,
    charmap_replacement_goes_through_the_map,
    charmap_decode_accepts_int_maps,
    charmap_build_is_keyed_by_code_point,
    single_byte_family_round_trips,
    decoders_refuse_an_int,
    unicode_escape_decode_accepts_str,
    utf8_incremental_refuses_invalid_prefixes,
    utf8_incremental_surrogatepass_holds_a_surrogate,
    utf8_encoded_surrogate_errors,
    utf8_surrogatepass_rejects_a_bad_continuation,
    utf16_ex_decode_reports_no_bom_as_zero,
    utf16_stream_without_bom_is_refused,
    utf16_truncated_final_byte_takes_the_policy,
    utf7_replace_follows_the_state_machine,
    utf7_strict_error_has_a_position,
    escape_decoders_warn_once_in_cpython_words,
    lookup_treats_non_ascii_as_punctuation,
    codecs_decode_accepts_a_memoryview,
    text_model_rejects_a_str_from_an_encoder,
    str_encode_takes_keywords,
    str_constructor_honours_errors,
    surrogate_str_slices_and_cases,
    surrogate_paths_reach_the_filesystem,
    find_spec_finds_what_exists,
]

if __name__ == '__main__':
    for fn in CHECKS:
        try:
            ok = fn() is True
        except Exception as e:
            ok = False
            print('     %s raised %s: %s' % (fn.__name__, type(e).__name__, e))
        print('%-4s %s' % ('OK' if ok else 'FAIL', fn.__name__))
