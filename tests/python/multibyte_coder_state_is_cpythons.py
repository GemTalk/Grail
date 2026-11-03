"""Fixture: a CJK incremental coder's state is CPython's, byte for byte.

Modules/cjkcodecs/multibytecodec.c answers an encoder's getstate() as one
little-endian int -- the pending text's UTF-8 length, that UTF-8, then the
eight bytes of the codec's MultibyteCodec_State -- and a decoder's as
(pending bytes, int of those eight bytes); setstate() refuses a pending
buffer too large, pending text that is no UTF-8, and a state of the wrong
shape.  ISO-2022's state bytes are the designated charsets' marks, so
iso2022_jp starts at ``BB'' and ``\\u3042'' designates 0xC2 (JIS X 0208).

Grail packed the state its own way, so the values differed, a stateless
codec dropped the state it was given, and setstate() checked neither size
nor encoding (test_multibytecodec).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import codecs

r = {}


def outcome(call):
    try:
        return call()
    except (TypeError, UnicodeError, OverflowError) as e:
        return '%s: %s' % (type(e).__name__, e)


def encoder_states(name, *texts):
    encoder = codecs.getincrementalencoder(name)()
    states = [encoder.getstate()]
    for text in texts:
        encoder.encode(text)
        states.append(encoder.getstate())
    return states


def restored_encoding(name, first, second):
    encoder = codecs.getincrementalencoder(name)()
    encoder.encode(first)
    state = encoder.getstate()
    once = encoder.encode(second)
    encoder.setstate(state)
    return once, encoder.encode(second)


def decoder_round_trip(name, state):
    decoder = codecs.getincrementaldecoder(name)()
    decoder.setstate(state)
    return decoder.getstate()


def decoder_states(name, data):
    decoder = codecs.getincrementaldecoder(name)()
    before = decoder.getstate()
    decoder.decode(data)
    return before, decoder.getstate()


euc_jp_encoder = codecs.getincrementalencoder('euc_jp')()
euc_jp_decoder = codecs.getincrementaldecoder('euc_jp')()

r['a_pending_character_is_its_utf_8'] = encoder_states('euc_jis_2004', 'æ', '̀')
r['iso_2022_state_is_the_designated_marks'] = encoder_states('iso2022_jp', 'あ', 'z')
r['a_restored_state_encodes_alike'] = [
    restored_encoding('euc_jis_2004', 'æ', '̀'), restored_encoding('iso2022_jp', 'あ', 'い')]
r['encoder_setstate_refuses_a_bad_state'] = [
    outcome(lambda: euc_jp_encoder.setstate(int.from_bytes(b'\x09' + bytes(16), 'little'))),
    outcome(lambda: euc_jp_encoder.setstate(int.from_bytes(b'\x01\xff' + bytes(8), 'little'))),
    outcome(lambda: euc_jp_encoder.setstate('0'))]
r['a_stateless_decoder_keeps_the_state_it_is_given'] = decoder_round_trip('euc_jp', (b'abc', 123456789))
r['iso_2022_decoder_state'] = decoder_states('iso2022_jp', b'\x1b$B')
r['decoder_setstate_refuses_a_bad_state'] = [
    outcome(lambda: euc_jp_decoder.setstate(123)),
    outcome(lambda: euc_jp_decoder.setstate(('invalid', 0))),
    outcome(lambda: euc_jp_decoder.setstate((b'1234', 'invalid'))),
    outcome(lambda: euc_jp_decoder.setstate((b'123456789', 0)))]

ILLEGAL = 'TypeError: setstate(): illegal state argument'
EXPECTED = {
    'a_pending_character_is_its_utf_8': [
        0, int.from_bytes(b'\x02\xc3\xa6' + bytes(8), 'little'), 0],
    'iso_2022_state_is_the_designated_marks': [
        int.from_bytes(b'\x00BB' + bytes(6), 'little'),
        int.from_bytes(b'\x00\xc2B' + bytes(6), 'little'),
        int.from_bytes(b'\x00BB' + bytes(6), 'little')],
    'a_restored_state_encodes_alike': [(b'\xab\xc4', b'\xab\xc4'), (b'$$', b'$$')],
    'encoder_setstate_refuses_a_bad_state': [
        'UnicodeError: pending buffer too large',
        "UnicodeDecodeError: 'utf-8' codec can't decode byte 0xff in position 0: invalid start byte",
        'TypeError: setstate() argument must be int, not str'],
    'a_stateless_decoder_keeps_the_state_it_is_given': (b'abc', 123456789),
    'iso_2022_decoder_state': (
        (b'', int.from_bytes(b'BBB' + bytes(5), 'little')),
        (b'', int.from_bytes(b'\xc2BB' + bytes(5), 'little'))),
    'decoder_setstate_refuses_a_bad_state': [
        'TypeError: setstate() argument must be tuple, not int', ILLEGAL, ILLEGAL,
        "UnicodeDecodeError: 'euc_jp' codec can't decode bytes in position 0-8: pending buffer too large"],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-50s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
