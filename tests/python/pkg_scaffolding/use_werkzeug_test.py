# Probe for Werkzeug Step 10 — werkzeug.test.
#
# werkzeug.test ships as a hand-rolled minimal shim, not a
# source-drop of upstream.  Upstream test.py runs a transitive
# import chain that bottoms out in werkzeug.wrappers.request which
# hits a ``__getitem__:'' on BoundMethod codegen gap at module-init
# time (annotations / class body subscripts that resolve to
# imported BoundMethods).  Once that lands the upstream source-drop
# becomes viable; ``test_upstream.py.bak'' kept alongside.
#
# Shim public surface: EnvironBuilder, Client, TestResponse,
# ClientRedirectError, Cookie, create_environ, run_wsgi_app,
# encode_multipart, stream_encode_multipart.


def import_succeeded():
    import werkzeug.test
    return werkzeug.test.EnvironBuilder is not None


def public_surface_present():
    import werkzeug.test as wt
    return (wt.EnvironBuilder is not None
            and wt.Client is not None
            and wt.TestResponse is not None
            and wt.ClientRedirectError is not None
            and wt.Cookie is not None
            and wt.create_environ is not None
            and wt.run_wsgi_app is not None
            and wt.encode_multipart is not None)


def environ_builder_constructs():
    """EnvironBuilder() ctor populates path/method defaults."""
    import werkzeug.test as wt
    eb = wt.EnvironBuilder()
    return eb.path == '/' and eb.method == 'GET'


def environ_builder_get_environ():
    """get_environ produces a WSGI environ with PATH_INFO + METHOD."""
    import werkzeug.test as wt
    eb = wt.EnvironBuilder(path='/hello', method='POST')
    environ = eb.get_environ()
    return (environ['PATH_INFO'] == '/hello'
            and environ['REQUEST_METHOD'] == 'POST'
            and environ['wsgi.url_scheme'] == 'http')


def client_calls_app():
    """Client.get() invokes the WSGI app and returns a TestResponse."""
    import werkzeug.test as wt

    def app(environ, start_response):
        start_response('200 OK', [('Content-Type', 'text/plain')])
        return [b'hello']

    client = wt.Client(app)
    response = client.get('/hi')
    return response.status == '200 OK'
