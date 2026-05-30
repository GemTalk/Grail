# Werkzeug M6 — Request/Response round-trip, in two tiers.
#
# Tier 1 (registered, green): what works today — the package imports,
# a real Request and Response *construct* from a WSGI environ, and the
# Client drives a WSGI app and reads the response back (output
# direction).  FlaskScaffoldingTestCase >> testWerkzeugWrappers-
# ConstructAndClient asserts these.
#
# Tier 2 (MANUAL acceptance probe — NOT registered in the suite): the
# full round-trip M6 calls for — reading Request attributes out of an
# environ and serializing a Response back to WSGI.  These functions
# (request_reads_* / response_*) are the acceptance target; run them
# by hand (loadFixture + call) to measure progress.  They are NOT
# asserted by any registered test because they require language
# features that aren't in yet — see docs/Support_Flask.md M6 for the
# blocker list:
#   A. Request construction: super().__init__(method=..., ...) — the
#      Super dispatch doesn't bind kwargs to a fixed-arity parent and
#      caps at 3 positional args (parent __init__ takes 8).
#   B. req.args / .form / .cookies — the descriptor protocol: a bare
#      instance.attr read doesn't invoke a class attribute's __get__,
#      so @cached_property never fires (resolves to a BoundMethod).
#   C. Response.__call__ / Headers serialization — assorted API gaps
#      (e.g. Headers iteration).
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


# === Tier 1 — registered green subset ("what works today") ==========

def request_constructs():
    """A real Request constructs from a WSGI environ without error."""
    _preload()
    from werkzeug.test import EnvironBuilder
    from werkzeug.wrappers import Request
    environ = EnvironBuilder(path='/hello', method='POST').get_environ()
    return Request(environ) is not None


def response_constructs():
    """A real Response constructs without error."""
    _preload()
    from werkzeug.wrappers import Response
    return Response('Hello, World!', status=200) is not None


def client_app_roundtrip():
    """Client drives a WSGI app and reads the response back — the
    output direction of the round-trip (raw app -> TestResponse)."""
    _preload()
    from werkzeug.test import Client

    def app(environ, start_response):
        start_response('200 OK', [('Content-Type', 'text/plain')])
        return [b'Hello, World!']

    response = Client(app).get('/hi')
    return response.status == '200 OK'


# === Tier 2 — MANUAL acceptance probe (not registered) ==============
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
