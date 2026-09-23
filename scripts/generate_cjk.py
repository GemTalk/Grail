#!/usr/bin/env python3
"""Regenerate src/python/stdlib/_cjk_data/ from the CJK codecs of the running
CPython, verifying src/python/stdlib/_cjk.py against them first.

WHY THIS EXISTS.  CPython's CJK codecs (big5, shift_jis, the EUC family,
GB18030, ISO-2022, HZ, ...) are C modules carrying their mapping tables;
Grail had none of them.  Their behaviour is reproduced here by MEASURING it:
every table is read out of CPython by probing its codecs, not transcribed
from the C, and nothing is written unless _cjk.py -- the pure-Python engine
Grail runs -- agrees with CPython on:

  * every single-byte and two-byte decode, every longer sequence enumerated,
    and every code point's encoding;
  * random byte strings under strict/replace/ignore/backslashreplace, whole
    and split at random points through the incremental decoder;
  * random text (including unencodable characters and the two-character
    PAIRS some codecs compose) under strict/replace/ignore/
    xmlcharrefreplace/backslashreplace, whole and incrementally.

Run with the CPython version Grail vendors (3.14.x):
    python3.14 scripts/generate_cjk.py [codec ...]
"""
import codecs
import os
import random
import sys
import types

import importlib.util

HERE = os.path.dirname(os.path.abspath(__file__))
STDLIB = os.path.join(HERE, '..', 'src', 'python', 'stdlib')
OUTDIR = os.path.join(STDLIB, '_cjk_data')

# The runtime under test is loaded BY PATH, never by putting Grail's stdlib on
# sys.path.  That was the first spelling, and it made the comparison
# VACUOUS: CPython's encodings.big5 imports ``_codecs_tw'', and with Grail's
# stdlib first on the path that resolved to Grail's _codecs_tw.py -- this
# engine -- so "CPython" was being checked against itself.  The assertion
# below refuses to run unless every _codecs_* module really is CPython's.
def _by_path(name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(STDLIB, name + '.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


_cjk = _by_path('_cjk')
# The incremental classes Grail actually runs, verified here too rather than
# a stand-in written for the generator.
_mbc = _by_path('_multibytecodec')

import _codecs_cn, _codecs_hk, _codecs_iso2022, _codecs_jp, _codecs_kr, _codecs_tw  # noqa: E401,E402
for _m in (_codecs_cn, _codecs_hk, _codecs_iso2022, _codecs_jp, _codecs_kr, _codecs_tw):
    if not getattr(_m, '__file__', '').endswith('.so'):
        sys.exit('%s is not CPython\'s C module (%r): the comparison would be vacuous'
                 % (_m.__name__, getattr(_m, '__file__', None)))

STATELESS = {
    'big5': 'tw', 'cp950': 'tw',
    'big5hkscs': 'hk',
    'cp932': 'jp', 'shift_jis': 'jp', 'euc_jp': 'jp',
    'euc_jis_2004': 'jp', 'euc_jisx0213': 'jp',
    'shift_jis_2004': 'jp', 'shift_jisx0213': 'jp',
    'cp949': 'kr', 'euc_kr': 'kr', 'johab': 'kr',
    'gb2312': 'cn', 'gbk': 'cn', 'gb18030': 'cn',
}
MAXCP = 0x110000
CHUNK = 8000          # characters per literal: Grail's literal limit is ~70KB


def probe(enc, seq):
    """('ok', text) or ('err', start, end, reason)."""
    try:
        return ('ok', codecs.decode(seq, enc))
    except UnicodeDecodeError as e:
        return ('err', e.start, e.end, e.reason)


def encode_point(enc, point):
    try:
        return codecs.encode(chr(point), enc)
    except UnicodeEncodeError:
        return None


def runs_linear(pairs):
    """[(key, point)] sorted by key -> 'key:point:count;' runs where both
    step by one."""
    out = []
    for key, point in pairs:
        if out and out[-1][0] + out[-1][2] == key and out[-1][1] + out[-1][2] == point:
            out[-1][2] += 1
        else:
            out.append([key, point, 1])
    return ';'.join('%X:%X:%X' % tuple(r) for r in out)


def pad_needed(enc, prefix):
    """How many bytes a sequence beginning with prefix needs, per CPython:
    the smallest total length whose decode is no longer 'incomplete'."""
    for total in range(len(prefix) + 1, 9):
        for pad in (0xA1, 0x30, 0x81):
            seq = prefix + bytes([pad] * (total - len(prefix)))
            result = probe(enc, seq)
            if not (result[0] == 'err' and result[3] == 'incomplete multibyte sequence'
                    and result[2] == len(seq)):
                return total
    return 8


def generate_stateless(enc):
    single, need1 = [], []
    singles = set()
    for b in range(256):
        result = probe(enc, bytes([b]))
        if result[0] == 'ok' and len(result[1]) == 1:
            single.append((b, ord(result[1])))
            singles.add(b)
        elif result[0] == 'err' and result[3] == 'incomplete multibyte sequence':
            need1.append(b)
    dec2_rows, decx, need, errlen = [], [], [], []
    long_prefixes = []
    for lead in need1:
        row = {}
        for trail in range(256):
            seq = bytes([lead, trail])
            result = probe(enc, seq)
            if result[0] == 'ok':
                text = result[1]
                if len(text) == 1 and text != _cjk._SENTINEL:
                    row[trail] = text
                else:
                    decx.append((seq, text))
            elif result[3] == 'incomplete multibyte sequence' and result[2] == 2:
                total = pad_needed(enc, seq)
                need.append((seq, total))
                long_prefixes.append((seq, total))
            elif result[2] - result[1] != 1:
                errlen.append((seq, result[2] - result[1]))
        if row:
            tmin, tmax = min(row), max(row)
            dec2_rows.append((lead, tmin, ''.join(row.get(t, _cjk._SENTINEL)
                                                   for t in range(tmin, tmax + 1))))
    lin4 = []
    for prefix, total in long_prefixes:
        if total == 3:
            for third in range(256):
                seq = prefix + bytes([third])
                result = probe(enc, seq)
                if result[0] == 'ok':
                    decx.append((seq, result[1]))
                elif result[2] - result[1] != 1:
                    errlen.append((seq, result[2] - result[1]))
        elif total == 4:
            # GB18030's four-byte form: b3 in 81..FE, b4 in 30..39, mapped
            # piecewise-linearly.  Enumerated in that box; outside it, the
            # error spans are sampled (the fuzz below checks them).
            for third in range(256):
                for fourth in (range(0x30, 0x3A) if 0x81 <= third <= 0xFE else (0x30,)):
                    seq = prefix + bytes([third, fourth])
                    result = probe(enc, seq)
                    if result[0] == 'ok':
                        b1, b2, b3, b4 = seq
                        index = (((b1 - 0x81) * 10 + (b2 - 0x30)) * 126 + (b3 - 0x81)) * 10 + (b4 - 0x30)
                        if len(result[1]) == 1:
                            lin4.append((index, ord(result[1])))
                        else:
                            decx.append((seq, result[1]))
                    elif result[2] - result[1] != 1:
                        errlen.append((seq, result[2] - result[1]))
        elif total == 8:
            # EUC-KR's KS X 1001:1998 composed Hangul: A4 D4 then three
            # A4-prefixed jamo.  Enumerated over the jamo row.
            for x in range(0xA1, 0xFF):
                for y in range(0xA1, 0xFF):
                    for z in range(0xA1, 0xFF):
                        seq = prefix + bytes([0xA4, x, 0xA4, y, 0xA4, z])
                        result = probe(enc, seq)
                        if result[0] == 'ok':
                            decx.append((seq, result[1]))
    lin4.sort()
    # -- encoding --
    tables = {
        'SINGLE': runs_linear(single),
        'NEED1': ';'.join('%X' % b for b in need1),
        'NEED': ';'.join('%s:%d' % (s.hex(), n) for s, n in need),
        'DEC2': ';'.join('%X:%X:%s' % r for r in dec2_rows),
        'DECX': ';'.join('%s:%s' % (s.hex(), ' '.join('%X' % ord(c) for c in t)) for s, t in decx),
        'LIN4': runs_linear(lin4),
        'ERRLEN': ';'.join('%s:%d' % (s.hex(), n) for s, n in errlen),
        'ENC': '', 'NOENC': '', 'PAIRS': '',
    }
    probe_codec = _cjk.StatelessCodec(enc, None)
    install(probe_codec, tables)
    probe_codec._build_encode()
    enc_items, noenc = [], []
    for point in range(MAXCP):
        if 0xD800 <= point <= 0xDFFF:
            continue
        want = encode_point(enc, point)
        have = probe_codec._encode_one(point)   # tables so far: no ENC/NOENC yet
        if want != have:
            if want is None:
                noenc.append(point)
            else:
                enc_items.append((point, want))
    pairs = []
    for seq, text in decx:
        if len(text) == 2:
            try:
                encoded = codecs.encode(text, enc)
            except UnicodeEncodeError:
                continue
            if encoded == seq or len(encoded) < len(codecs.encode(text[0], enc, 'ignore')
                                                    + codecs.encode(text[1], enc, 'ignore')):
                pairs.append((ord(text[0]), ord(text[1]), encoded))
    tables['ENC'] = ';'.join('%X:%s' % (p, s.hex()) for p, s in enc_items)
    tables['NOENC'] = ';'.join('%X' % p for p in noenc)
    tables['PAIRS'] = ';'.join('%X %X:%s' % (a, b, s.hex()) for a, b, s in pairs)
    return tables


def install(codec, tables):
    """Point a codec at in-memory tables instead of a data module."""
    module = types.SimpleNamespace(**{k: tuple(chunks(v)) for k, v in tables.items()})
    codec._built = False
    original = _cjk._load
    _cjk._load = lambda name: module
    try:
        codec._build()
    finally:
        _cjk._load = original


def chunks(text):
    """Split a table for Grail's literal-size limit.  The runtime joins the
    chunks back before parsing, so a cut can fall anywhere; it prefers an
    entry boundary only to keep the file readable."""
    out, start = [], 0
    while len(text) - start > CHUNK:
        cut = max(text.rfind(';', start, start + CHUNK), text.rfind(',', start, start + CHUNK))
        cut = cut + 1 if cut > start else start + CHUNK
        out.append(text[start:cut])
        start = cut
    out.append(text[start:])
    return out


# ------------------------------------------------------------ verification

def outcome(func):
    try:
        return ('ok', func())
    except UnicodeError as e:
        return ('err', type(e).__name__, getattr(e, 'start', None),
                getattr(e, 'end', None), getattr(e, 'reason', None))
    except RuntimeError as e:
        return ('internal', str(e))


def verify_stateless(enc, codec, tables):
    rng = random.Random(enc)
    # every decodable sequence and every code point
    for b in range(256):
        seq = bytes([b])
        assert_same(enc, 'decode', seq, outcome(lambda: codecs.decode(seq, enc)),
                    outcome(lambda: codec.decode(seq)[0]))
    for lead in codec._need1:
        for trail in range(256):
            seq = bytes([lead, trail])
            want = outcome(lambda: codecs.decode(seq, enc))
            got = outcome(lambda: codec.decode(seq)[0])
            if want[0] == 'ok' or got[0] == 'ok':
                assert_same(enc, 'decode', seq, want, got)
    for point in range(MAXCP):
        if 0xD800 <= point <= 0xDFFF:
            continue
        ch = chr(point)
        want = outcome(lambda: codecs.encode(ch, enc))
        got = outcome(lambda: codec.encode(ch)[0])
        if want[0] != got[0] or (want[0] == 'ok' and want[1] != got[1]):
            sys.exit('MISMATCH %s encode U+%04X: CPython %r, generated %r'
                     % (enc, point, want, got))
    codec._build_encode()
    table = codec.sequences()
    valid = list(table) + [bytes([b]) for b in codec._single]
    repertoire = [ord(t) for t in table.values() if len(t) == 1]
    repertoire += [ord(c) for c in codec._single.values()]
    pair_texts = [chr(a) + chr(b) for a, b in codec._pairs]
    for trial in range(4000):
        data = b''.join(rng.choice(valid) if rng.random() < 0.8 else bytes([rng.randrange(256)])
                        for _ in range(rng.randint(1, 12)))
        for errors in ('strict', 'replace', 'ignore', 'backslashreplace'):
            want = outcome(lambda: codecs.decode(data, enc, errors))
            got = outcome(lambda: codec.decode(data, errors)[0])
            assert_same(enc, 'decode/%s' % errors, data, want, got)
        cuts = sorted(rng.sample(range(len(data) + 1), min(3, len(data) + 1)))
        want = outcome(lambda: incremental_decode(codecs.getincrementaldecoder(enc)('replace'), data, cuts))
        got = outcome(lambda: incremental_decode(_Incremental(codec, 'replace'), data, cuts))
        assert_same(enc, 'incremental decode %r' % cuts, data, want, got)
    for trial in range(3000):
        parts = []
        for _ in range(rng.randint(1, 10)):
            r = rng.random()
            if r < 0.7:
                parts.append(chr(rng.choice(repertoire)))
            elif r < 0.85 and pair_texts:
                parts.append(rng.choice(pair_texts))
            else:
                parts.append(chr(rng.choice((0x20AC, 0x1F600, 0x0E01, 0x05D0, 0x10FFFF))))
        text = ''.join(parts)
        for errors in ('strict', 'replace', 'ignore', 'xmlcharrefreplace', 'backslashreplace'):
            want = outcome(lambda: codecs.encode(text, enc, errors))
            got = outcome(lambda: codec.encode(text, errors)[0])
            assert_same(enc, 'encode/%s' % errors, text, want, got)
        cuts = sorted(rng.sample(range(len(text) + 1), min(3, len(text) + 1)))
        want = outcome(lambda: incremental_encode(codecs.getincrementalencoder(enc)('replace'), text, cuts))
        got = outcome(lambda: incremental_encode(_IncrementalEnc(codec, 'replace'), text, cuts))
        assert_same(enc, 'incremental encode %r' % cuts, text, want, got)


def _Incremental(codec, errors):
    cls = type('Dec', (_mbc.MultibyteIncrementalDecoder,), {'codec': codec})
    return cls(errors)


def _IncrementalEnc(codec, errors):
    cls = type('Enc', (_mbc.MultibyteIncrementalEncoder,), {'codec': codec})
    return cls(errors)


def incremental_decode(decoder, data, cuts):
    out, last = [], 0
    for cut in cuts:
        out.append(decoder.decode(data[last:cut]))
        last = cut
    out.append(decoder.decode(data[last:], True))
    return out


def incremental_encode(encoder, text, cuts):
    out, last = [], 0
    for cut in cuts:
        out.append(encoder.encode(text[last:cut]))
        last = cut
    out.append(encoder.encode(text[last:], True))
    return out


def assert_same(enc, what, data, want, got):
    if want != got:
        sys.exit('MISMATCH %s %s %r:\n  CPython   %r\n  generated %r' % (enc, what, data, want, got))


# ------------------------------------------------------------ ISO-2022

ISO2022 = ('iso2022_jp', 'iso2022_jp_1', 'iso2022_jp_2', 'iso2022_jp_2004',
           'iso2022_jp_3', 'iso2022_jp_ext', 'iso2022_kr')
FORMS = {'(': 0, '$': 0, '$(': 0, ')': 1, '$)': 1, '.': 2}
ESC = b'\x1b'


def decodes(enc, data):
    try:
        codecs.decode(data, enc)
        return True
    except UnicodeDecodeError:
        return False


def accepted_escapes(enc):
    out = {}
    for form, plane in FORMS.items():
        for final in range(0x40, 0x7F):
            key = form + chr(final)
            esc = ESC + key.encode('ascii')
            probes = (b'!!', b'0!', b'\x0e0!\x0f', b'!', b'1', b'\x1bN!', b'\x1bNa')
            if any(decodes(enc, esc + code + ESC + b'(B') for code in probes):
                out[key] = plane
    return out


def charset_of(key):
    return ('$' if key[0] == '$' else '') + key[-1]


def outcome_decode(enc, data):
    try:
        return ('ok', codecs.decode(data, enc))
    except UnicodeDecodeError as e:
        return ('err', e.start, e.end, e.reason)
    except RuntimeError as e:
        return ('internal',)


def charset_table(enc, charset):
    """(width, {code: text}) for one charset, read through its canonical
    G0 designation."""
    esc = ESC + (b'$(' + charset[1:].encode() if charset[0] == '$' else b'(' + charset.encode())
    first = outcome_decode(enc, esc + b'!')
    width = 2 if first[0] == 'err' and first[3] == 'incomplete multibyte sequence' else 1
    codes = {}
    if width == 1:
        for c in range(0x20, 0x80):
            r = outcome_decode(enc, esc + bytes([c]))
            if r[0] == 'ok':
                codes[bytes([c])] = r[1]
    else:
        for a in range(0x20, 0x80):
            for b in range(256):
                code = bytes([a, b])
                r = outcome_decode(enc, esc + code)
                if r[0] == 'ok' and len(r[1]) >= 1:
                    codes[code] = r[1]
    return width, codes


def parse_encoding(enc, escapes, out):
    """(designation key, code bytes) from CPython's encoding of one char."""
    rest = out
    key = None
    if rest.endswith(ESC + b'(B'):
        rest = rest[:-3]
    if rest.endswith(b'\x0f'):
        rest = rest[:-1]
    while rest.startswith(ESC):
        for k in sorted(escapes, key=len, reverse=True):
            if rest[1:1 + len(k)] == k.encode('ascii'):
                key = k
                rest = rest[1 + len(k):]
                break
        else:
            raise SystemExit('unparsed escape in %r for %s' % (out, enc))
    if rest.startswith(b'\x0e'):
        rest = rest[1:]
    return key, rest


def split_rows(name, width, codes):
    """ROWS items for a two-byte charset's one-character codes, and CODES
    items for everything else (one-byte sets, multi-character decodes, and
    any character that would collide with the item syntax)."""
    rows, extra, by_lead = [], [], {}
    for code, text in sorted(codes.items()):
        if width == 2 and len(text) == 1 and text not in ';:' and text != _cjk._SENTINEL:
            by_lead.setdefault(code[0], {})[code[1]] = text
        else:
            extra.append('%s:%s:%s' % (name, code.hex(), ' '.join('%X' % ord(c) for c in text)))
    for lead, row in sorted(by_lead.items()):
        tmin, tmax = min(row), max(row)
        rows.append('%s:%X:%X:%s' % (name, lead, tmin,
                                     ''.join(row.get(t, _cjk._SENTINEL) for t in range(tmin, tmax + 1))))
    return rows, extra


def designation_order(choices, inverses, key_of):
    """The preference order CPython's encoder evidently uses: charset A
    precedes B wherever some character is in both and CPython chose A."""
    names = sorted(set(key_of))
    before = {n: set() for n in names}
    for point, name in choices.items():
        for other in names:
            if other != name and point in inverses[other]:
                before[name].add(other)
    order, placed = [], set()
    while len(order) < len(names):
        ready = [n for n in names if n not in placed
                 and not any(n in before[m] for m in names if m not in placed and m != n)]
        if not ready:
            sys.exit('no consistent designation order: %r' % before)
        n = sorted(ready)[0]
        order.append(n)
        placed.add(n)
    return [key_of[n] for n in order]


def generate_iso2022(enc):
    escapes = accepted_escapes(enc)
    flags = []
    if enc == 'iso2022_kr':
        flags.append('SHIFT')
    if any(p == 2 for p in escapes.values()):
        flags.append('G2')
    if outcome_decode(enc, ESC + b'&@' + ESC + b'$B!!' + ESC + b'(B')[0] == 'ok':
        flags.append('EXT')
    names = sorted({charset_of(k) for k in escapes} - {'B'})
    widths, rows, extra, tables = [], [], [], {}
    for name in names:
        width, codes = charset_table(enc, name)
        tables[name] = (width, codes)
        widths.append('%s:%d' % (name, width))
        r, x = split_rows(name, width, codes)
        rows += r
        extra += x
    g2_items = []
    for key, plane in sorted(escapes.items()):
        if plane != 2 or key[-1] == 'B':
            continue
        entries, internal = [], False
        for byte in range(256):
            r = outcome_decode(enc, ESC + key.encode() + ESC + b'N' + bytes([byte]))
            if r[0] == 'internal':
                internal = True
                break
            if r[0] == 'ok' and len(r[1]) == 1:
                entries.append('%X=%X' % (byte, ord(r[1])))
        if not internal:
            g2_items.append('%s:%s' % (key[-1], ','.join(entries)))
    host, internal_points = {}, []
    for point in range(0x80, MAXCP):
        if 0xD800 <= point <= 0xDFFF:
            continue
        try:
            out = codecs.encode(chr(point), enc)
        except UnicodeEncodeError:
            continue
        except RuntimeError:
            internal_points.append(point)
            continue
        host[point] = parse_encoding(enc, escapes, out)
    inverses = {}
    for name, (width, codes) in tables.items():
        inverse = {}
        for code, text in sorted(codes.items()):
            if len(text) == 1:
                inverse.setdefault(ord(text), code)
        inverses[name] = inverse
    key_of, choices = {}, {}
    for point, (key, code) in host.items():
        name = charset_of(key)
        key_of.setdefault(name, key)
        choices[point] = name
    order = designation_order(choices, inverses, key_of)
    tables_out = {
        'FLAGS': ' '.join(flags), 'WIDTHS': ';'.join(widths), 'ROWS': ';'.join(rows),
        'CODES': ';'.join(extra), 'G2TABLES': ';'.join(g2_items), 'ORDER': ','.join(order),
        'ENC': '', 'NOENC': '', 'PAIRS': '',
        'INTERNAL': ';'.join('%X' % p for p in internal_points),
    }
    probe = _cjk.Iso2022Codec(enc, None)
    install(probe, tables_out)
    probe._build_encode()
    enc_items, noenc = [], []
    for point in range(0x80, MAXCP):
        if 0xD800 <= point <= 0xDFFF or point in internal_points:
            continue
        want = host.get(point)
        have = probe._encode_point(point)
        if want != have:
            if want is None:
                noenc.append(point)
            else:
                enc_items.append('%X:%s:%s' % (point, want[0], want[1].hex()))
    pair_items, seen = [], set()
    for name, (width, codes) in tables.items():
        for code, text in codes.items():
            if len(text) == 2 and text not in seen:
                seen.add(text)
                try:
                    out = codecs.encode(text, enc)
                except (UnicodeEncodeError, RuntimeError):
                    continue
                key, code_bytes = parse_encoding(enc, escapes, out)
                if len(code_bytes) == 2:
                    pair_items.append('%X %X:%s:%s' % (ord(text[0]), ord(text[1]), key, code_bytes.hex()))
    tables_out['ENC'] = ';'.join(enc_items)
    tables_out['NOENC'] = ';'.join('%X' % p for p in noenc)
    tables_out['PAIRS'] = ';'.join(pair_items)
    return tables_out, sorted(escapes)


def verify_iso2022(enc, codec, keys):
    rng = random.Random(enc)
    codec._build()
    codes = []
    for name, (width, rows, extra) in codec._charsets.items():
        codes.extend(extra)
        for lead, (tmin, row) in rows.items():
            codes.extend(bytes((lead, tmin + k)) for k, ch in enumerate(row) if ch != _cjk._SENTINEL)
    for point in range(0x80, MAXCP):
        if 0xD800 <= point <= 0xDFFF:
            continue
        ch = chr(point)
        want = outcome(lambda: codecs.encode(ch, enc))
        got = outcome(lambda: codec.encode(ch)[0])
        if want != got:
            sys.exit('MISMATCH %s encode U+%04X: CPython %r, generated %r' % (enc, point, want, got))
    pieces = [ESC + k.encode('ascii') for k in keys] + [b'\x0e', b'\x0f', b'\n', b' ', b'\x1bN',
              b'\x1b', b'\x1b$', b'\x1b(Z', b'\x80', b'\x7f', b'\x1b(B', b'\x1br', b'\x1b&@',
              b'\x1bN\xa1', b'\xe9', b'@', b'Q'] + [bytes([c]) for c in range(0x20, 0x7F, 7)]
    for trial in range(5000):
        data = b''.join(rng.choice(codes) if rng.random() < 0.55 else rng.choice(pieces)
                        for _ in range(rng.randint(1, 14)))
        for errors in ('strict', 'replace', 'ignore', 'backslashreplace'):
            want = outcome(lambda: codecs.decode(data, enc, errors))
            got = outcome(lambda: codec.decode(data, errors)[0])
            assert_same(enc, 'decode/%s' % errors, data, want, got)
        cuts = sorted(rng.sample(range(len(data) + 1), min(3, len(data) + 1)))
        want = outcome(lambda: incremental_decode(codecs.getincrementaldecoder(enc)('replace'), data, cuts))
        got = outcome(lambda: incremental_decode(_Incremental(codec, 'replace'), data, cuts))
        assert_same(enc, 'incremental decode %r' % cuts, data, want, got)
    codec._build_encode()
    repertoire = list(codec._enc) + [ord(c) for c in 'abc \n~\t']
    pair_texts = [chr(a) + chr(b) for a, b in codec._pairs]
    for trial in range(4000):
        parts = []
        for _ in range(rng.randint(1, 10)):
            r = rng.random()
            if r < 0.75:
                parts.append(chr(rng.choice(repertoire)))
            elif r < 0.85 and pair_texts:
                parts.append(rng.choice(pair_texts))
            else:
                parts.append(chr(rng.choice((0x20AC, 0x1F600, 0x0E01, 0x05D0))))
        text = ''.join(parts)
        for errors in ('strict', 'replace', 'ignore', 'xmlcharrefreplace', 'backslashreplace'):
            want = outcome(lambda: codecs.encode(text, enc, errors))
            got = outcome(lambda: codec.encode(text, errors)[0])
            assert_same(enc, 'encode/%s' % errors, text, want, got)
        cuts = sorted(rng.sample(range(len(text) + 1), min(3, len(text) + 1)))
        want = outcome(lambda: incremental_encode(codecs.getincrementalencoder(enc)('replace'), text, cuts))
        got = outcome(lambda: incremental_encode(_IncrementalEnc(codec, 'replace'), text, cuts))
        assert_same(enc, 'incremental encode %r' % cuts, text, want, got)


# ---------------------------------------------------------------------- HZ

def generate_hz():
    codes = {}
    for x in range(0x21, 0x7F):
        for y in range(0x21, 0x7F):
            r = outcome_decode('hz', b'~{' + bytes([x, y]))
            if r[0] == 'ok' and len(r[1]) == 1:
                codes[bytes([x, y])] = r[1]
    rows, extra = split_rows('gb', 2, codes)
    if extra:
        sys.exit('hz: unexpected non-row codes %r' % extra[:5])
    tables = {'ROWS': ';'.join(r.split(':', 1)[1] for r in rows), 'ENC': '', 'NOENC': ''}
    probe = _cjk.HzCodec('hz', None)
    install(probe, tables)
    probe._build_encode()
    enc_items, noenc = [], []
    for point in range(0x80, MAXCP):
        if 0xD800 <= point <= 0xDFFF:
            continue
        out = encode_point('hz', point)
        want = None
        if out is not None:
            if not (out.startswith(b'~{') and out.endswith(b'~}') and len(out) == 6):
                sys.exit('unexpected hz encoding %r for U+%04X' % (out, point))
            want = (out[2] << 8) | out[3]
        have = probe._enc.get(point)
        if want != have:
            if want is None:
                noenc.append(point)
            else:
                enc_items.append('%X:%04X' % (point, want))
    tables['ENC'] = ';'.join(enc_items)
    tables['NOENC'] = ';'.join('%X' % p for p in noenc)
    return tables


def verify_hz(codec):
    enc = 'hz'
    rng = random.Random(enc)
    codec._build()
    codec._build_encode()
    for point in range(MAXCP):
        if 0xD800 <= point <= 0xDFFF:
            continue
        ch = chr(point)
        want = outcome(lambda: codecs.encode(ch, enc))
        got = outcome(lambda: codec.encode(ch)[0])
        if want != got:
            sys.exit('MISMATCH hz encode U+%04X: CPython %r, generated %r' % (point, want, got))
    codes = [bytes((lead, tmin + k)) for lead, (tmin, row) in codec._rows.items()
             for k, ch in enumerate(row) if ch != _cjk._SENTINEL]
    pieces = [b'~{', b'~}', b'~~', b'~\n', b'~x', b'~', b'\n', b' ', b'\x80', b'a', b'z', b'\x7f', b'{', b'}']
    for trial in range(5000):
        data = b''.join(rng.choice(codes) if rng.random() < 0.5 else rng.choice(pieces)
                        for _ in range(rng.randint(1, 14)))
        for errors in ('strict', 'replace', 'ignore', 'backslashreplace'):
            want = outcome(lambda: codecs.decode(data, enc, errors))
            got = outcome(lambda: codec.decode(data, errors)[0])
            assert_same(enc, 'decode/%s' % errors, data, want, got)
        cuts = sorted(rng.sample(range(len(data) + 1), min(3, len(data) + 1)))
        want = outcome(lambda: incremental_decode(codecs.getincrementaldecoder(enc)('replace'), data, cuts))
        got = outcome(lambda: incremental_decode(_Incremental(codec, 'replace'), data, cuts))
        assert_same(enc, 'incremental decode %r' % cuts, data, want, got)
    repertoire = list(codec._enc) + [ord(c) for c in 'ab ~\n\t{}']
    for trial in range(4000):
        text = ''.join(chr(rng.choice(repertoire)) if rng.random() < 0.85
                       else chr(rng.choice((0x20AC, 0x1F600, 0xFF21, 0x4E02)))
                       for _ in range(rng.randint(1, 10)))
        for errors in ('strict', 'replace', 'ignore', 'xmlcharrefreplace', 'backslashreplace'):
            want = outcome(lambda: codecs.encode(text, enc, errors))
            got = outcome(lambda: codec.encode(text, errors)[0])
            assert_same(enc, 'encode/%s' % errors, text, want, got)
        cuts = sorted(rng.sample(range(len(text) + 1), min(3, len(text) + 1)))
        want = outcome(lambda: incremental_encode(codecs.getincrementalencoder(enc)('replace'), text, cuts))
        got = outcome(lambda: incremental_encode(_IncrementalEnc(codec, 'replace'), text, cuts))
        assert_same(enc, 'incremental encode %r' % cuts, text, want, got)


# ------------------------------------------------------------------ output

HEADER = '''\
# GENERATED by scripts/generate_cjk.py from CPython %(py)s's %(name)s codec
# -- do not edit.  Read by _cjk.py; see both files for what is stored and
# why, and for the verification this passed before it was written.

'''


def write(name, tables):
    os.makedirs(OUTDIR, exist_ok=True)
    path = os.path.join(OUTDIR, name + '.py')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(HEADER % {'py': sys.version.split()[0], 'name': name})
        for key in sorted(tables):
            f.write('%s = (\n' % key)
            for part in chunks(tables[key]):
                f.write('    %r,\n' % part)
            f.write(')\n')
    return os.path.getsize(path)


def main():
    names = sys.argv[1:] or sorted(STATELESS) + list(ISO2022) + ['hz']
    for name in names:
        if name == 'hz':
            tables = generate_hz()
            codec = _cjk.HzCodec(name, None)
            install(codec, tables)
            verify_hz(codec)
        elif name in ISO2022:
            tables, keys = generate_iso2022(name)
            codec = _cjk.Iso2022Codec(name, None)
            install(codec, tables)
            verify_iso2022(name, codec, keys)
        else:
            tables = generate_stateless(name)
            codec = _cjk.StatelessCodec(name, None)
            install(codec, tables)
            verify_stateless(name, codec, tables)
        size = write(name, tables)
        print('%-15s %8d bytes  verified' % (name, size), flush=True)


if __name__ == '__main__':
    main()
