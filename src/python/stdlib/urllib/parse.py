# Minimal `urllib.parse` for Grail.  Implements the surface Jinja2
# (and downstream Werkzeug) reach for: `quote`, `quote_from_bytes`,
# `quote_plus`, `unquote`, `unquote_plus`, `urlencode`, plus the
# `urlparse` / `urlsplit` / `urlunparse` / `urljoin` skeletons.
#
# Hand-rolled rather than ported wholesale — the CPython module is
# ~1100 lines with internal C-level helpers Grail can't import.

import string as _string


_ALWAYS_SAFE = frozenset(
    _string.ascii_letters + _string.digits + "_.-~"
)


# Module-level scheme registries — CPython exposes these so apps
# can declare custom schemes that participate in netloc / relative-
# URL / fragment handling.  Werkzeug.urls appends ``itms-services''
# to ``uses_netloc'' at import time to make iOS install links round-
# trip through urlsplit.  Grail's lightweight urlsplit doesn't
# consult these lists for behavior, but the read/append surface
# needs to exist for downstream imports.
uses_relative = [
    'ftp', 'http', 'gopher', 'nntp', 'imap', 'wais', 'file',
    'https', 'shttp', 'mms', 'prospero', 'rtsp', 'rtspu', 'sftp',
    'svn', 'svn+ssh', 'ws', 'wss',
]
uses_netloc = [
    'ftp', 'http', 'gopher', 'nntp', 'telnet', 'imap', 'wais',
    'file', 'mms', 'https', 'shttp', 'snews', 'prospero', 'rtsp',
    'rtspu', 'rsync', 'svn', 'svn+ssh', 'sftp', 'nfs', 'git',
    'git+ssh', 'ws', 'wss',
]
uses_fragment = list(uses_relative)


def _safe_set(safe):
    if isinstance(safe, bytes):
        safe = safe.decode("ascii", "replace")
    return _ALWAYS_SAFE | set(safe)


def quote(string, safe="/", encoding=None, errors=None):
    """Percent-encode ``string`` keeping characters in ``safe`` and
    the ascii letters / digits / ``_.-~`` set untouched."""
    if isinstance(string, bytes):
        return quote_from_bytes(string, safe)
    if encoding is None:
        encoding = "utf-8"
    if errors is None:
        errors = "strict"
    return quote_from_bytes(string.encode(encoding, errors), safe)


_HEX = "0123456789ABCDEF"


def quote_from_bytes(bs, safe="/"):
    """Percent-encode the raw bytes ``bs`` keeping ``safe`` and the
    ASCII safe set untouched.  Returns a str.  Avoids ``str.format``
    (not implemented in Grail yet) by indexing ``_HEX`` directly."""
    if not isinstance(bs, (bytes, bytearray)):
        raise TypeError("quote_from_bytes() expected bytes")
    safe_chars = _safe_set(safe)
    out = []
    for b in bs:
        ch = chr(b)
        if ch in safe_chars:
            out.append(ch)
        else:
            out.append("%" + _HEX[(b >> 4) & 0xF] + _HEX[b & 0xF])
    return "".join(out)


def quote_plus(string, safe="", encoding=None, errors=None):
    """Like ``quote`` but also encodes spaces as ``+``."""
    if " " in string:
        s = quote(string, safe + " ", encoding, errors)
        return s.replace(" ", "+")
    return quote(string, safe, encoding, errors)


def unquote_to_bytes(string):
    """Decode percent-escapes in ``string`` (bytes or str) to bytes."""
    if isinstance(string, str):
        string = string.encode("ascii", "strict")
    out = bytearray()
    i = 0
    n = len(string)
    while i < n:
        b = string[i]
        if b == 0x25 and i + 2 < n:  # '%'
            try:
                out.append(int(string[i + 1 : i + 3], 16))
                i += 3
                continue
            except ValueError:
                pass
        out.append(b)
        i += 1
    return bytes(out)


def unquote(string, encoding="utf-8", errors="replace"):
    if isinstance(string, bytes):
        return unquote_to_bytes(string).decode(encoding, errors)
    return unquote_to_bytes(string).decode(encoding, errors)


def unquote_plus(string, encoding="utf-8", errors="replace"):
    return unquote(string.replace("+", " "), encoding, errors)


def urlencode(query, doseq=False, safe="", encoding=None, errors=None,
              quote_via=quote_plus):
    """Encode a sequence of (key, value) pairs (or a mapping) into a
    query string."""
    if hasattr(query, "items"):
        items = query.items()
    else:
        items = query
    parts = []
    for k, v in items:
        ks = str(k) if not isinstance(k, (bytes, bytearray)) else k
        vs = str(v) if not isinstance(v, (bytes, bytearray)) else v
        parts.append(
            quote_via(ks, safe, encoding, errors)
            + "="
            + quote_via(vs, safe, encoding, errors)
        )
    return "&".join(parts)


# --- URL splitting / joining (minimal) ---------------------------------------

class _SplitResult:
    __slots__ = ("scheme", "netloc", "path", "query", "fragment")

    def __init__(self, scheme, netloc, path, query, fragment):
        self.scheme = scheme
        self.netloc = netloc
        self.path = path
        self.query = query
        self.fragment = fragment

    def geturl(self):
        return urlunsplit(self)

    def __iter__(self):
        yield from (self.scheme, self.netloc, self.path, self.query, self.fragment)

    def __getitem__(self, i):
        # CPython's SplitResult is a namedtuple, so it is indexable and
        # tuple-unpackable by position.  Grail's unpacking codegen drives
        # tuple targets through __getitem__, so provide it explicitly
        # (without it, ``scheme, netloc, ... = urlsplit(u)`` binds the
        # positions [0..4] instead of the components).
        return (self.scheme, self.netloc, self.path, self.query, self.fragment)[i]

    def __len__(self):
        return 5

    def __repr__(self):
        return "SplitResult({!r}, {!r}, {!r}, {!r}, {!r})".format(
            self.scheme, self.netloc, self.path, self.query, self.fragment
        )

    def _split_netloc(self):
        """Return (userinfo, hostinfo) — userinfo before '@', hostinfo after."""
        netloc = self.netloc
        if '@' in netloc:
            userinfo, _, hostinfo = netloc.rpartition('@')
        else:
            userinfo, hostinfo = '', netloc
        return userinfo, hostinfo

    @property
    def username(self):
        """Username portion of the netloc (before the ':')."""
        userinfo, _ = self._split_netloc()
        if not userinfo:
            return None
        user = userinfo.split(':', 1)[0]
        return user or None

    @property
    def password(self):
        """Password portion of the netloc (after the ':' in userinfo)."""
        userinfo, _ = self._split_netloc()
        if ':' not in userinfo:
            return None
        return userinfo.split(':', 1)[1] or None

    @property
    def hostname(self):
        """Host portion of the netloc, lowercased, without port.
        Handles IPv6 brackets."""
        _, hostinfo = self._split_netloc()
        if not hostinfo:
            return None
        if hostinfo.startswith('['):
            # IPv6 — closing ']' marks end of host.
            end = hostinfo.find(']')
            if end == -1:
                return hostinfo.lower()
            return hostinfo[1:end].lower()
        host = hostinfo.split(':', 1)[0]
        return host.lower() or None

    @property
    def port(self):
        """Port portion as int, or None."""
        _, hostinfo = self._split_netloc()
        if not hostinfo:
            return None
        if hostinfo.startswith('['):
            end = hostinfo.find(']')
            if end == -1 or end + 1 >= len(hostinfo) or hostinfo[end + 1] != ':':
                return None
            port_str = hostinfo[end + 2:]
        else:
            if ':' not in hostinfo:
                return None
            port_str = hostinfo.split(':', 1)[1]
        if not port_str:
            return None
        try:
            return int(port_str)
        except ValueError:
            return None

    def _replace(self, scheme=None, netloc=None, path=None,
                 query=None, fragment=None):
        """namedtuple-style _replace — CPython's SplitResult is a
        namedtuple and consumers (twilio.request_validator's
        add_port/remove_port) rebuild URLs via
        ``parsed._replace(netloc=...).geturl()``.  Components are
        always strings, so None serves as the not-replaced sentinel."""
        return _SplitResult(
            self.scheme if scheme is None else scheme,
            self.netloc if netloc is None else netloc,
            self.path if path is None else path,
            self.query if query is None else query,
            self.fragment if fragment is None else fragment,
        )


def urlsplit(url, scheme="", allow_fragments=True):
    rest = url
    sch = scheme
    netloc = ""
    fragment = ""
    query = ""
    if "#" in rest and allow_fragments:
        rest, fragment = rest.split("#", 1)
    if "?" in rest:
        rest, query = rest.split("?", 1)
    if "://" in rest:
        sch, rest = rest.split("://", 1)
        if "/" in rest:
            netloc, rest = rest.split("/", 1)
            rest = "/" + rest
        else:
            netloc = rest
            rest = ""
    return _SplitResult(sch, netloc, rest, query, fragment)


def urlunsplit(parts):
    sch, netloc, path, query, fragment = parts
    out = ""
    if sch:
        out += sch + "://"
    out += netloc
    out += path
    if query:
        out += "?" + query
    if fragment:
        out += "#" + fragment
    return out


def urlparse(url, scheme="", allow_fragments=True):
    return urlsplit(url, scheme, allow_fragments)


def urlunparse(parts):
    return urlunsplit(parts)


def urljoin(base, url, allow_fragments=True):
    """Very simple — Grail's Flask story doesn't need RFC 3986."""
    if not base:
        return url
    if not url:
        return base
    if "://" in url:
        return url
    if url.startswith("/"):
        b = urlsplit(base)
        return urlunsplit((b.scheme, b.netloc, url, "", ""))
    # relative path — naive join
    base_path = base.rsplit("/", 1)[0]
    return base_path + "/" + url


def parse_qs(qs, keep_blank_values=False, strict_parsing=False,
             encoding="utf-8", errors="replace", max_num_fields=None,
             separator="&"):
    out = {}
    if not qs:
        return out
    for piece in qs.split(separator):
        if not piece:
            continue
        k, eq, v = piece.partition("=")
        if not eq and not keep_blank_values:
            continue
        kd = unquote_plus(k, encoding, errors)
        vd = unquote_plus(v, encoding, errors)
        out.setdefault(kd, []).append(vd)
    return out


def parse_qsl(qs, keep_blank_values=False, strict_parsing=False,
              encoding="utf-8", errors="replace", max_num_fields=None,
              separator="&"):
    out = []
    if not qs:
        return out
    for piece in qs.split(separator):
        if not piece:
            continue
        k, eq, v = piece.partition("=")
        if not eq and not keep_blank_values:
            continue
        out.append(
            (unquote_plus(k, encoding, errors),
             unquote_plus(v, encoding, errors))
        )
    return out
