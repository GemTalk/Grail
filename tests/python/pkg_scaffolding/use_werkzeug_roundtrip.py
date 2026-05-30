# Probe for Werkzeug M6 — the real Request/Response round-trip.
#
# The existing use_werkzeug_wrappers probe only asserts the package
# *imports*; the M6 milestone in docs/Support_Flask.md is stated as
# "werkzeug.wrappers.Request/Response round-trip a WSGI environ".
# This fixture measures that stricter bar directly:
#
#   * Request side  — construct a real werkzeug.wrappers.Request from
#     a WSGI environ and read .method / .path / .args (query parsing)
#     / .headers.  These attrs are @cached_property on sansio.request,
#     backed by werkzeug.utils.cached_property (currently a reduced
#     hand-rolled shim — see TODO.md), so this exercises that path.
#
#   * Response side — construct a real werkzeug.wrappers.Response and
#     drive it as a WSGI application: resp(environ, start_response)
#     must call start_response with the status + headers and return an
#     app-iter of bytes.  The green client_calls_app probe only proves
#     output *parsing* (raw app -> TestResponse); this proves Response
#     *serialization* to WSGI, the opposite direction.
#
# Until the wrappers genuinely round-trip, these functions are the
# failing acceptance gate for M6.  The environ is built with the
# already-green EnvironBuilder so any failure isolates to the
# wrappers, not to environ construction.
#
# The dependency chain is pre-loaded in order to sidestep Grail's
# circular-import handling for the parent-package __init__, mirroring
# use_werkzeug_wrappers.


def _preload():
    import werkzeug._internal
    import werkzeug.urls
    import werkzeug.exceptions
    import werkzeug.http
    import werkzeug.datastructures.mixins
    import werkzeug.datastructures.structures
    import werkzeug.datastructures.cache_control
    import werkzeug.datastructures.csp
    import werkzeug.datastructures.etag
    import werkzeug.datastructures.range
    import werkzeug.datastructures.accept
    import werkzeug.datastructures.auth
    import werkzeug.datastructures.headers
    import werkzeug.datastructures.file_storage
    import werkzeug.datastructures
    import werkzeug.sansio.utils
    import werkzeug.sansio.http
    import werkzeug.sansio.multipart


def import_succeeded():
    """The real wrappers package exposes Request and Response."""
    _preload()
    import werkzeug.wrappers
    return (werkzeug.wrappers.Request is not None
            and werkzeug.wrappers.Response is not None)


# --- Request: read attributes out of a WSGI environ -----------------

def request_reads_method_and_path():
    _preload()
    from werkzeug.test import EnvironBuilder
    from werkzeug.wrappers import Request
    environ = EnvironBuilder(path='/hello', method='POST').get_environ()
    req = Request(environ)
    return req.method == 'POST' and req.path == '/hello'


def request_reads_query_args():
    """`.args` parses QUERY_STRING into a MultiDict."""
    _preload()
    from werkzeug.test import EnvironBuilder
    from werkzeug.wrappers import Request
    environ = EnvironBuilder(path='/search', query_string='q=grail&n=2').get_environ()
    req = Request(environ)
    return req.args.get('q') == 'grail' and req.args.get('n') == '2'


def request_reads_headers():
    """`.headers` exposes request headers from the environ."""
    _preload()
    from werkzeug.test import EnvironBuilder
    from werkzeug.wrappers import Request
    environ = EnvironBuilder(path='/', headers=[('X-Test', 'yes')]).get_environ()
    req = Request(environ)
    return req.headers.get('X-Test') == 'yes'


# --- Response: serialize to a WSGI (start_response, app_iter) pair --

def response_wsgi_serialization():
    """Driving a Response as a WSGI app yields the body bytes and a
    2xx status through start_response."""
    _preload()
    from werkzeug.wrappers import Response
    resp = Response('Hello, World!', status=200, content_type='text/plain')
    captured = {}

    def start_response(status, headers):
        captured['status'] = status
        captured['headers'] = headers

    app_iter = resp({'REQUEST_METHOD': 'GET'}, start_response)
    body = b''.join(app_iter)
    return body == b'Hello, World!' and captured['status'].startswith('200')


def response_emits_custom_header():
    """get_wsgi_response returns (app_iter, status, headers) with a
    user-supplied header preserved."""
    _preload()
    from werkzeug.wrappers import Response
    resp = Response('x', status=201, headers=[('X-Test', 'yes')])
    app_iter, status, headers = resp.get_wsgi_response({'REQUEST_METHOD': 'GET'})
    header_map = dict(headers)
    return status.startswith('201') and header_map.get('X-Test') == 'yes'
