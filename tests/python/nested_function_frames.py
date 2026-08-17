"""A nested ``def`` must get its own traceback frame.

Driven by PythonTests>>NestedFunctionFramesTestCase.

Grail compiles a nested ``def`` to a BLOCK -- it has to: only a block can close
over the enclosing function's locals, only a block has no class to live in, and
only a fresh block copy per execution gives CPython's distinct function object
per ``def''.  The traceback walk merged every block into its home method,
because that is right for the OTHER things blocks are used for (a comprehension
body, a ``try'' body, an ``except'' handler -- CPython has no frame for any of
them).  So nested functions had NO traceback frames at all: ``outer'' calling
``inner'' reported ONE frame where CPython reports two, and three levels still
reported one.

Told apart by ARGUMENT COUNT: codegen calls a Python function block as
``[:___positional___ :___kwargs___ | ...]'', and nothing else in env 1 emits a
two-argument block (measured across comprehensions, try bodies, except handlers
and the generator machinery -- all zero-argument).

The counts below were taken from CPython 3.14.6, not assumed.  Run this file
directly to confirm; ``scripts/check_python_fixtures.sh'' does so in CI.

The NAME checks matter as much as the counts.  A block carries no selector of
its own, so the frame's name is recovered by scanning the home method for the
``PyCode name:'' its codegen emitted -- a wrong scan yields a frame with the
right shape and a misleading name, which a bare count would not catch.
"""

import traceback


def _frames(fn):
    """The traceback fn() raises, outermost first, WITHOUT this helper's own
    frame -- the [1:] keeps every count below equal to the number of Python
    functions entered, so the expected numbers read straight off the source."""
    try:
        fn()
    except ZeroDivisionError as e:
        return traceback.extract_tb(e.__traceback__)[1:]
    return None


def _names(fn):
    return [f.name for f in _frames(fn)]


def _linenos(fn):
    return [f.lineno for f in _frames(fn)]


def _offsets(fn):
    """Frame line numbers relative to fn's own ``def'' line."""
    base = fn.__code__.co_firstlineno
    return [n - base for n in _linenos(fn)]


def module_level():
    """The nested function reads nothing from the enclosing scope."""
    def inner():
        1 / 0
    inner()


def reads_a_local():
    """A closure over a local -- the shape that FORCES the block encoding."""
    d = 0
    def inner():
        return 1 / d
    inner()


def takes_a_parameter():
    def middle(n):
        def leaf():
            return 1 / n
        return leaf()
    return middle(0)


def two_deep():
    def a():
        def b():
            1 / 0
        b()
    a()


class Holder:
    def method(self):
        def inner():
            1 / 0
        inner()


def in_a_method():
    Holder().method()


def raises_from_a_comprehension():
    """The negative control: a comprehension body is a block too, and must NOT
    gain a frame.  This is what stops the fix over-reaching."""
    def inner():
        return [1 / 0 for _ in range(1)]
    inner()


def checks():
    return {
        # --- one frame per Python function, nested or not ---
        "module_level_frames": len(_names(module_level)) == 2,
        "reads_a_local_frames": len(_names(reads_a_local)) == 2,
        "takes_a_parameter_frames": len(_names(takes_a_parameter)) == 3,
        "two_deep_frames": len(_names(two_deep)) == 3,
        "in_a_method_frames": len(_names(in_a_method)) == 3,
        # --- and it is named for the ``def'', not for its home method ---
        "module_level_names": _names(module_level) == ["module_level", "inner"],
        "two_deep_names": _names(two_deep) == ["two_deep", "a", "b"],
        "takes_a_parameter_names":
            _names(takes_a_parameter) == ["takes_a_parameter", "middle", "leaf"],
        "in_a_method_names": _names(in_a_method) == ["in_a_method", "method", "inner"],
        # --- each frame is parked at ITS OWN statement ---
        # Offsets from the enclosing ``def'', so the numbers survive the
        # fixture moving in the file.  They run BACKWARDS -- the outer frame
        # sits at the ``inner()'' CALL, which follows the nested body it calls
        # -- and that is the point: a frame that borrowed its home method's
        # position, or the pending line of the block below it, would come out
        # ascending or all-equal.
        "module_level_lines": _offsets(module_level) == [4, 3],
        "two_deep_lines": _offsets(two_deep) == [5, 4, 3],
        # --- negative control: a comprehension is still NOT a frame ---
        "comprehension_adds_no_frame":
            len(_names(raises_from_a_comprehension)) == 2,
    }


RESULTS = checks()

#: What each subject actually produced, for the failure message.  A boolean
#: alone says a frame chain is wrong but not how, and the whole point of these
#: checks is that a WRONG chain is the plausible outcome -- right length, wrong
#: names -- so the driver quotes this rather than making the next reader
#: re-derive it.
ACTUAL = " | ".join(
    "%s: names=%s offsets=%s" % (fn.__name__, _names(fn), _offsets(fn))
    for fn in (module_level, reads_a_local, takes_a_parameter, two_deep,
               in_a_method, raises_from_a_comprehension)
)


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    for k, v in RESULTS.items():
        print('%-4s %s' % ('OK' if v is True else 'FAIL', k))
    print()
    for k in ACTUAL:
        print('     %s' % k)
