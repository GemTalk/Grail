# Unicode Character Database queries over GENERATED tables.
#
# One ``Database`` per UCD version, built from a data module that
# scripts/generate_ucd.py writes from the tables of the CPython that runs it.
# Only Unicode 3.2.0 is generated today, as ``unicodedata.ucd_3_2_0``: it is
# what ``stringprep`` and ``encodings.idna`` are specified against (RFC 3454 /
# RFC 3490 freeze it), and until it existed Grail had no IDNA codec at all.
#
# The generator VERIFIES this module against CPython before it writes a byte:
# category, bidirectional, combining and decomposition for every code point,
# and all four normalization forms of every code point plus a batch of random
# mixed strings.  So a change here that makes an answer differ from CPython is
# caught by regenerating, not by a test that happens to probe the difference.
#
# Written to run under BOTH CPython (for that check) and Grail, which is why
# it sticks to the plainest constructs: dicts, lists, bisect.

import bisect

_SBASE, _LBASE, _VBASE, _TBASE = 0xAC00, 0x1100, 0x1161, 0x11A7
_LCOUNT, _VCOUNT, _TCOUNT = 19, 21, 28
_NCOUNT = _VCOUNT * _TCOUNT
_SCOUNT = _LCOUNT * _NCOUNT


def _char(point):
    """chr(point), including a lone surrogate.  Grail's chr() refuses one on
    purpose (a GemStone string cannot hold it); the surrogatepass decoder is
    the path that builds one.  Normalization passes a surrogate through
    unchanged, and nameprep normalizes BEFORE its RFC 3454 table C.5 check
    rejects the string -- so without this the refusal never got to run."""
    if 0xD800 <= point <= 0xDFFF:
        return bytes((point & 0xFF, point >> 8)).decode('utf-16-le', 'surrogatepass')
    return chr(point)


def _text(table):
    """A generated table: one string, or a tuple of chunks of one (see
    generate_ucd.py for why they are chunked)."""
    if isinstance(table, tuple):
        return ''.join(table)
    return table


def _ranges(text):
    """``start:value;...`` (start in hex) -> (starts, values) for bisect."""
    text = _text(text)
    starts, values = [], []
    for item in text.split(';'):
        if item:
            start, value = item.split(':')
            starts.append(int(start, 16))
            values.append(value)
    return starts, values


class Database:
    """The queries ``unicodedata`` answers, for one UCD version."""

    def __init__(self, data):
        self.unidata_version = data.VERSION
        self._data = data
        self._built = False

    def _build(self):
        if self._built:
            return
        data = self._data
        self._cat_starts, self._cat_values = _ranges(data.CATEGORY)
        self._bidi_starts, self._bidi_values = _ranges(data.BIDI)
        self._ccc_starts, ccc = _ranges(data.COMBINING)
        self._ccc_values = [int(v) for v in ccc]
        # The classes NORMALIZATION uses, which for 3.2.0 are not the ones
        # combining() reports: CPython normalizes with the current database's
        # classes, so a character unassigned in 3.2.0 (combining() 0) still
        # reorders as the mark it later became (U+A9C0).
        self._norm_starts, norm = _ranges(data.NORM_COMBINING)
        self._norm_values = [int(v) for v in norm]
        decomp = {}
        for item in _text(data.DECOMPOSITION).split(';'):
            if item:
                point, text = item.split(':')
                decomp[int(point, 16)] = text
        self._decomp = decomp
        # The FULL expansions normalization uses.  Stored rather than
        # rebuilt from the table above: CPython's 3.2.0 normalization applies
        # the Unicode normalization corrections, so for a handful of CJK
        # compatibility ideographs it disagrees with decomposition().
        self._canon = self._expansions(data.NFD)
        self._compat = self._expansions(data.NFKD)
        compose = {}
        for item in _text(data.COMPOSITION).split(';'):
            if item:
                first, second, composite = item.split(' ')
                compose[(int(first, 16), int(second, 16))] = int(composite, 16)
        self._compose = compose
        self._built = True

    @staticmethod
    def _expansions(text):
        table = {}
        for item in _text(text).split(';'):
            if item:
                point, points = item.split(':')
                table[int(point, 16)] = [int(p, 16) for p in points.split(' ')]
        return table

    @staticmethod
    def _lookup(starts, values, point):
        return values[bisect.bisect_right(starts, point) - 1]

    @staticmethod
    def _point(ch, what):
        if not isinstance(ch, str) or len(ch) != 1:
            raise TypeError('%s() argument must be a unicode character, not %s'
                            % (what, type(ch).__name__))
        return ord(ch)

    def category(self, ch):
        self._build()
        return self._lookup(self._cat_starts, self._cat_values,
                            self._point(ch, 'category'))

    def bidirectional(self, ch):
        self._build()
        return self._lookup(self._bidi_starts, self._bidi_values,
                            self._point(ch, 'bidirectional'))

    def combining(self, ch):
        self._build()
        return self._ccc(self._point(ch, 'combining'))  # reporting: 3.2.0

    def _ccc(self, point):
        return self._lookup(self._ccc_starts, self._ccc_values, point)

    def _norm_ccc(self, point):
        return self._lookup(self._norm_starts, self._norm_values, point)

    def decomposition(self, ch):
        self._build()
        return self._decomp.get(self._point(ch, 'decomposition'), '')

    # -- normalization (UAX #15) ------------------------------------------

    def _decompose(self, points, compat):
        table = self._compat if compat else self._canon
        out = []
        for point in points:
            if _SBASE <= point < _SBASE + _SCOUNT:
                index = point - _SBASE
                out.append(_LBASE + index // _NCOUNT)
                out.append(_VBASE + (index % _NCOUNT) // _TCOUNT)
                if index % _TCOUNT:
                    out.append(_TBASE + index % _TCOUNT)
                continue
            mapped = table.get(point)
            if mapped is None:
                out.append(point)
            else:
                out.extend(mapped)       # already the full expansion
        # Canonical ordering: a stable sort of each run of non-starters by
        # combining class.
        index = 0
        length = len(out)
        while index < length:
            if self._norm_ccc(out[index]) == 0:
                index += 1
                continue
            end = index
            while end < length and self._norm_ccc(out[end]) != 0:
                end += 1
            run = out[index:end]
            run.sort(key=self._norm_ccc)
            out[index:end] = run
            index = end
        return out

    def _pair(self, first, second):
        """The primary composite of two code points, or None."""
        if (_LBASE <= first < _LBASE + _LCOUNT
                and _VBASE <= second < _VBASE + _VCOUNT):
            return (_SBASE + ((first - _LBASE) * _VCOUNT
                              + (second - _VBASE)) * _TCOUNT)
        if (_SBASE <= first < _SBASE + _SCOUNT
                and (first - _SBASE) % _TCOUNT == 0
                and _TBASE < second < _TBASE + _TCOUNT):
            return first + (second - _TBASE)
        return self._compose.get((first, second))

    def _compose_points(self, points):
        """Canonical composition, UAX #15's reference algorithm: a character
        joins the last starter unless something between them is BLOCKING
        (a non-starter of equal or higher class, or any starter)."""
        if not points:
            return []
        result = [points[0]]
        starter_pos = 0
        starter = points[0]
        last_class = self._norm_ccc(starter)
        if last_class != 0:
            last_class = 256        # a leading non-starter blocks everything
        for point in points[1:]:
            point_class = self._norm_ccc(point)
            composite = self._pair(starter, point)
            if composite is not None and (last_class < point_class or last_class == 0):
                result[starter_pos] = composite
                starter = composite
                continue
            if point_class == 0:
                starter_pos = len(result)
                starter = point
            last_class = point_class
            result.append(point)
        return result

    def normalize(self, form, text):
        if not isinstance(form, str):
            raise TypeError('normalize() argument 1 must be str, not %s'
                            % type(form).__name__)
        if not isinstance(text, str):
            raise TypeError('normalize() argument 2 must be str, not %s'
                            % type(text).__name__)
        if form not in ('NFC', 'NFD', 'NFKC', 'NFKD'):
            raise ValueError('invalid normalization form')
        self._build()
        points = self._decompose([ord(c) for c in text], form in ('NFKC', 'NFKD'))
        if form in ('NFC', 'NFKC'):
            points = self._compose_points(points)
        return ''.join(_char(p) for p in points)

    def is_normalized(self, form, text):
        return self.normalize(form, text) == text


_databases = {}


def database(data):
    """The one Database for a data module, built on first use and cached
    here: parsing the tables costs a few hundred milliseconds, and most
    sessions never ask for 3.2.0 at all."""
    db = _databases.get(data.VERSION)
    if db is None:
        db = Database(data)
        _databases[data.VERSION] = db
    return db
