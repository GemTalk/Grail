# Grail ``requests`` shim — a small, faithful implementation of the
# requests API surface over Grail's http.client, NOT a vendored copy
# of the real library (upstream requests drags in urllib3, whose ssl
# introspection goes far past what GsSecureSocket exposes).
#
# Implemented: Session (prepare_request / merge_environment_settings /
# send / mount / request helpers), Request / PreparedRequest /
# Response, HTTPAdapter (config-only), hooks, CaseInsensitiveDict,
# the exceptions hierarchy, and the module-level request helpers.
# This is exactly the surface twilio's TwilioHttpClient and
# ValidationClient drive, plus the conventional requests.get/post.
#
# Not implemented: proxies, cookies/CookieJar, multipart file upload,
# streaming responses, urllib3 Retry semantics (max_retries counts
# connection-level retries only).
#
# Named _grail_requests, not requests: see _grail_standins.  Grail's vendored code
# imports it only when no real requests is installed, so it never shadows one.

from _grail_requests import hooks
from _grail_requests import adapters
from _grail_requests import exceptions
from _grail_requests.adapters import HTTPAdapter
from _grail_requests.exceptions import (
    RequestException, ConnectionError, SSLError, HTTPError, Timeout,
    ConnectTimeout, ReadTimeout, TooManyRedirects, InvalidURL,
    MissingSchema, JSONDecodeError)
from _grail_requests.models import Request, PreparedRequest, Response
from _grail_requests.sessions import Session
from _grail_requests.structures import CaseInsensitiveDict

__version__ = '2.32.0+grail.shim'


def request(method, url, **kwargs):
    session = Session()
    return session.request(method, url, **kwargs)


def get(url, params=None, **kwargs):
    return request('GET', url, params=params, **kwargs)


def post(url, data=None, json=None, **kwargs):
    return request('POST', url, data=data, json=json, **kwargs)


def put(url, data=None, **kwargs):
    return request('PUT', url, data=data, **kwargs)


def patch(url, data=None, **kwargs):
    return request('PATCH', url, data=data, **kwargs)


def delete(url, **kwargs):
    return request('DELETE', url, **kwargs)


def head(url, **kwargs):
    kwargs.setdefault('allow_redirects', False)
    return request('HEAD', url, **kwargs)
