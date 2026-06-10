# Grail requests shim — Request / PreparedRequest / Response.

import base64
import json as _json
from urllib.parse import urlencode, urlsplit

from requests.structures import CaseInsensitiveDict
from requests.exceptions import HTTPError, MissingSchema
from requests.hooks import default_hooks


class Request:
    """User-level request container; prepare() folds everything into a
    PreparedRequest exactly far enough for twilio + common use."""

    def __init__(self, method=None, url=None, headers=None, files=None,
                 data=None, params=None, auth=None, cookies=None,
                 hooks=None, json=None):
        self.method = method
        self.url = url
        self.headers = headers if headers is not None else {}
        self.files = files
        self.data = data
        self.params = params
        self.auth = auth
        self.cookies = cookies
        self.json = json
        self.hooks = default_hooks()
        if hooks:
            for key in hooks:
                self.hooks[key] = hooks[key]

    def prepare(self):
        prepared = PreparedRequest()
        prepared.prepare(method=self.method, url=self.url,
                         headers=self.headers, data=self.data,
                         params=self.params, auth=self.auth,
                         hooks=self.hooks, json=self.json)
        return prepared


class PreparedRequest:
    def __init__(self):
        self.method = None
        self.url = None
        self.headers = CaseInsensitiveDict()
        self.body = None
        self.hooks = default_hooks()

    def prepare(self, method=None, url=None, headers=None, data=None,
                params=None, auth=None, hooks=None, json=None):
        self.method = method.upper() if method else method
        self.prepare_url(url, params)
        if headers:
            for k in headers:
                value = headers[k]
                if value is not None:
                    self.headers[k] = value
        self.prepare_body(data, json)
        self.prepare_auth(auth)
        if hooks:
            self.hooks = hooks

    def prepare_url(self, url, params):
        if url is None:
            raise MissingSchema('Invalid URL: None')
        parts = urlsplit(url)
        if not parts.scheme:
            raise MissingSchema(
                "Invalid URL %r: No scheme supplied." % (url,))
        if params:
            extra = urlencode(params, doseq=True) \
                if not isinstance(params, str) else params
            if parts.query:
                url = url + '&' + extra
            else:
                url = url + '?' + extra
        self.url = url

    def prepare_body(self, data, json=None):
        if data is None and json is not None:
            self.body = _json.dumps(json)
            if 'content-type' not in self.headers:
                self.headers['Content-Type'] = 'application/json'
            return
        if data is None:
            self.body = None
            return
        if isinstance(data, (str, bytes)):
            self.body = data
            return
        # mapping or sequence of pairs -> form encoding
        self.body = urlencode(data, doseq=True)
        if 'content-type' not in self.headers:
            self.headers['Content-Type'] = \
                'application/x-www-form-urlencoded'

    def prepare_auth(self, auth):
        if auth is None:
            return
        if isinstance(auth, tuple) and len(auth) == 2:
            user = auth[0]
            password = auth[1]
            token = base64.b64encode(
                (user + ':' + password).encode('utf-8')).decode('utf-8')
            self.headers['Authorization'] = 'Basic ' + token
        elif callable(auth):
            auth(self)


class Response:
    def __init__(self):
        self.status_code = None
        self.headers = CaseInsensitiveDict()
        self.url = None
        self.reason = None
        self._content = b''
        self.request = None
        self.history = []
        self.encoding = 'utf-8'

    @property
    def content(self):
        return self._content

    @property
    def text(self):
        if self._content is None:
            return ''
        return self._content.decode(self.encoding or 'utf-8')

    @property
    def ok(self):
        return self.status_code is not None and self.status_code < 400

    def json(self, **kwargs):
        return _json.loads(self.text)

    def raise_for_status(self):
        if self.status_code is not None and 400 <= self.status_code < 500:
            raise HTTPError(
                '%s Client Error: %s for url: %s'
                % (self.status_code, self.reason, self.url),
                response=self)
        if self.status_code is not None and 500 <= self.status_code < 600:
            raise HTTPError(
                '%s Server Error: %s for url: %s'
                % (self.status_code, self.reason, self.url),
                response=self)

    def close(self):
        pass

    def __repr__(self):
        return '<Response [%s]>' % (self.status_code,)
