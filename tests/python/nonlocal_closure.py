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


def nonlocal_write_in_method_aug():
    """A method of a function-local class mutates an enclosing-function
    local via `nonlocal` + augmented assignment.  The method
    string-compiles with no lexical link to the outer temp, so the write
    must route through a setter closure cell.  This is the exact shape of
    CPython test_dict.test_str_nonstr's Key3.__eq__ (`eq_count += 1`)."""

    count = 0

    class Counter:
        def bump(self):
            nonlocal count
            count += 1

    c = Counter()
    c.bump()
    c.bump()
    c.bump()
    return count == 3


def nonlocal_write_in_method_plain():
    """Plain (non-augmented) `nonlocal x; x = v` inside a method reaches
    the enclosing binding through the setter cell too."""

    val = "before"

    class Setter:
        def go(self):
            nonlocal val
            val = "after"

    Setter().go()
    return val == "after"


def nonlocal_write_through_nested_class_method():
    """`nonlocal` write where the writing method lives in a class nested
    inside another class's method (two class boundaries) -- the setter
    cell must be FORWARDED through the intervening method's own setter
    cell, mirroring the reader-side forwarding."""

    total = 0

    class Outer:
        def make(self):
            class Inner:
                def add(self, n):
                    nonlocal total
                    total += n

            return Inner()

    it = Outer().make()
    it.add(5)
    it.add(7)
    return total == 12
