def closure_assign_reaches_outer():
    captured = None

    def inner():
        nonlocal captured
        captured = 'set-by-inner'

    inner()
    return captured == 'set-by-inner'


def two_nonlocals():
    a = 1
    b = 2

    def inner():
        nonlocal a, b
        a = a + 10
        b = b + 20

    inner()
    return (a, b) == (11, 22)


def closure_via_callback():
    captured = None

    def setter(value):
        nonlocal captured
        captured = value

    setter('via-cb')
    return captured == 'via-cb'


def wsgi_like_pattern():
    """The exact pattern that werkzeug.test.run_wsgi_app uses for
    its start_response closure."""
    response = None

    def start_response(status, headers):
        nonlocal response
        response = (status, headers)

    def app(env, sr):
        sr('200 OK', [('Content-Type', 'text/plain')])
        return [b'hello']

    rv = app({}, start_response)
    return response is not None and response[0] == '200 OK'
