"""Fixture: a METHOD-LOCAL CLASS BODY containing CONTROL FLOW.

A class body's DECLARATIVE statements -- defs, nested classes, a docstring, a
plain or annotated assignment -- are emitted by ClassDefAst's own branches.  An
``if'', ``for'', ``with'', ``try'', ``del'' or augmented assignment is not: it
falls through to the ordinary statement emitters, which stamp a ``___curPos___''
the class-body helper has to declare.

The IR path refused the whole family rather than declare it, because the temp is
also what marks a frame as generated Python -- so declaring it turned the helper
into a frame that the traceback machinery had no name or position map for.  That
is fixed separately; this fixture is the family the fix unblocks.

The shapes are the ones real code actually uses.  Every one of them is in the
CPython suite corpus: ``test_enum'' builds enum members with a ``for'' over
``vars()'', selects a member with ``if''/``else'', and asserts inside the body
with ``with self.assertRaises(...)''; ``test_scope'' deletes a class-body name
with ``del'' to check it does not leak to the enclosing function.

THE LAST CHECK IS A TRACEBACK, deliberately, because values alone cannot see
what this family costs: an exception raised in a class body with control flow
must still report the line it happened on, and the frame CPython names after the
class.

Everything here is verified against real CPython by running the file directly.
"""

import sys
import traceback

r = {}


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = '%s: %s' % (type(exc).__name__, exc)


class _CM:
    def __init__(self):
        self.entered = False

    def __enter__(self):
        self.entered = True
        return self

    def __exit__(self, *a):
        return False


class Harness:
    def an_if_else(self, flag):
        class C:
            base = 'b'
            if flag:
                picked = 'yes'
            else:
                picked = 'no'
        return C.picked, C.base

    def a_for_loop_over_vars(self):
        class C:
            names = vars()
            for i in range(3):
                names['n_%d' % i] = i * 10
        return C.n_0, C.n_1, C.n_2

    def a_with_statement(self, cm):
        class C:
            a = 1
            with cm:
                b = 2
        return C.a, C.b, cm.entered

    def a_del_of_a_body_name(self):
        outer = 42

        class C:
            y = 1
            del y
        return hasattr(C, 'y'), outer

    def a_try_except(self):
        class C:
            try:
                z = 1 // 0
            except ZeroDivisionError:
                z = 'caught'
        return C.z

    def an_augmented_assignment(self):
        class C:
            n = 1
            n += 5
        return C.n

    def a_def_beside_the_control_flow(self):
        class C:
            if True:
                tag = 'set'

            def m(self):
                return self.tag
        return C().m()

    def raises_inside_the_control_flow(self, flag):
        class C:
            a = 1
            if flag:
                b = 1 // 0
        return C


h = Harness()

record('an_if_else_true', lambda: h.an_if_else(True))
record('an_if_else_false', lambda: h.an_if_else(False))
record('a_for_loop_over_vars', h.a_for_loop_over_vars)
record('a_with_statement', lambda: h.a_with_statement(_CM()))
record('a_del_of_a_body_name', h.a_del_of_a_body_name)
record('a_try_except', h.a_try_except)
record('an_augmented_assignment', h.an_augmented_assignment)
record('a_def_beside_the_control_flow', h.a_def_beside_the_control_flow)


def _frames():
    try:
        h.raises_inside_the_control_flow(True)
    except ZeroDivisionError:
        return [(f.name, f.line) for f in traceback.extract_tb(sys.exc_info()[2])]
    return 'no raise'


r['the_traceback_of_a_raise_inside_it'] = _frames()


EXPECTED = {
    'an_if_else_true': ('yes', 'b'),
    'an_if_else_false': ('no', 'b'),
    'a_for_loop_over_vars': (0, 10, 20),
    'a_with_statement': (1, 2, True),
    'a_del_of_a_body_name': (False, 42),
    'a_try_except': 'caught',
    'an_augmented_assignment': 6,
    'a_def_beside_the_control_flow': 'set',
    # The class-body frame is named for the class and carries the failing line.
    'the_traceback_of_a_raise_inside_it': [
        ('_frames', 'h.raises_inside_the_control_flow(True)'),
        ('raises_inside_the_control_flow', 'class C:'),
        ('C', 'b = 1 // 0'),
    ],
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        actual = r[key]
        print('%-5s %-38s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-38s is not in EXPECTED' % ('FAIL', extra))
