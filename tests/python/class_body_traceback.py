"""Fixture: an exception raised while a METHOD-LOCAL CLASS BODY runs.

CPython gives a class body a frame of its own, NAMED FOR THE CLASS, between the
frame of the def that contains the ``class'' statement and whatever the body
called:

    make        line of ``class C:''
    C           line of the failing statement inside the body

Grail's two codegen paths arrive at that differently.  The TEXT path inlines the
class build into the enclosing def, so there is no separate frame and the
enclosing entry reports the body's line instead.  The IR path compiles the body
into a HELPER METHOD of its own, which is a real frame and can therefore carry
the class-body entry CPython describes.

ONE SHAPE IS AN XFAIL: a class nested INSIDE a method-local class body.  Only
the outermost body becomes a helper of its own, so the inner build is inline
within it and Grail reports the failing line under the OUTER class's name, one
frame short of CPython.  The line is there, which is what this cut was for.

WHAT THIS FIXTURE PINS is that the failing line is REPORTED AT ALL.  The helper
had neither a Python name nor a derivable line, so the traceback capture walk
skipped it, and the innermost entry became the enclosing def suspended at its
``class C:'' statement -- the line where the failure happened was simply gone:

    CPython     make @ 'class C:'   +   C @ 'b = 1 // 0'
    Grail IR    make @ 'class C:'                           <- the line LOST

Frames are compared by NAME and SOURCE TEXT rather than by line number, so
editing this file does not rewrite the expectations.

Everything here is verified against real CPython by running the file directly.
"""

import sys
import traceback

r = {}


def frames_of(fn):
    """(name, source-line) for each traceback entry, innermost last."""
    try:
        fn()
    except Exception:
        return [(f.name, f.line) for f in traceback.extract_tb(sys.exc_info()[2])]
    return 'no raise'


class Harness:
    def a_simple_class_body(self):
        class C:
            a = 1
            b = 1 // 0
        return C

    def a_class_body_calling_a_function(self):
        class D:
            v = int('not a number')
        return D

    def a_nested_class_body(self):
        class Outer:
            class Inner:
                w = 1 // 0
        return Outer

    def raises_outside_any_class(self):
        x = 1 // 0
        return x


h = Harness()

r['a_simple_class_body'] = frames_of(h.a_simple_class_body)
r['a_class_body_calling_a_function'] = frames_of(h.a_class_body_calling_a_function)
r['a_nested_class_body'] = frames_of(h.a_nested_class_body)
r['raises_outside_any_class'] = frames_of(h.raises_outside_any_class)


EXPECTED = {
    # The class-body frame is present, named for the class, at the failing line.
    'a_simple_class_body': [
        ('frames_of', 'fn()'),
        ('a_simple_class_body', 'class C:'),
        ('C', 'b = 1 // 0'),
    ],
    'a_class_body_calling_a_function': [
        ('frames_of', 'fn()'),
        ('a_class_body_calling_a_function', 'class D:'),
        ('D', "v = int('not a number')"),
    ],
    # XFAIL.  Only the OUTERMOST method-local class body becomes a helper of
    # its own; a class nested inside it is built inline within that helper,
    # exactly as the text builds it inline in the enclosing def.  So Grail
    # reports the failing line -- which is the whole point of this fixture --
    # but under the OUTER class's name, one frame short of CPython.
    'a_nested_class_body': [
        ('frames_of', 'fn()'),
        ('a_nested_class_body', 'class Outer:'),
        ('Outer', 'class Inner:'),
        ('Inner', 'w = 1 // 0'),
    ],
    # The control: nothing about an ordinary frame changes.
    'raises_outside_any_class': [
        ('frames_of', 'fn()'),
        ('raises_outside_any_class', 'x = 1 // 0'),
    ],
}


XFAIL = {'a_nested_class_body'}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        actual = r[key]
        if key in XFAIL:
            # EXPECTED holds CPython's answer, so this agrees HERE and differs
            # under Grail -- XFAIL either way, never XPASS.
            status = 'XFAIL' if actual == EXPECTED[key] else 'FAIL'
        else:
            status = 'OK' if actual == EXPECTED[key] else 'FAIL'
        print('%-5s %-34s -> %r' % (status, key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-34s is not in EXPECTED' % ('FAIL', extra))
