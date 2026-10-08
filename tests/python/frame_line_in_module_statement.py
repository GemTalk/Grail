"""Fixture: a module frame paused inside a def or class statement reports
that statement's line, not a line from a method the statement compiles.

A module body is compiled to one Smalltalk method, and it embeds the source of
every method it compiles as a STRING LITERAL, with that method's own
``___curPos___ := N`` stores in it.  The frame-line scan took the last store
at or above the caret by searching the text, so it found the stores inside
those literals as well.  So while a ``class`` statement was still running (its
``__init_subclass__``, a class decorator, a function decorator), the module
frame reported the last line of the last method embedded before the caret.
Measured: the class statement on line 44 read as line 50, on both codegen
paths, because a module body is text-compiled either way (issue #1137).
With the fix reverted, init_subclass, init_subclass_stack and class_decorator
fail.  function_decorator holds either way (no embedded store precedes that
caret), and plain_call_control is the control.

Every expected value below is CPython 3.14's.  Each probe reads ``f_lineno``
on the same line as ``_getframe()``.  Grail's frame is a snapshot and
CPython's is live, so a later read would legitimately differ.
"""

import sys
import traceback

seen = {}


def caller_line(key, depth=2):
    seen[key] = sys._getframe(depth).f_lineno


def caller_stack_line(key):
    # extract_stack()[-3]: [-1] is this function, [-2] the hook that called
    # it, [-3] the module frame in the middle of its statement.
    seen[key] = traceback.extract_stack()[-3].lineno


class Base:
    def __init_subclass__(cls, **kw):
        caller_line('init_subclass')
        caller_stack_line('init_subclass_stack')


class Sub(Base):
    def method(self, a, *, k=1):
        total = a + k
        return total

    def other(self, *args, **kw):
        return args


def class_decorator(cls):
    caller_line('class_decorator')
    return cls


@class_decorator
class Decorated:
    def method(self, a, *, k=1):
        total = a + k
        return total


def function_decorator(f):
    caller_line('function_decorator')
    return f


@function_decorator
def decorated(a, *, k=1):
    total = a + k
    return total


caller_line('plain_call_control', depth=1)


# A decorated statement has two header lines.  CPython reports the decorator
# line while the decorator runs, and Grail reports the class or def line.  That
# is a separate difference, older than this fixture and not what it is about.
# So these two checks ask only that the line belongs to the statement's header
# and not to a method body it compiles, which is where the bug put it.
HEADERS = {
    'class_decorator': (58, 59),
    'function_decorator': (70, 71),
}

EXPECTED = {
    'init_subclass': 44,
    'init_subclass_stack': 44,
    'class_decorator': True,
    'function_decorator': True,
    'plain_call_control': 76,
}

r = dict(seen)
for _k, _lines in HEADERS.items():
    r[_k] = r[_k] in _lines


if __name__ == '__main__':
    for k in EXPECTED:
        print('%-4s %s' % ('OK' if r[k] == EXPECTED[k] else 'FAIL', k))
