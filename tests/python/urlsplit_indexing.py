# Fixture for UrlsplitIndexingTestCase.
#
# urllib.parse.urlsplit returns a SplitResult that, in CPython, is a
# namedtuple — indexable by position and tuple-unpackable.  Grail's
# unpacking codegen drives tuple targets through __getitem__, so the
# _SplitResult shim must define it (without it, ``a, b, ... = urlsplit(u)``
# binds the index positions instead of the components).  werkzeug's
# EnvironBuilder.base_url setter unpacks urlsplit(...) this way.

from urllib.parse import urlsplit


def attribute_access():
    r = urlsplit('http://localhost:8080/p?q=1#f')
    return [r.scheme, r.netloc, r.path, r.query, r.fragment]


def index_access():
    r = urlsplit('http://localhost/p?q=1')
    return [r[0], r[1], r[2], r[3], r[4]]


def tuple_unpacking():
    scheme, netloc, path, qs, frag = urlsplit('https://h/x')
    return [scheme, netloc, path, qs, frag]


def clean_url_has_no_query_or_fragment():
    # The exact shape werkzeug's base_url setter relies on.
    scheme, netloc, script_root, qs, anchor = urlsplit('http://localhost/')
    return [scheme, netloc, bool(qs), bool(anchor)]
