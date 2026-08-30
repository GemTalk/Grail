# Grail urllib.request — minimal urlopen()/Request over Grail's
# http.client, plus the ``parse_http_list'' helper Werkzeug imports.
#
# Supported: http:// and https:// requests with headers, body
# (bytes or str), arbitrary methods, basic redirect following
# (301/302/303/307/308, capped at 10), HTTPError raised for 4xx/5xx
# exactly like CPython.  Not supported: proxies, auth handlers,
# opener/handler chains, file:// and ftp:// schemes.
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
