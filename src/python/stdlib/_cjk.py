# The CJK codecs -- CPython's Modules/cjkcodecs -- as pure Python over
# GENERATED tables.
#
# CPython implements big5, shift_jis, the EUC family, GB18030, ISO-2022 and
# the rest in C (_multibytecodec plus six _codecs_* modules carrying their
# mapping tables).  Grail had none of them, so every one of those encodings
# was a LookupError -- including in test_codecs' BasicUnicodeTest, which walks
# every encoding CPython ships.
#
# The tables are read out of the running CPython by scripts/generate_cjk.py,
# which also VERIFIES this engine against CPython before writing anything:
# every encodable code point, every decodable byte sequence, and random text
# and random bytes under each error policy, whole and split at random points
# through the incremental coders.  So the behaviour here is measured, not
# transcribed from the C -- including what counts as ONE decode error, which
# decides what ``replace'' produces.
#
# Written to run under BOTH CPython (for that verification) and Grail.
#
# STATELESS codecs are a byte trie: a lead byte says how many bytes the
# sequence needs (one, two, or more for EUC's 0x8F and GB18030's four-byte
# form), the sequence maps to text, and anything else is one error whose
# length is almost always a single byte.  The STATEFUL ones (ISO-2022, HZ)
# are escape-driven state machines over charset tables; see Iso2022Codec.

import importlib

_SENTINEL = '\uffff'        # "no mapping" in a DEC2 row (never a valid decode)


def _table(value):
    """A generated table: one string, or a tuple of chunks of one (Grail
    cannot compile a single string literal much past 70KB)."""
    if isinstance(value, tuple):
        return ''.join(value)
    return value


def _items(value):
    return [item for item in _table(value).split(';') if item]


def _load(name):
    return importlib.import_module('_cjk_data.' + name)


def _lone_surrogate(point):
    return bytes((point & 0xFF, point >> 8)).decode('utf-16-le', 'surrogatepass')


def _char(point):
    if 0xD800 <= point <= 0xDFFF:
        return _lone_surrogate(point)
    return chr(point)


# ------------------------------------------------------------ error policies

def _decode_error(errors, codec_name, data, start, end, reason):
    """(replacement text, resume index) for one decode error."""
    import codecs
    exc = UnicodeDecodeError(codec_name, bytes(data), start, end, reason)
    if errors == 'strict':
        raise exc
    if errors == 'ignore':
        return ('', end)
    if errors == 'replace':
        return ('\ufffd', end)
    if errors == 'backslashreplace':
        return (''.join('\\x%02x' % b for b in data[start:end]), end)
    if errors == 'surrogateescape':
        out = []
        for b in data[start:end]:
            if b < 0x80:
                raise exc
            out.append(_lone_surrogate(0xDC00 + b))
        return (''.join(out), end)
    handler = codecs.lookup_error(errors)
    result = handler(exc)
    if not isinstance(result, tuple) or len(result) != 2:
        raise TypeError('decoding error handler must return (str, int) tuple')
    replacement, position = result
    if position < 0:
        position += len(data)
    if not 0 <= position <= len(data):
        raise IndexError('position %d from error handler out of bounds' % position)
    return (replacement, position)


def _encode_error(errors, codec_name, text, start, end):
    """(replacement text or bytes, resume index) for one encode error."""
    import codecs
    exc = UnicodeEncodeError(codec_name, text, start, end, 'illegal multibyte sequence')
    if errors == 'strict':
        raise exc
    if errors == 'ignore':
        return ('', end)
    if errors == 'replace':
        return ('?' * (end - start), end)
    handler = codecs.lookup_error(errors)
    result = handler(exc)
    if not isinstance(result, tuple) or len(result) != 2:
        raise TypeError('encoding error handler must return (str, int) tuple')
    replacement, position = result
    if position < 0:
        position += len(text)
    if not 0 <= position <= len(text):
        raise IndexError('position %d from error handler out of bounds' % position)
    return (replacement, position)


def _as_bytes(data):
    if isinstance(data, bytes):
        return data
    if isinstance(data, (bytearray, memoryview)):
        return bytes(data)
    if isinstance(data, (str, int)) or data is None:
        raise TypeError("a bytes-like object is required, not '%s'"
                        % type(data).__name__)
    return bytes(memoryview(data))


# --------------------------------------------------------- stateless codecs

class StatelessCodec:
    """A multibyte codec with no shift state: big5, cp932, the EUC family,
    gbk, gb18030, johab, shift_jis and their variants."""

    stateful = False

    def __init__(self, name, data_module):
        self.name = name
        self._module = data_module
        self._built = False

    def _build(self):
        """Parse what DECODING needs.  Cheap, because the two-byte table stays
        as the generated row strings and is indexed in place.

        The rest is built on first use: the table of longer sequences and
        multi-character decodes (_long), and everything encoding needs
        (_build_encode).  EUC-KR's 11172 eight-byte composed-Hangul sequences
        cost two seconds to parse in Grail, and are needed only for input
        that uses that form, or to encode a syllable outside KS X 1001."""
        if self._built:
            return
        d = _load(self._module)
        self._data = d
        single = {}
        for item in _items(d.SINGLE):
            start, point, count = item.split(':')
            start, point = int(start, 16), int(point, 16)
            for k in range(int(count, 16)):
                single[start + k] = _char(point + k)
        self._single = single
        self._need1 = frozenset(int(x, 16) for x in _items(d.NEED1))
        need = {}
        for item in _items(d.NEED):
            prefix, length = item.split(':')
            need[bytes.fromhex(prefix)] = int(length)
        self._need = need
        rows = {}
        for item in _items(d.DEC2):
            lead, tmin, row = item.split(':', 2)
            rows[int(lead, 16)] = (int(tmin, 16), row)
        self._rows = rows
        lin = []
        for item in _items(d.LIN4):
            index, point, count = item.split(':')
            lin.append((int(index, 16), int(point, 16), int(count, 16)))
        self._lin4 = lin
        self._errlen = {}
        for item in _items(d.ERRLEN):
            seq, length = item.split(':')
            self._errlen[bytes.fromhex(seq)] = int(length)
        self._long_table = None
        self._enc = None
        self._built = True

    def _long(self):
        """Sequences of three or more bytes, and two-byte ones decoding to
        more than one character (big5hkscs, JIS X 0213).  Built on first use."""
        if self._long_table is None:
            table = {}
            for item in _items(self._data.DECX):
                seq, points = item.split(':')
                table[bytes.fromhex(seq)] = ''.join(_char(int(p, 16)) for p in points.split(' '))
            self._long_table = table
        return self._long_table

    def sequences(self):
        """Every decodable multi-byte sequence -> its text.  For the
        generator's verification; nothing at run time needs it."""
        self._build()
        out = {}
        for lead, (tmin, text) in self._rows.items():
            for k, ch in enumerate(text):
                if ch != _SENTINEL:
                    out[bytes((lead, tmin + k))] = ch
        out.update(self._long())
        return out

    def _row_decode(self, seq):
        row = self._rows.get(seq[0])
        if row is None:
            return None
        tmin, text = row
        k = seq[1] - tmin
        if 0 <= k < len(text):
            ch = text[k]
            if ch != _SENTINEL:
                return ch
        return None

    def _build_encode(self):
        """What encoding needs, on first encode: the inverse of the two-byte
        rows, the generator's explicit entries -- where CPython's encoder
        chooses a different sequence, or encodes a character nothing decodes
        to -- and the characters it refuses despite a decode.

        The row inverse holds each sequence as an INT (lead << 8 | trail),
        turned into bytes only when used; and the inverse of the longer table
        is not built here at all, but on the first character the rest cannot
        encode (_long_inverse).  Precedence is the generator's: explicit entry,
        then refusal, then the rows, then the longer table."""
        if self._enc is not None:
            return
        enc = {}
        for lead, (tmin, text) in self._rows.items():
            base = (lead << 8) | tmin
            for k, ch in enumerate(text):
                if ch != _SENTINEL:
                    enc.setdefault(ord(ch), base + k)
        d = self._data
        explicit = {}
        for item in _items(d.ENC):
            point, seq = item.split(':')
            explicit[int(point, 16)] = bytes.fromhex(seq)
        self._explicit = explicit
        self._refused = frozenset(int(item, 16) for item in _items(d.NOENC))
        pairs = {}
        for item in _items(d.PAIRS):
            points, seq = item.split(':')
            first, second = points.split(' ')
            pairs[(int(first, 16), int(second, 16))] = bytes.fromhex(seq)
        self._pairs = pairs
        self._starters = frozenset(first for first, _ in pairs)
        self._long_inv = None
        self._enc = enc

    def _long_inverse(self):
        if self._long_inv is None:
            inverse = {}
            for seq, text in self._long().items():
                if len(text) == 1:
                    inverse.setdefault(ord(text), seq)
            self._long_inv = inverse
        return self._long_inv

    # -- decoding -----------------------------------------------------------

    def _lin4_decode(self, seq):
        if len(seq) != 4:
            return None
        b1, b2, b3, b4 = seq
        # The index is only meaningful inside the four-byte box -- b1/b3 in
        # 81..FE, b2/b4 in 30..39.  Out of it the arithmetic can still land
        # in a valid run (``C9 31 92 EB'' reached U+BFBC9, where CPython
        # raises), so the box is checked first.
        if not (0x81 <= b1 <= 0xFE and 0x30 <= b2 <= 0x39
                and 0x81 <= b3 <= 0xFE and 0x30 <= b4 <= 0x39):
            return None
        index = (((b1 - 0x81) * 10 + (b2 - 0x30)) * 126 + (b3 - 0x81)) * 10 + (b4 - 0x30)
        for start, point, count in self._lin4:
            if start <= index < start + count:
                return _char(point + index - start)
        return None

    def _lin4_encode(self, point):
        for start, first, count in self._lin4:
            if first <= point < first + count:
                index = start + point - first
                b4 = index % 10
                index //= 10
                b3 = index % 126
                index //= 126
                b2 = index % 10
                b1 = index // 10
                return bytes((b1 + 0x81, b2 + 0x30, b3 + 0x81, b4 + 0x30))
        return None

    def decode_chunk(self, data, errors, final, state=None):
        """(text, consumed, state).  With final false, a trailing sequence
        still waiting for bytes is left unconsumed."""
        self._build()
        out = []
        length = len(data)
        index = 0
        single, need1, need = self._single, self._need1, self._need
        while index < length:
            lead = data[index]
            ch = single.get(lead)
            if ch is not None:
                out.append(ch)
                index += 1
                continue
            if lead not in need1:
                text, index = _decode_error(errors, self.name, data, index,
                                            index + 1, 'illegal multibyte sequence')
                out.append(text)
                continue
            n = 2
            if index + 1 < length:
                n = need.get(data[index:index + 2], 2)
            if index + n > length:
                if not final:
                    break
                text, index = _decode_error(errors, self.name, data, index,
                                            length, 'incomplete multibyte sequence')
                out.append(text)
                continue
            seq = data[index:index + n]
            text = self._row_decode(seq) if n == 2 else None
            if text is None:
                text = self._long().get(seq)
            if text is None and n == 4 and self._lin4:
                text = self._lin4_decode(seq)
            if text is not None:
                out.append(text)
                index += n
                continue
            span = self._errlen.get(seq, 1)
            text, index = _decode_error(errors, self.name, data, index,
                                        index + span, 'illegal multibyte sequence')
            out.append(text)
        return (''.join(out), index, state)

    # -- encoding -----------------------------------------------------------

    def _encode_one(self, point):
        seq = self._explicit.get(point)
        if seq is not None:
            return seq
        if point in self._refused:
            return None
        code = self._enc.get(point)
        if code is not None:
            return bytes((code >> 8, code & 0xFF))
        seq = self._long_inverse().get(point)
        if seq is None and self._lin4:
            seq = self._lin4_encode(point)
        return seq

    def encode_chunk(self, text, errors, final, state=None):
        """(bytes, consumed, state).  With final false, a trailing character
        that could still begin a two-character PAIR is held back."""
        self._build()
        self._build_encode()
        out = bytearray()
        length = len(text)
        index = 0
        pairs, starters = self._pairs, self._starters
        while index < length:
            point = ord(text[index])
            if point in starters:
                if index + 1 < length:
                    seq = pairs.get((point, ord(text[index + 1])))
                    if seq is not None:
                        out += seq
                        index += 2
                        continue
                elif not final:
                    break
            seq = self._encode_one(point)
            if seq is not None:
                out += seq
                index += 1
                continue
            end = index + 1
            replacement, index = _encode_error(errors, self.name, text, index, end)
            out += self._encode_replacement(replacement, text, index)
        return (bytes(out), index, state)

    def _encode_replacement(self, replacement, text, index):
        if isinstance(replacement, (bytes, bytearray)):
            return bytes(replacement)
        out = bytearray()
        for ch in replacement:
            seq = self._encode_one(ord(ch))
            if seq is None:
                raise UnicodeEncodeError(self.name, replacement, 0, len(replacement),
                                         'illegal multibyte sequence')
            out += seq
        return bytes(out)

    # -- whole-input entry points (MultibyteCodec.encode / .decode) ---------

    def encode(self, input, errors=None):
        if not isinstance(input, str):
            raise TypeError("couldn't convert the object to unicode.")
        result, consumed, state = self.encode_chunk(input, errors or 'strict', True,
                                                     self.initial_state())
        return (result + self.encode_flush(state), len(input))

    def decode(self, input, errors=None):
        data = _as_bytes(input)
        result, consumed, _ = self.decode_chunk(data, errors or 'strict', True,
                                                self.initial_state())
        return (result, len(data))

    def initial_state(self):
        return None

    def encode_flush(self, state):
        return b''

    def state_to_int(self, state):
        return 0

    def state_from_int(self, value):
        return None


# ------------------------------------------------------------- the registry

_STATELESS = frozenset((
    'big5', 'cp950', 'big5hkscs', 'cp932', 'shift_jis', 'euc_jp',
    'euc_jis_2004', 'euc_jisx0213', 'shift_jis_2004', 'shift_jisx0213',
    'cp949', 'euc_kr', 'johab', 'gb2312', 'gbk', 'gb18030'))

_ISO2022 = frozenset((
    'iso2022_jp', 'iso2022_jp_1', 'iso2022_jp_2', 'iso2022_jp_2004',
    'iso2022_jp_3', 'iso2022_jp_ext', 'iso2022_kr'))


def make_codec(name):
    """The engine for one CJK codec, by its CPython name."""
    if name in _STATELESS:
        return StatelessCodec(name, name)
    if name in _ISO2022:
        return Iso2022Codec(name, name)
    if name == 'hz':
        return HzCodec(name, name)
    raise LookupError('no such codec is supported.')


# ---------------------------------------------------------- stateful codecs

_ESC, _SO, _SI, _LF = 0x1B, 0x0E, 0x0F, 0x0A
_ASCII = 'B'           # the ASCII charset: what ``ESC ( B'' designates


def _is_escend(byte):
    return 0x41 <= byte <= 0x5A or byte == 0x40      # A-Z or @


class Iso2022Codec:
    """ISO-2022-JP and its variants, and ISO-2022-KR -- the structure of
    CPython's _codecs_iso2022.c, over charset tables measured from it.

    A CHARSET is named by its final byte, with a ``$`` in front for a
    two-byte set: ``B'' is ASCII, ``$B'' JIS X 0208, ``$(D''-designated JIS
    X 0212 is ``$D'', ``J'' JIS X 0201 Roman.  An escape selects a charset
    into G0, G1 or G2 by its intermediates; SO/SI invoke G1 (KR only); ESC N
    single-shifts one byte from G2 (JP-2 only).  What each charset's codes
    decode to, and which designation and code CPython's encoder chooses for
    each character, were read out of CPython by scripts/generate_cjk.py and
    verified against it with random input."""

    stateful = True

    def __init__(self, name, data_module):
        self.name = name
        self._module = data_module
        self._built = False

    def _build(self):
        """What DECODING needs.  Two-byte charsets stay as the generated row
        strings, indexed in place; encoding's tables are built on first
        encode (_build_encode) -- iso2022_jp_2 carries four two-byte sets."""
        if self._built:
            return
        d = _load(self._module)
        self._data = d
        flags = _table(d.FLAGS)
        self._shift = 'SHIFT' in flags
        self._g2 = 'G2' in flags
        self._ext = 'EXT' in flags
        widths = {}
        for item in _items(d.WIDTHS):
            name, width = item.split(':')
            widths[name] = int(width)
        rows = {}
        for item in _items(d.ROWS):
            name, lead, tmin, row = item.split(':', 3)
            rows.setdefault(name, {})[int(lead, 16)] = (int(tmin, 16), row)
        codes = {}
        for item in _items(d.CODES):
            name, code, points = item.split(':')
            codes.setdefault(name, {})[bytes.fromhex(code)] = ''.join(
                _char(int(p, 16)) for p in points.split(' '))
        self._charsets = {name: (width, rows.get(name, {}), codes.get(name, {}))
                          for name, width in widths.items()}
        g2 = {}
        for item in _items(d.G2TABLES):
            name, body = item.split(':', 1)
            table = {}
            for entry in body.split(','):
                if entry:
                    code, point = entry.split('=')
                    table[int(code, 16)] = _char(int(point, 16))
            g2[name] = table
        self._g2tables = g2
        self._internal = frozenset(int(x, 16) for x in _items(d.INTERNAL))
        self._enc = None
        self._built = True

    def _lookup(self, charset, code):
        width, rows, codes = self._charsets[charset]
        hit = codes.get(code)
        if hit is not None:
            return hit
        if width == 2:
            row = rows.get(code[0])
            if row is not None:
                k = code[1] - row[0]
                if 0 <= k < len(row[1]):
                    ch = row[1][k]
                    if ch != _SENTINEL:
                        return ch
        return None

    def _build_encode(self):
        """The encoder's choice for every character: for each designation in
        CPython's preference order (ORDER), the inverse of its charset, then
        the generator's explicit entries where CPython chooses otherwise, and
        the characters it refuses.  Sequences are held as ints until used."""
        if self._enc is not None:
            return
        d = self._data
        enc = {}
        for key in _table(d.ORDER).split(','):
            if not key:
                continue
            width, rows, codes = self._charsets[self._charset_of(key)]
            for lead, (tmin, row) in rows.items():
                base = (lead << 8) | tmin
                for k, ch in enumerate(row):
                    if ch != _SENTINEL:
                        enc.setdefault(ord(ch), (key, base + k))
            for code, text in codes.items():
                if len(text) == 1:
                    value = code[0] if width == 1 else (code[0] << 8) | code[1]
                    enc.setdefault(ord(text), (key, value))
        widths = {}
        for key in _table(d.ORDER).split(','):
            if key:
                widths[key] = self._charsets[self._charset_of(key)][0]
        for item in _items(d.ENC):
            point, key, code = item.split(':')
            enc[int(point, 16)] = (key, bytes.fromhex(code))
        for item in _items(d.NOENC):
            enc.pop(int(item, 16), None)
        self._key_widths = widths
        pairs = {}
        for item in _items(d.PAIRS):
            points, key, code = item.split(':')
            first, second = points.split(' ')
            pairs[(int(first, 16), int(second, 16))] = (key, bytes.fromhex(code))
        self._pairs = pairs
        self._starters = frozenset(first for first, _ in pairs)
        self._enc = enc

    # State: (g0, g1, g2, shifted, escape-through), charsets by name.

    def initial_state(self):
        return (_ASCII, _ASCII, _ASCII, False, False)

    def _names(self):
        return [_ASCII] + sorted(self._charsets)

    def state_to_int(self, state):
        self._build()
        names = self._names()
        g0, g1, g2, shifted, through = state or self.initial_state()
        return (names.index(g0) | (names.index(g1) << 8) | (names.index(g2) << 16)
                | (int(shifted) << 24) | (int(through) << 25))

    def state_from_int(self, value):
        self._build()
        names = self._names()
        value = int(value)
        return (names[value & 0xFF], names[(value >> 8) & 0xFF], names[(value >> 16) & 0xFF],
                bool((value >> 24) & 1), bool((value >> 25) & 1))

    # -- decoding -----------------------------------------------------------

    def _process_escape(self, data, index):
        """('ok', length, plane, charset), ('toofew',) or ('err', length):
        CPython's iso2022processesc."""
        length = len(data)
        esclen = 0
        i = 1
        while i < 16:
            if index + i >= length:
                return ('toofew',)
            byte = data[index + i]
            if _is_escend(byte):
                esclen = i + 1
                break
            if (self._ext and index + i + 1 < length and byte == 0x26
                    and data[index + i + 1] == 0x40):
                i += 2
            i += 1
        if i >= 16:
            return ('err', 1)
        b2 = data[index + 1]
        if esclen == 3:
            if b2 == 0x24:
                charset, plane = '$' + chr(data[index + 2]), 0
            else:
                charset = chr(data[index + 2])
                if b2 == 0x28:
                    plane = 0
                elif b2 == 0x29:
                    plane = 1
                elif self._g2 and b2 == 0x2E:
                    plane = 2
                else:
                    return ('err', 3)
        elif esclen == 4:
            if b2 != 0x24:
                return ('err', 4)
            charset = '$' + chr(data[index + 3])
            b3 = data[index + 2]
            if b3 == 0x28:
                plane = 0
            elif b3 == 0x29:
                plane = 1
            else:
                return ('err', 4)
        elif esclen == 6:
            if (self._ext and data[index + 3] == _ESC and data[index + 4] == 0x24
                    and data[index + 5] == 0x42):
                charset, plane = '$B', 0
            else:
                return ('err', 6)
        else:
            return ('err', esclen)
        if charset != _ASCII and charset not in self._charsets:
            return ('err', esclen)
        return ('ok', esclen, plane, charset)

    def decode_chunk(self, data, errors, final, state=None):
        self._build()
        g0, g1, g2, shifted, through = state or self.initial_state()
        out = []
        length = len(data)
        index = 0

        def error(start, end, reason):
            text, resume = _decode_error(errors, self.name, data, start, end, reason)
            out.append(text)
            return resume

        while index < length:
            c = data[index]
            if through:
                # after an escape Grail does not know: pass bytes through, as
                # Latin-1, until one that could end an escape
                out.append(chr(c))
                index += 1
                if _is_escend(c):
                    through = False
                continue
            if c == _ESC:
                if index + 1 >= length:
                    if not final:
                        break
                    index = error(index, length, 'incomplete multibyte sequence')
                    continue
                c2 = data[index + 1]
                if c2 in (0x28, 0x29, 0x24, 0x2E, 0x26):
                    result = self._process_escape(data, index)
                    if result[0] == 'toofew':
                        if not final:
                            break
                        index = error(index, length, 'incomplete multibyte sequence')
                    elif result[0] == 'err':
                        index = error(index, index + result[1], 'illegal multibyte sequence')
                    else:
                        _, esclen, plane, charset = result
                        if plane == 0:
                            g0 = charset
                        elif plane == 1:
                            g1 = charset
                        else:
                            g2 = charset
                        index += esclen
                    continue
                if self._g2 and c2 == 0x4E:
                    if index + 2 >= length:
                        if not final:
                            break
                        index = error(index, length, 'incomplete multibyte sequence')
                        continue
                    b3 = data[index + 2]
                    if g2 == _ASCII:
                        ch = None if b3 & 0x80 else chr(b3)
                    elif g2 in self._g2tables:
                        ch = self._g2tables[g2].get(b3)
                    else:
                        raise RuntimeError('internal codec error')
                    if ch is None:
                        index = error(index, index + 3, 'illegal multibyte sequence')
                        continue
                    out.append(ch)
                    index += 3
                    continue
                out.append('\x1b')
                through = True
                index += 1
                continue
            if self._shift and c in (_SO, _SI):
                shifted = c == _SO
                index += 1
                continue
            if c == _LF:
                shifted = False
                out.append('\n')
                index += 1
                continue
            if c < 0x20:
                out.append(chr(c))
                index += 1
                continue
            if c >= 0x80:
                index = error(index, index + 1, 'illegal multibyte sequence')
                continue
            charset = g1 if shifted else g0
            if charset == _ASCII:
                out.append(chr(c))
                index += 1
                continue
            width = self._charsets[charset][0]
            if index + width > length:
                if not final:
                    break
                index = error(index, length, 'incomplete multibyte sequence')
                continue
            ch = self._lookup(charset, data[index:index + width])
            if ch is None:
                index = error(index, index + width, 'illegal multibyte sequence')
                continue
            out.append(ch)
            index += width
        return (''.join(out), index, (g0, g1, g2, shifted, through))

    # -- encoding -----------------------------------------------------------

    @staticmethod
    def _charset_of(key):
        """The charset an escape designates, from its text after ESC."""
        return ('$' if key[0] == '$' else '') + key[-1]

    def _emit(self, out, state, key, code):
        g0, g1, g2, shifted, through = state
        if key is None:                          # ASCII
            if g0 != _ASCII:
                out += b'\x1b(B'
                g0 = _ASCII
            if shifted:
                out.append(_SI)
                shifted = False
            out += code
            return (g0, g1, g2, shifted, through)
        charset = self._charset_of(key)
        g1_designation = key[:2] == '$)' or key[0] == ')'
        if not g1_designation:
            if shifted:
                out.append(_SI)
                shifted = False
            if g0 != charset:
                out += b'\x1b' + key.encode('ascii')
                g0 = charset
        else:
            if g1 != charset:
                out += b'\x1b' + key.encode('ascii')
                g1 = charset
            if not shifted:
                out.append(_SO)
                shifted = True
        out += code
        return (g0, g1, g2, shifted, through)

    def _encode_point(self, point):
        if point < 0x80:
            return (None, bytes((point,)))
        if point in self._internal:
            raise RuntimeError('internal codec error')
        hit = self._enc.get(point)
        if hit is None or isinstance(hit[1], bytes):
            return hit
        key, value = hit
        if self._key_widths[key] == 1:
            return (key, bytes((value,)))
        return (key, bytes((value >> 8, value & 0xFF)))

    def encode_chunk(self, text, errors, final, state=None):
        self._build()
        self._build_encode()
        state = state or self.initial_state()
        out = bytearray()
        length = len(text)
        index = 0
        while index < length:
            point = ord(text[index])
            if point in self._starters:
                if index + 1 < length:
                    hit = self._pairs.get((point, ord(text[index + 1])))
                    if hit is not None:
                        state = self._emit(out, state, hit[0], hit[1])
                        index += 2
                        continue
                elif not final:
                    break
            hit = self._encode_point(point)
            if hit is not None:
                state = self._emit(out, state, hit[0], hit[1])
                index += 1
                continue
            replacement, index = _encode_error(errors, self.name, text, index, index + 1)
            if isinstance(replacement, (bytes, bytearray)):
                out += replacement
                continue
            for ch in replacement:
                hit = self._encode_point(ord(ch))
                if hit is None:
                    raise UnicodeEncodeError(self.name, replacement, 0, len(replacement),
                                             'illegal multibyte sequence')
                state = self._emit(out, state, hit[0], hit[1])
        return (bytes(out), index, state)

    def encode_flush(self, state):
        g0, g1, g2, shifted, through = state or self.initial_state()
        out = bytearray()
        if shifted:
            out.append(_SI)
        if g0 != _ASCII:
            out += b'\x1b(B'
        return bytes(out)

    def encode(self, input, errors=None):
        if not isinstance(input, str):
            raise TypeError("couldn't convert the object to unicode.")
        result, consumed, state = self.encode_chunk(input, errors or 'strict', True,
                                                     self.initial_state())
        return (result + self.encode_flush(state), len(input))

    def decode(self, input, errors=None):
        data = _as_bytes(input)
        result, consumed, _ = self.decode_chunk(data, errors or 'strict', True,
                                                self.initial_state())
        return (result, len(data))


# ----------------------------------------------------------------------- HZ

class HzCodec:
    """HZ (RFC 1843): ASCII by default, ``~{'' into GB2312 mode and ``~}''
    back, ``~~'' a literal tilde, ``~<newline>'' a line continuation -- the
    structure of CPython's _codecs_cn.c hz decoder and encoder, over the
    GB2312 table measured from it."""

    stateful = True

    def __init__(self, name, data_module):
        self.name = name
        self._module = data_module
        self._built = False

    def _build(self):
        if self._built:
            return
        d = _load(self._module)
        self._data = d
        rows = {}
        for item in _items(d.ROWS):
            lead, tmin, row = item.split(':', 2)
            rows[int(lead, 16)] = (int(tmin, 16), row)
        self._rows = rows
        self._enc = None
        self._built = True

    def _lookup(self, code):
        row = self._rows.get(code[0])
        if row is not None:
            k = code[1] - row[0]
            if 0 <= k < len(row[1]):
                ch = row[1][k]
                if ch != _SENTINEL:
                    return ch
        return None

    def _build_encode(self):
        if self._enc is not None:
            return
        enc = {}
        for lead, (tmin, row) in self._rows.items():
            base = (lead << 8) | tmin
            for k, ch in enumerate(row):
                if ch != _SENTINEL:
                    enc.setdefault(ord(ch), base + k)
        for item in _items(self._data.ENC):
            point, code = item.split(':')
            enc[int(point, 16)] = int(code, 16)
        for item in _items(self._data.NOENC):
            enc.pop(int(item, 16), None)
        self._enc = enc

    def initial_state(self):
        return False            # in GB mode?

    def state_to_int(self, state):
        return int(bool(state))

    def state_from_int(self, value):
        return bool(int(value) & 1)

    def decode_chunk(self, data, errors, final, state=None):
        self._build()
        gb = bool(state)
        out = []
        length = len(data)
        index = 0
        while index < length:
            c = data[index]
            if c == 0x7E:                                   # '~'
                if index + 1 >= length:
                    if not final:
                        break
                    text, index = _decode_error(errors, self.name, data, index, length,
                                                'incomplete multibyte sequence')
                    out.append(text)
                    continue
                c2 = data[index + 1]
                if c2 == 0x7E and not gb:
                    out.append('~')
                elif c2 == 0x7B and not gb:                 # '~{'
                    gb = True
                elif c2 == 0x0A and not gb:                 # line continuation
                    pass
                elif c2 == 0x7D and gb:                     # '~}'
                    gb = False
                else:
                    text, index = _decode_error(errors, self.name, data, index, index + 1,
                                                'illegal multibyte sequence')
                    out.append(text)
                    continue
                index += 2
                continue
            if c & 0x80:
                text, index = _decode_error(errors, self.name, data, index, index + 1,
                                            'illegal multibyte sequence')
                out.append(text)
                continue
            if not gb:
                out.append(chr(c))
                index += 1
                continue
            if index + 1 >= length:
                if not final:
                    break
                text, index = _decode_error(errors, self.name, data, index, length,
                                            'incomplete multibyte sequence')
                out.append(text)
                continue
            ch = self._lookup(data[index:index + 2])
            if ch is None:
                text, index = _decode_error(errors, self.name, data, index, index + 1,
                                            'illegal multibyte sequence')
                out.append(text)
                continue
            out.append(ch)
            index += 2
        return (''.join(out), index, gb)

    def _encode_into(self, out, gb, point):
        """Append one character's bytes; answers the new mode, or None if it
        is not encodable."""
        if point < 0x80:
            if gb:
                out += b'~}'
                gb = False
            out.append(point)
            if point == 0x7E:
                out.append(0x7E)
            return gb
        code = self._enc.get(point)
        if code is None:
            return None
        if not gb:
            out += b'~{'
        out.append(code >> 8)
        out.append(code & 0xFF)
        return True

    def encode_chunk(self, text, errors, final, state=None):
        self._build()
        self._build_encode()
        gb = bool(state)
        out = bytearray()
        length = len(text)
        index = 0
        while index < length:
            mode = self._encode_into(out, gb, ord(text[index]))
            if mode is not None:
                gb = mode
                index += 1
                continue
            replacement, index = _encode_error(errors, self.name, text, index, index + 1)
            if isinstance(replacement, (bytes, bytearray)):
                out += replacement
                continue
            for ch in replacement:
                mode = self._encode_into(out, gb, ord(ch))
                if mode is None:
                    raise UnicodeEncodeError(self.name, replacement, 0, len(replacement),
                                             'illegal multibyte sequence')
                gb = mode
        return (bytes(out), index, gb)

    def encode_flush(self, state):
        return b'~}' if state else b''

    def encode(self, input, errors=None):
        if not isinstance(input, str):
            raise TypeError("couldn't convert the object to unicode.")
        result, consumed, state = self.encode_chunk(input, errors or 'strict', True, False)
        return (result + self.encode_flush(state), len(input))

    def decode(self, input, errors=None):
        data = _as_bytes(input)
        result, consumed, _ = self.decode_chunk(data, errors or 'strict', True, False)
        return (result, len(data))
