# The CJK codecs, IDNA, and Unicode 3.2.0 -- all absent from Grail before, and
# all true under CPython as written here.
#
#   CJK      big5, shift_jis, the EUC family, GB18030, ISO-2022, HZ and the
#            rest were LookupError.  They are now _cjk's pure-Python engines
#            over tables generated from CPython and verified against it
#            (scripts/generate_cjk.py); these checks are a sample, one
#            behaviour each, of what that verification covers exhaustively.
#   IDNA     str.encode / bytes.decode answered 'idna' themselves as ASCII,
#            so no 'xn--' label decoded and no non-ASCII host encoded.  It is
#            now CPython's encodings/idna.py over stringprep.
#   UCD 3.2  stringprep and IDNA read unicodedata.ucd_3_2_0, and Grail's
#            unicodedata was a stub whose normalize() returned its argument.
#
# Every expected byte string is CPython 3.14's own output.  Non-ASCII text is
# built with chr(): the tool that wrote this file rewrites a backslash-u
# escape into the character itself.

import codecs
import stringprep
import unicodedata

REPL = chr(0xFFFD)


def text(*points):
    return ''.join(chr(p) for p in points)


SAMPLES = {
    'big5': (text(0x4E2D, 0x6587) + 'abc', b'\xa4\xa4\xa4\xe5abc'),
    'cp950': (text(0x4E2D, 0x6587), b'\xa4\xa4\xa4\xe5'),
    'big5hkscs': (text(0xCA, 0x304, 0x4E2D), b'\x88b\xa4\xa4'),
    'cp932': (text(0x65E5, 0x672C, 0xFF71), b'\x93\xfa\x96{\xb1'),
    'shift_jis': (text(0x65E5, 0x672C, 0x8A9E), b'\x93\xfa\x96{\x8c\xea'),
    'euc_jp': (text(0x65E5, 0x672C, 0x8A9E, 0x4E02), b'\xc6\xfc\xcb\xdc\xb8\xec\x8f\xb0\xa1'),
    'euc_jis_2004': (text(0x304B, 0x309A, 0x65E5), b'\xa4\xf7\xc6\xfc'),
    'shift_jis_2004': (text(0x304B, 0x309A), b'\x82\xf5'),
    'euc_kr': (text(0xD55C, 0xAD6D, 0xAC02), b'\xc7\xd1\xb1\xb9\xa4\xd4\xa4\xa1\xa4\xbf\xa4\xa2'),
    'cp949': (text(0xD55C, 0xAC02), b'\xc7\xd1\x81A'),
    'johab': (text(0xD55C), b'\xd0e'),
    'gb2312': (text(0x4E2D, 0x6587), b'\xd6\xd0\xce\xc4'),
    'gbk': (text(0x4E2D, 0x4E02), b'\xd6\xd0\x81@'),
    'gb18030': (text(0x4E2D, 0x1F600, 0x20AC), b'\xd6\xd0\x949\xfc6\xa2\xe3'),
    'hz': ('a' + text(0x4E2D) + '~b', b'a~{VP~}~~b'),
    'iso2022_jp': ('a' + text(0x65E5, 0x672C, 0xA5), b'a\x1b$BF|K\\\x1b(J\\\x1b(B'),
    'iso2022_jp_1': (text(0x4E02), b'\x1b$(D0!\x1b(B'),
    'iso2022_jp_2': (text(0xAC00, 0xE9), b'\x1b$(C0!\x1b$(D+1\x1b(B'),
    'iso2022_jp_2004': (text(0x304B, 0x309A), b'\x1b$(Q$w\x1b(B'),
    'iso2022_jp_3': (text(0x4E02), b'\x1b$(P!"\x1b(B'),
    'iso2022_jp_ext': (text(0xFF71), b'\x1b(I1\x1b(B'),
    'iso2022_kr': ('a' + text(0xD55C) + '\nb', b'a\x1b$)C\x0eGQ\x0f\nb'),
}


def every_cjk_codec_encodes_as_cpython():
    return all(codecs.encode(t, name) == want for name, (t, want) in SAMPLES.items())


def every_cjk_codec_decodes_back():
    return all(codecs.decode(want, name) == t for name, (t, want) in SAMPLES.items())


def incremental_coders_split_anywhere():
    for name, (t, want) in SAMPLES.items():
        dec = codecs.getincrementaldecoder(name)()
        if ''.join(dec.decode(bytes([b])) for b in want) + dec.decode(b'', True) != t:
            return False
        enc = codecs.getincrementalencoder(name)()
        if b''.join(enc.encode(c) for c in t) + enc.encode('', True) != want:
            return False
    return True


def decoder_state_round_trips():
    dec = codecs.getincrementaldecoder('big5')()
    dec.decode(b'a\xa4')
    state = dec.getstate()
    fresh = codecs.getincrementaldecoder('big5')()
    fresh.setstate(state)
    return state[0] == b'\xa4' and fresh.decode(b'@', True) == text(0x4E00)


def one_error_is_one_byte():
    # big5: an invalid pair is a ONE-byte error; decoding resumes at the
    # second byte, which is why 'replace' keeps the ASCII that follows.
    return (b'a\xa4@\xff'.decode('big5', 'replace') == 'a' + text(0x4E00) + REPL
            and b'\xa4'.decode('big5', 'replace') == REPL)


def iso2022_unknown_escape_passes_through():
    # an escape it does not know is text, up to a byte that could end one
    return b'\x1br{x\x1b(B['.decode('iso2022_kr') == '\x1br{x\x1b(B['


def euc_kr_decodes_the_composed_hangul_form():
    return b'\xa4\xd4\xa4\xa1\xa4\xbf\xa4\xa2'.decode('euc_kr') == text(0xAC02)


def idna_round_trips_a_non_ascii_host():
    host = 'pyth' + text(0xF6) + 'n.org'
    return (host.encode('idna') == b'xn--pythn-mua.org'
            and b'xn--pythn-mua.org'.decode('idna') == host
            and ('Stra' + text(0xDF) + 'e.de').encode('idna') == b'strasse.de')


def ucd_3_2_0_is_real():
    d = unicodedata.ucd_3_2_0
    return (d.unidata_version == '3.2.0'
            and d.normalize('NFKC', text(0xFB01)) == 'fi'
            and d.category(text(0xA9C0)) == 'Cn'
            and d.bidirectional(text(0x5D0)) == 'R'
            and d.combining(text(0x301)) == 230
            and d.decomposition(text(0x2F868)) == '36FC'
            and d.normalize('NFC', text(0x2F868)) == text(0x2136A))


def stringprep_tables():
    return (stringprep.in_table_a1(text(0x221))
            and stringprep.map_table_b2(text(0xC5)) == text(0xE5)
            and stringprep.map_table_b2(text(0x3A3)) == text(0x3C3))


CHECKS = [
    every_cjk_codec_encodes_as_cpython,
    every_cjk_codec_decodes_back,
    incremental_coders_split_anywhere,
    decoder_state_round_trips,
    one_error_is_one_byte,
    iso2022_unknown_escape_passes_through,
    euc_kr_decodes_the_composed_hangul_form,
    idna_round_trips_a_non_ascii_host,
    ucd_3_2_0_is_real,
    stringprep_tables,
]

if __name__ == '__main__':
    for fn in CHECKS:
        try:
            ok = fn() is True
        except Exception as e:
            ok = False
            print('     %s raised %s: %s' % (fn.__name__, type(e).__name__, e))
        print('%-4s %s' % ('OK' if ok else 'FAIL', fn.__name__))
