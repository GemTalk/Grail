# Grail urllib.request — minimal urlopen()/Request over Grail's
# http.client, plus the ``parse_http_list'' helper Werkzeug imports.
#
# Supported: http:// and https:// requests with headers, body
# (bytes or str), arbitrary methods, basic redirect following
# (301/302/303/307/308, capped at 10), HTTPError raised for 4xx/5xx
# exactly like CPython.  Not supported: auth handlers, opener/handler
# chains, file:// and ftp:// schemes.
#
# Proxies: the environment-variable query surface (getproxies,
# getproxies_environment, proxy_bypass, proxy_bypass_environment) IS here
# and is what requests calls on every request -- see the block at the foot
# of this file.  urlopen() itself still does not route THROUGH a proxy; it
# has no handler chain to install a ProxyHandler in.
#
# Request carries the full attribute surface http.cookiejar reads off a
# request (type/host/selector/origin_req_host/unverifiable, has_header/
# get_header/add_unredirected_header), so a CookieJar can be driven with a
# real Request rather than a hand-written mock.  There is still no
# HTTPCookieProcessor here: urlopen() has no handler chain to install one
# in, so a caller wires the jar up by hand (add_cookie_header before the
# call, extract_cookies after).

from urllib.error import URLError, HTTPError
from urllib.parse import urlsplit, urljoin


# State urlcleanup() owns, in CPython's shape so that a urlretrieve() or an
# install_opener() added later drops straight in.  Both are empty here for
# the reasons the header gives: this module has no handler chain to install
# an opener in, and no urlretrieve to leave temporary files behind.
_url_tempfiles = []
_opener = None


def urlcleanup():
    """Clean up temporary files from urlretrieve calls, and drop the
    installed opener.

    CPython's contract, over the state THIS module keeps -- which today is
    none of it, so the call does nothing and says so honestly rather than
    pretending.  It exists because callers invoke it defensively to reset
    global state between requests (test_urllib2_localnet's TestUrlopen
    registers it with addCleanup in setUp, so its absence raised
    AttributeError before a single test in the class could run), and
    because the loop below is what makes a future urlretrieve correct by
    construction instead of by remembering.
    """
    import os

    for temp_file in _url_tempfiles:
        try:
            os.unlink(temp_file)
        except OSError:
            pass
    del _url_tempfiles[:]
    global _opener
    if _opener:
        _opener = None


def request_host(request):
    """Return the request-host of ``request``, lowercased and without any
    port -- CPython's urllib.request.request_host.

    Used to default ``Request.origin_req_host``, which http.cookiejar's
    third-party/verifiability policy reads."""
    host = urlsplit(request.full_url).netloc
    if host == '':
        host = request.get_header('Host', '')
    # Strip userinfo and any :port suffix.  CPython uses a regex; the
    # colon scan below is the same thing without importing re.
    at = host.rfind('@')
    if at >= 0:
        host = host[at + 1:]
    if host.startswith('['):
        # IPv6 literal: the port, if any, follows the closing bracket.
        end = host.find(']')
        if end >= 0:
            host = host[:end + 1] + _strip_port(host[end + 1:])
    else:
        host = _strip_port(host)
    return host.lower()


def _strip_port(part):
    colon = part.find(':')
    return part if colon < 0 else part[:colon]


class Request:
    """A request description, with the attribute surface http.cookiejar's
    CookiePolicy reads off a request.

    Deviations from CPython, both deliberate:
      * ``full_url`` is a plain attribute, not a property, and keeps any
        ``#fragment`` (CPython splits it off into ``.fragment``).  Nothing
        here re-assigns it after construction -- redirects build a new
        Request -- so the property's re-parse hook has nothing to do.
      * ``selector`` is the path+query of the URL; CPython also tracks
        ``_tunnel_host`` for proxy CONNECT, which this module does not do.
    """

    def __init__(self, url, data=None, headers=None, method=None,
                 origin_req_host=None, unverifiable=False):
        self.full_url = url
        self.data = data
        self.headers = {}
        # Headers set by the client itself, which must NOT be re-sent on a
        # redirect to another host.  http.cookiejar writes the Cookie header
        # here via add_unredirected_header().
        self.unredirected_hdrs = {}
        if headers:
            for k in headers:
                self.add_header(k, headers[k])
        self._method = method
        self._parse()
        if origin_req_host is None:
            origin_req_host = request_host(self)
        self.origin_req_host = origin_req_host
        self.unverifiable = unverifiable

    def _parse(self):
        parts = urlsplit(self.full_url)
        self.type = parts.scheme or None
        self.host = parts.netloc or None
        selector = parts.path
        if parts.query:
            selector = selector + '?' + parts.query
        self.selector = selector

    def get_method(self):
        if self._method is not None:
            return self._method
        if self.data is not None:
            return 'POST'
        return 'GET'

    def get_type(self):
        return self.type

    def get_host(self):
        return self.host

    def get_selector(self):
        return self.selector

    def get_origin_req_host(self):
        return self.origin_req_host

    def is_unverifiable(self):
        return self.unverifiable

    def add_header(self, key, val):
        self.headers[key.capitalize()] = val

    def add_unredirected_header(self, key, val):
        self.unredirected_hdrs[key.capitalize()] = val

    def remove_header(self, key):
        self.headers.pop(key.capitalize(), None)
        self.unredirected_hdrs.pop(key.capitalize(), None)

    def has_header(self, header_name):
        return (header_name in self.headers or
                header_name in self.unredirected_hdrs)

    def get_header(self, header_name, default=None):
        if header_name in self.headers:
            return self.headers[header_name]
        return self.unredirected_hdrs.get(header_name, default)

    def header_items(self):
        items = {}
        items.update(self.unredirected_hdrs)
        items.update(self.headers)
        return list(items.items())

    def get_full_url(self):
        return self.full_url


def urlopen(url, data=None, timeout=None, context=None):
    """Open an http:// or https:// URL and return the HTTPResponse.

    Raises HTTPError for 4xx/5xx statuses and URLError for transport
    failures, mirroring CPython's behavior for the common path."""
    import http.client

    if isinstance(url, Request):
        req = url
    else:
        req = Request(url)
    if data is not None:
        req.data = data

    redirects = 0
    while True:
        parts = urlsplit(req.full_url)
        scheme = parts.scheme.lower()
        if scheme == 'https':
            conn = http.client.HTTPSConnection(
                parts.netloc, timeout=timeout, context=context)
        elif scheme == 'http':
            conn = http.client.HTTPConnection(parts.netloc, timeout=timeout)
        else:
            raise URLError('unsupported URL scheme %r' % (scheme,))

        path = parts.path or '/'
        if parts.query:
            path = path + '?' + parts.query

        body = req.data
        headers = {}
        for k in req.unredirected_hdrs:
            headers[k] = req.unredirected_hdrs[k]
        for k in req.headers:
            headers[k] = req.headers[k]
        if body is not None and isinstance(body, str):
            body = body.encode('utf-8')

        try:
            conn.request(req.get_method(), path, body=body, headers=headers)
            resp = conn.getresponse()
        except http.client.HTTPException as exc:
            raise URLError(str(exc))

        if resp.status in (301, 302, 303, 307, 308):
            location = resp.getheader('Location')
            if location:
                redirects = redirects + 1
                if redirects > 10:
                    raise HTTPError(req.full_url, resp.status,
                                    'too many redirects', resp.headers, resp)
                resp.read()
                conn.close()
                new_req = Request(urljoin(req.full_url, location),
                                  headers=req.headers)
                if resp.status in (301, 302, 303):
                    new_req._method = 'GET'
                else:
                    new_req._method = req.get_method()
                    new_req.data = req.data
                req = new_req
                continue

        if resp.status >= 400:
            raise HTTPError(req.full_url, resp.status, resp.reason,
                            resp.headers, resp)
        resp.url = req.full_url
        return resp


def parse_http_list(value):
    """Parse a list of HTTP headers as defined in RFC 9110.

    The list elements MAY be quoted, with the quote being percent-
    escaped if needed.  Commas within quoted strings don't end an
    element.  Whitespace around elements is stripped.

    Werkzeug uses this for Accept-* / Cache-Control / Authorization
    parsing.  This is a faithful port of CPython 3.14's
    urllib.request.parse_http_list (a few dozen lines)."""
    res = []
    part = ''
    escape = quote = False
    for cur in value:
        if escape:
            part += cur
            escape = False
            continue
        if quote:
            if cur == '\\':
                escape = True
                continue
            elif cur == '"':
                quote = False
            part += cur
            continue
        if cur == ',':
            res.append(part)
            part = ''
            continue
        if cur == '"':
            quote = True
        part += cur
    if part:
        res.append(part)
    return [p.strip() for p in res]


# --- proxy configuration from the environment --------------------------------
#
# requests.utils imports getproxies / getproxies_environment / proxy_bypass /
# proxy_bypass_environment from here and calls them on every request
# (should_bypass_proxies -> proxy_bypass, get_environ_proxies -> getproxies),
# so the names have to exist AND behave, not just import.
#
# ENVIRONMENT ONLY, DELIBERATELY.  CPython picks an implementation by platform:
# darwin reads SystemConfiguration through the _scproxy C extension, nt reads
# the registry through winreg, and every other platform takes the ``else''
# branch --
#
#     getproxies = getproxies_environment
#     proxy_bypass = proxy_bypass_environment
#
# -- which is exactly what is below.  Grail has neither _scproxy nor winreg, and
# a gem is a server process whose notion of "the proxy" is its own environment
# rather than the desktop user's system preferences, so the generic branch is
# both the only reachable one and the right one.  This is a real CPython code
# path taken verbatim, not a Grail invention.  The names of the platform-only
# helpers (getproxies_macosx_sysconf, proxy_bypass_macosx_sysconf,
# getproxies_registry, proxy_bypass_registry) are deliberately NOT defined:
# requests guards its own uses of them behind ``sys.platform == "win32"'', and
# defining a name that cannot do its job would be worse than not having it.
#
# GRAIL LIMITATION, in getproxies_environment only.  CPython scans os.environ
# for any name ending in ``_proxy''.  GemStone exposes no primitive that reads
# the environment BLOCK back (see the os_Environ class comment), so os.environ
# can only iterate names this session has already touched -- a curated probe
# list plus anything read or written through it.  The standard proxy names are
# in that probe list, so an inherited ``http_proxy'' / ``HTTPS_PROXY'' /
# ``no_proxy'' is found; an exotic ``<scheme>_proxy'' for a scheme nobody named
# is not.  Reading a name explicitly (os.environ['zope_proxy']) makes it visible
# to every later scan.
#
# SECOND GRAIL LIMITATION, same function, different cause.  GemStone has no
# representation for an EMPTY environment variable -- setting one to '' is how
# os.unsetenv and ``del os.environ[k]'' unset it -- so CPython's rule that an
# empty lowercase ``http_proxy'' suppresses an uppercase ``HTTP_PROXY'' cannot
# fire here: the empty name is indistinguishable from an absent one.  The
# uppercase value survives instead.  Both limitations are pinned by
# tests/python/urllib_defrag_and_proxies.py rather than left to be rediscovered.

import os as _os


def getproxies_environment():
    """Return a dictionary of scheme -> proxy server URL mappings.

    Scan the environment for variables named <scheme>_proxy; this seems to
    be the standard convention."""
    # In order to prefer lowercase variables, process the environment in two
    # passes: the first matches any case, the second lowercase only.
    proxies = {}
    environment = []
    for name in _os.environ:
        # Fast screen on the underscore position before the case-folding.
        if len(name) > 5 and name[-6] == "_" and name[-5:].lower() == "proxy":
            value = _os.environ[name]
            proxy_name = name[:-6].lower()
            environment.append((name, value, proxy_name))
            if value:
                proxies[proxy_name] = value
    # CVE-2016-1000110 - if we are running as a CGI script, forget HTTP_PROXY
    # (non-all-lowercase) as it may be set from the web server by a "Proxy:"
    # header from the client.  If "proxy" is lowercase it will still be used,
    # thanks to the next block.
    if 'REQUEST_METHOD' in _os.environ:
        proxies.pop('http', None)
    for name, value, proxy_name in environment:
        # Not case-folded: this pass is looking for lower-case names only.
        if name[-6:] == '_proxy':
            if value:
                proxies[proxy_name] = value
            else:
                proxies.pop(proxy_name, None)
    return proxies


def proxy_bypass_environment(host, proxies=None):
    """Test if proxies should not be used for a particular host.

    Checks the proxy dict for the value of no_proxy, which should be a list
    of comma separated DNS suffixes, or '*' for all hosts."""
    if proxies is None:
        proxies = getproxies_environment()
    # Don't bypass if no_proxy isn't specified.
    try:
        no_proxy = proxies['no']
    except KeyError:
        return False
    # '*' is the special case for always bypass.
    if no_proxy == '*':
        return True
    host = host.lower()
    # Strip the port off the host.
    hostonly, port = _splitport(host)
    # Check whether the host ends with any of the DNS suffixes.
    for name in no_proxy.split(','):
        name = name.strip()
        if name:
            name = name.lstrip('.')  # ignore leading dots
            name = name.lower()
            if hostonly == name or host == name:
                return True
            name = '.' + name
            if hostonly.endswith(name) or host.endswith(name):
                return True
    # Otherwise, don't bypass.
    return False


_DIGITS = "0123456789"


def _splitport(host):
    """splitport('host:port') --> 'host', 'port'.

    CPython's lives in urllib.parse and is a ``(.*):([0-9]*)'' fullmatch,
    which is a greedy split at the LAST colon whose tail is all digits.
    Spelled out here without ``re'' -- and the two odd corners of that regex
    are kept, because proxy_bypass_environment depends on the first:

      * an EMPTY port still consumes the colon, so 'a:' -> ('a', None), not
        ('a:', None);
      * a non-numeric tail matches nothing at all, so 'a:b' -> ('a:b', None)
        with the colon still attached (no earlier colon can match either,
        since [0-9]* cannot span one)."""
    left, sep, right = host.rpartition(':')
    if not sep:
        return host, None
    for ch in right:
        if ch not in _DIGITS:
            return host, None
    if right:
        return left, right
    return left, None


# The generic platform branch, verbatim from CPython.
getproxies = getproxies_environment
proxy_bypass = proxy_bypass_environment
