# Grail urllib.request — minimal urlopen()/Request over Grail's
# http.client, plus the ``parse_http_list'' helper Werkzeug imports.
#
# Supported: http:// and https:// requests with headers, body
# (bytes or str), arbitrary methods, basic redirect following
# (301/302/303/307/308, capped at 10), HTTPError raised for 4xx/5xx
# exactly like CPython.  Not supported: proxies, auth handlers,
# opener/handler chains, file:// and ftp:// schemes.

from urllib.error import URLError, HTTPError
from urllib.parse import urlsplit, urljoin


class Request:
    def __init__(self, url, data=None, headers=None, method=None):
        self.full_url = url
        self.data = data
        self.headers = {}
        if headers:
            for k in headers:
                self.headers[k] = headers[k]
        self._method = method

    def get_method(self):
        if self._method is not None:
            return self._method
        if self.data is not None:
            return 'POST'
        return 'GET'

    def add_header(self, key, val):
        self.headers[key] = val

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
