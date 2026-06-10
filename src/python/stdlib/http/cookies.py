# Grail ``http.cookies`` — a functional subset of the stdlib module.
#
# Provides ``BaseCookie``, ``SimpleCookie`` and ``Morsel`` with the
# public API CPython exposes: dict-like cookie containers whose values
# are ``Morsel`` objects carrying the reserved cookie attributes
# (path, domain, expires, max-age, secure, httponly, samesite, ...),
# plus ``output()`` / ``js_output()`` rendering and ``load()`` parsing
# of ``Cookie:`` / ``Set-Cookie:`` header strings.
#
# # Hand-rolled, not the CPython source drop
# Upstream ``http/cookies.py`` parses with a single large regular
# expression (``_CookiePattern``) and quotes via ``str.translate`` with
# a 256-entry table.  Following the same philosophy as Grail's
# hand-rolled ``http.client`` / ``http.server`` (cookie header syntax
# is simple enough to scan inline), this implementation parses with a
# small character scanner and quotes with an explicit octal escaper —
# no dependency on the ``re`` module.
#
# Deviations from CPython:
#   * ``expires`` set as an integer (seconds-from-now) is emitted
#     verbatim rather than converted to an RFC date string (no ``time``
#     dependency); set ``expires`` as a preformatted string instead.
#   * Pickling hooks (``__getstate__`` / ``__setstate__``) are omitted.

__all__ = ['CookieError', 'BaseCookie', 'SimpleCookie']


class CookieError(Exception):
    pass


# Characters that do not need to be quoted in a cookie value.  Matches
# CPython's ``_LegalChars`` (ascii letters + digits + a punctuation set).
_LEGAL_CHARS = ('abcdefghijklmnopqrstuvwxyz'
                'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
                '0123456789'
                "!#$%&'*+-.^_`|~:")

# Characters left untranslated inside a quoted value (the rest become
# ``\\nnn`` octal escapes).  Matches CPython's ``_UnescapedChars``.
_UNESCAPED_CHARS = _LEGAL_CHARS + ' ()/<=>?@[]{}'

_WHITESPACE = ' \t\r\n'
_OCTAL_DIGITS = '01234567'


def _is_legal_value(value):
    """True if every char of a non-empty value is a legal cookie char
    (so the value can be emitted without surrounding doublequotes)."""
    if len(value) == 0:
        return False
    for ch in value:
        if ch not in _LEGAL_CHARS:
            return False
    return True


def _oct_escape(code):
    """Return ``\\nnn`` (three octal digits) for a byte value 0..255."""
    return ('\\'
            + _OCTAL_DIGITS[(code >> 6) & 7]
            + _OCTAL_DIGITS[(code >> 3) & 7]
            + _OCTAL_DIGITS[code & 7])


def _quote(value):
    """Quote a string for use as a cookie value.  Returns it unchanged
    when no quoting is needed, otherwise wraps it in doublequotes and
    escapes special characters."""
    if value is None or _is_legal_value(value):
        return value
    out = []
    for ch in value:
        if ch in _UNESCAPED_CHARS:
            out.append(ch)
        elif ch == '"':
            out.append('\\"')
        elif ch == '\\':
            out.append('\\\\')
        else:
            out.append(_oct_escape(ord(ch)))
    return '"' + ''.join(out) + '"'


def _is_octal_triple(s, j):
    """True if s[j:j+3] is three octal digits with s[j] in 0..3."""
    if j + 2 >= len(s):
        return False
    if s[j] not in '0123':
        return False
    if s[j + 1] not in _OCTAL_DIGITS:
        return False
    if s[j + 2] not in _OCTAL_DIGITS:
        return False
    return True


def _unquote(value):
    """Inverse of :func:`_quote`.  Strips surrounding doublequotes and
    decodes ``\\nnn`` octal / ``\\c`` character escapes."""
    if value is None or len(value) < 2:
        return value
    if value[0] != '"' or value[len(value) - 1] != '"':
        return value
    inner = value[1:len(value) - 1]
    out = []
    i = 0
    n = len(inner)
    while i < n:
        ch = inner[i]
        if ch != '\\':
            out.append(ch)
            i = i + 1
        elif _is_octal_triple(inner, i + 1):
            code = ((ord(inner[i + 1]) - 48) * 64
                    + (ord(inner[i + 2]) - 48) * 8
                    + (ord(inner[i + 3]) - 48))
            out.append(chr(code))
            i = i + 4
        elif i + 1 < n:
            out.append(inner[i + 1])
            i = i + 2
        else:
            out.append(ch)
            i = i + 1
    return ''.join(out)


def _parse_cookie_items(s):
    """Scan a ``Cookie:`` / ``Set-Cookie:`` header value into a list of
    ``(key, raw_value_or_None)`` pairs.  Quoted values keep their
    surrounding doublequotes (the caller unquotes); a bare attribute
    with no ``=`` yields ``None``.  Replaces CPython's regex scan."""
    items = []
    i = 0
    n = len(s)
    while i < n:
        # Skip leading whitespace and stray separators.
        while i < n and (s[i] in _WHITESPACE or s[i] == ';' or s[i] == ','):
            i = i + 1
        if i >= n:
            break
        # Read the key: up to '=', ';', ',' or whitespace.
        start = i
        while i < n and s[i] != '=' and s[i] != ';' and s[i] != ',' and s[i] not in _WHITESPACE:
            i = i + 1
        key = s[start:i]
        if len(key) == 0:
            i = i + 1
            continue
        # Optional whitespace, then optional '= value'.
        while i < n and s[i] in _WHITESPACE:
            i = i + 1
        value = None
        if i < n and s[i] == '=':
            i = i + 1
            while i < n and s[i] in _WHITESPACE:
                i = i + 1
            if i < n and s[i] == '"':
                # Quoted value: capture raw substring including quotes.
                qstart = i
                i = i + 1
                while i < n:
                    c = s[i]
                    if c == '\\':
                        i = i + 2
                        continue
                    if c == '"':
                        i = i + 1
                        break
                    i = i + 1
                value = s[qstart:i]
            else:
                vstart = i
                while i < n and s[i] != ';' and s[i] != ',' and s[i] not in _WHITESPACE:
                    i = i + 1
                value = s[vstart:i]
        items.append((key, value))
    return items


class Morsel(dict):
    """A single cookie: its key / value / coded value plus the reserved
    RFC 2109 / RFC 6265 attributes, stored dict-style."""

    # attribute key (lowercase) -> output spelling
    _reserved = {
        'expires': 'expires',
        'path': 'Path',
        'comment': 'Comment',
        'domain': 'Domain',
        'max-age': 'Max-Age',
        'secure': 'Secure',
        'httponly': 'HttpOnly',
        'version': 'Version',
        'samesite': 'SameSite',
    }

    # attributes rendered as a bare flag (no ``=value``)
    _flags = ('secure', 'httponly')

    def __init__(self):
        # key / value / coded_value are plain attributes.  CPython makes
        # them read-only properties, but Grail does not invoke the
        # descriptor protocol for attribute loads on a dict subclass, so
        # @property getters would leak the bound method instead of the
        # value.  Direct attributes read correctly; the (minor) cost is
        # that they are writable here.
        self.key = None
        self.value = None
        self.coded_value = None
        for rkey in self._reserved:
            dict.__setitem__(self, rkey, '')

    def __setitem__(self, K, V):
        K = K.lower()
        if K not in self._reserved:
            raise CookieError('Invalid attribute %s' % K)
        dict.__setitem__(self, K, V)

    def setdefault(self, key, val=None):
        key = key.lower()
        if key not in self._reserved:
            raise CookieError('Invalid attribute %s' % key)
        return dict.setdefault(self, key, val)

    def __eq__(self, morsel):
        if not isinstance(morsel, Morsel):
            return False
        if self.key != morsel.key:
            return False
        if self.value != morsel.value:
            return False
        if self.coded_value != morsel.coded_value:
            return False
        for k in self._reserved:
            if dict.get(self, k) != dict.get(morsel, k):
                return False
        return True

    def __ne__(self, morsel):
        return not self.__eq__(morsel)

    def copy(self):
        morsel = Morsel()
        for k in self._reserved:
            dict.__setitem__(morsel, k, dict.get(self, k))
        morsel.key = self.key
        morsel.value = self.value
        morsel.coded_value = self.coded_value
        return morsel

    def update(self, values):
        data = {}
        for key in values:
            lkey = key.lower()
            if lkey not in self._reserved:
                raise CookieError('Invalid attribute %s' % key)
            data[lkey] = values[key]
        dict.update(self, data)

    def isReservedKey(self, K):
        return K.lower() in self._reserved

    def set(self, key, val, coded_val):
        self.key = key
        self.value = val
        self.coded_value = coded_val

    def output(self, attrs=None, header='Set-Cookie:'):
        return '%s %s' % (header, self.OutputString(attrs))

    def __str__(self):
        return self.output()

    def __repr__(self):
        return '<%s: %s>' % (self.__class__.__name__, self.OutputString())

    def js_output(self, attrs=None):
        return ('\n        <script type="text/javascript">\n'
                '        <!-- begin hiding\n'
                '        document.cookie = "%s";\n'
                '        // end hiding -->\n'
                '        </script>\n        ' %
                self.OutputString(attrs).replace('"', '\\"'))

    def OutputString(self, attrs=None):
        result = []
        result.append('%s=%s' % (self.key, self.coded_value))
        if attrs is None:
            attrs = self._reserved
        for key in sorted(self.keys()):
            value = self[key]
            if value == '':
                continue
            if key not in attrs:
                continue
            if key == 'max-age' and isinstance(value, int):
                result.append('%s=%d' % (self._reserved[key], value))
            elif key == 'comment' and isinstance(value, str):
                result.append('%s=%s' % (self._reserved[key], _quote(value)))
            elif key in self._flags:
                if value:
                    result.append(self._reserved[key])
            else:
                result.append('%s=%s' % (self._reserved[key], value))
        return '; '.join(result)


class BaseCookie(dict):
    """A container of ``Morsel`` objects keyed by cookie name.  Subclass
    and override ``value_encode`` / ``value_decode`` to control how a
    Python value maps to a cookie's real and on-the-wire forms."""

    def __init__(self, input=None):
        if input:
            self.load(input)

    def value_decode(self, val):
        """(real_value, coded_value) from an on-the-wire value.  The
        base class does no decoding."""
        return val, val

    def value_encode(self, val):
        """(real_value, coded_value) from a Python value.  The base
        class does no encoding beyond ``str()``."""
        strval = str(val)
        return strval, strval

    def _set(self, key, real_value, coded_value):
        M = self.get(key, None)
        if M is None:
            M = Morsel()
        M.set(key, real_value, coded_value)
        dict.__setitem__(self, key, M)

    def __setitem__(self, key, value):
        rval, cval = self.value_encode(value)
        self._set(key, rval, cval)

    def output(self, attrs=None, header='Set-Cookie:', sep='\r\n'):
        result = []
        for key in sorted(self.keys()):
            result.append(self[key].output(attrs, header))
        return sep.join(result)

    def __str__(self):
        return self.output()

    def __repr__(self):
        items = []
        for key in sorted(self.keys()):
            items.append('%s=%s' % (key, repr(self[key].value)))
        return '<%s: %s>' % (self.__class__.__name__, ' '.join(items))

    def js_output(self, attrs=None):
        result = []
        for key in sorted(self.keys()):
            result.append(self[key].js_output(attrs))
        return ''.join(result)

    def load(self, rawdata):
        """Populate from a header string or a name->value dict."""
        if isinstance(rawdata, str):
            self._parse_string(rawdata)
        else:
            for key in rawdata:
                self[key] = rawdata[key]
        return

    def _parse_string(self, rawstr):
        items = _parse_cookie_items(rawstr)
        # First pass: classify into attribute / key-value events,
        # mirroring CPython's two-phase apply so an attribute only
        # attaches once a morsel has been seen.
        parsed = []
        morsel_seen = False
        for key, value in items:
            if key[0] == '$':
                if not morsel_seen:
                    continue
                parsed.append(('attr', key[1:], value))
            elif key.lower() in Morsel._reserved:
                if not morsel_seen:
                    continue
                if value is None:
                    if key.lower() in Morsel._flags:
                        parsed.append(('attr', key, True))
                    else:
                        return
                else:
                    parsed.append(('attr', key, _unquote(value)))
            elif value is not None:
                rval, cval = self.value_decode(value)
                parsed.append(('kv', key, (rval, cval)))
                morsel_seen = True
            else:
                return
        # Second pass: build morsels and attach attributes.
        M = None
        for tp, key, value in parsed:
            if tp == 'attr':
                if M is None:
                    continue
                M[key] = value
            else:
                rval, cval = value
                self._set(key, rval, cval)
                M = self[key]
        return


class SimpleCookie(BaseCookie):
    """The common cookie type: values are quoted on output and unquoted
    on input."""

    def value_decode(self, val):
        return _unquote(val), val

    def value_encode(self, val):
        strval = str(val)
        return strval, _quote(strval)
