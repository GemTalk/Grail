# Grail requests shim — Session.
#
# Transport: one Grail http.client connection per send() (no pooling).
# The surface matches what twilio's TwilioHttpClient / ValidationClient
# drive: prepare_request, merge_environment_settings, send(prepped,
# allow_redirects=, timeout=, stream=, verify=, cert=, proxies=),
# mount(), plus the conventional request()/get()/post() helpers.

from urllib.parse import urlsplit, urljoin

from requests.adapters import HTTPAdapter
from requests.exceptions import (
    ConnectionError, Timeout, TooManyRedirects, RequestException)
from requests.hooks import default_hooks, dispatch_hook
from requests.models import Request, PreparedRequest, Response
from requests.structures import CaseInsensitiveDict


def _default_headers():
    headers = CaseInsensitiveDict()
    headers['User-Agent'] = 'grail-requests/0.1'
    headers['Accept-Encoding'] = 'identity'
    headers['Accept'] = '*/*'
    headers['Connection'] = 'close'
    return headers


class Session:
    def __init__(self):
        self.headers = _default_headers()
        self.auth = None
        self.proxies = {}
        self.params = {}
        self.hooks = default_hooks()
        self.adapters = {}
        self.verify = True
        self.cert = None
        self.max_redirects = 30
        self.mount('https://', HTTPAdapter())
        self.mount('http://', HTTPAdapter())

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.close()
        return False

    def mount(self, prefix, adapter):
        self.adapters[prefix] = adapter

    def get_adapter(self, url):
        best = None
        best_len = -1
        for prefix in self.adapters:
            if url.lower().startswith(prefix.lower()) \
                    and len(prefix) > best_len:
                best = self.adapters[prefix]
                best_len = len(prefix)
        return best if best is not None else HTTPAdapter()

    def prepare_request(self, request):
        merged_headers = self.headers.copy()
        if request.headers:
            for k in request.headers:
                value = request.headers[k]
                if value is not None:
                    merged_headers[k] = value
        auth = request.auth if request.auth is not None else self.auth
        hooks = request.hooks if request.hooks else self.hooks
        prepared = PreparedRequest()
        prepared.prepare(method=request.method, url=request.url,
                         headers=merged_headers, data=request.data,
                         params=request.params, auth=auth, hooks=hooks,
                         json=request.json)
        return prepared

    def merge_environment_settings(self, url, proxies, stream, verify, cert):
        return {
            'proxies': proxies if proxies else {},
            'stream': stream,
            'verify': verify if verify is not None else self.verify,
            'cert': cert if cert is not None else self.cert,
        }

    def send(self, prepared, stream=None, timeout=None, verify=None,
             cert=None, proxies=None, allow_redirects=True):
        if proxies:
            raise NotImplementedError(
                'Grail requests shim does not support proxies')

        adapter = self.get_adapter(prepared.url)
        retries = adapter.max_retries
        if retries is None:
            retries = 0
        try:
            retries = int(retries)
        except (TypeError, ValueError):
            # urllib3.Retry-style object; honor its .total when present
            total = getattr(retries, 'total', 0)
            retries = int(total) if total else 0

        redirects = 0
        request_to_send = prepared
        while True:
            response = self._send_once(request_to_send, timeout, retries)
            if allow_redirects and response.status_code in \
                    (301, 302, 303, 307, 308):
                location = response.headers.get('Location')
                if location is None:
                    break
                redirects = redirects + 1
                if redirects > self.max_redirects:
                    raise TooManyRedirects(
                        'Exceeded %s redirects' % self.max_redirects,
                        response=response)
                new_url = urljoin(request_to_send.url, location)
                next_request = PreparedRequest()
                next_request.method = request_to_send.method
                next_request.headers = request_to_send.headers.copy()
                next_request.body = request_to_send.body
                next_request.hooks = request_to_send.hooks
                if response.status_code in (301, 302, 303) \
                        and request_to_send.method != 'HEAD':
                    next_request.method = 'GET'
                    next_request.body = None
                next_request.url = new_url
                request_to_send = next_request
                continue
            break

        response = dispatch_hook('response', request_to_send.hooks, response)
        return response

    def _send_once(self, prepared, timeout, retries):
        import http.client

        parts = urlsplit(prepared.url)
        scheme = parts.scheme.lower()
        path = parts.path or '/'
        if parts.query:
            path = path + '?' + parts.query

        headers = {}
        for key, value in prepared.headers.items():
            headers[key] = value

        attempt = 0
        while True:
            if scheme == 'https':
                conn = http.client.HTTPSConnection(
                    parts.netloc, timeout=timeout)
            elif scheme == 'http':
                conn = http.client.HTTPConnection(
                    parts.netloc, timeout=timeout)
            else:
                raise RequestException(
                    'unsupported scheme %r' % (scheme,))
            try:
                conn.request(prepared.method, path,
                             body=prepared.body, headers=headers)
                raw = conn.getresponse()
                break
            except OSError as exc:
                conn.close()
                attempt = attempt + 1
                if attempt > retries:
                    raise ConnectionError(str(exc), request=prepared)

        body = raw.read()
        conn.close()

        response = Response()
        response.status_code = raw.status
        response.reason = raw.reason
        response.url = prepared.url
        response.request = prepared
        response._content = body
        for name, value in raw.getheaders():
            response.headers[name] = value
        return response

    def request(self, method, url, params=None, data=None, headers=None,
                auth=None, timeout=None, allow_redirects=True, hooks=None,
                json=None, **kwargs):
        req = Request(method=method, url=url, headers=headers, data=data,
                      params=params, auth=auth, hooks=hooks, json=json)
        prepared = self.prepare_request(req)
        return self.send(prepared, timeout=timeout,
                         allow_redirects=allow_redirects)

    def get(self, url, **kwargs):
        return self.request('GET', url, **kwargs)

    def post(self, url, **kwargs):
        return self.request('POST', url, **kwargs)

    def put(self, url, **kwargs):
        return self.request('PUT', url, **kwargs)

    def delete(self, url, **kwargs):
        return self.request('DELETE', url, **kwargs)

    def head(self, url, **kwargs):
        return self.request('HEAD', url, allow_redirects=False, **kwargs)

    def close(self):
        pass
