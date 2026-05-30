# Probe for Werkzeug Step 10 — werkzeug.test.
#
# werkzeug.test is now the real upstream source-drop (commit
# 4cf5424 replaced the earlier hand-rolled shim).  It imports the
# real werkzeug.wrappers Request/Response, so client_calls_app
# below exercises a genuine WSGI round-trip: Client.get() builds an
# environ, invokes the app, and wraps the output in a real
# TestResponse(Response).
#
# Public surface: EnvironBuilder, Client, TestResponse,
# ClientRedirectError, Cookie, create_environ, run_wsgi_app,
# encode_multipart, stream_encode_multipart.
#
# Note: this probe proves the *output* direction (raw app output ->
# TestResponse).  The request-in / Response-serialization directions
# of the real wrappers are measured by use_werkzeug_roundtrip.py
# (the M6 acceptance gate).


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
