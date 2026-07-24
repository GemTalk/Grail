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


def freevar_through_nested_class_method():
    """A free variable referenced by a nested class's method, where the
    nested class is defined inside a METHOD of an outer class -- so the
    cell must be forwarded THROUGH the intervening method's own cell
    (two class boundaries between the reference and the binding).  This
    is the exact shape of CPython test_dict.test_update's BogonIter
    raising the enclosing-function's Exc.  Pre-fix the outer method
    string-compiled with a bare, undefined reference (codegen gap)."""

    class Marker(Exception):
        pass

    class Outer:
        def make_iter(self):
            class Bogon:
                def __init__(self):
                    self.i = 1

                def __next__(self):
                    if self.i:
                        self.i = 0
                        return 'a'
                    raise Marker

            return Bogon()

    it = Outer().make_iter()
    first = it.__next__()
    try:
        it.__next__()
        raised = False
    except Marker:
        raised = True
    return first == 'a' and raised
