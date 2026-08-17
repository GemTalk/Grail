# A traceback from a ``with'' must blame the CONTEXT MANAGER EXPRESSION, not the
# statement and not the body.
#
# CPython pins a raise from a manager's __init__ / __enter__ / __exit__ to the
# manager expression precisely so that ``with A(), B(), C():'' says WHICH one
# failed -- it is the only position that can distinguish them.
#
# Grail reported whatever ___curPos___ happened to hold, which is the enclosing
# statement's position:
#
#   * __enter__ raising looked correct BY ACCIDENT -- the body had not run yet,
#     so ___curPos___ still pointed at the ``with'' line.
#   * __init__ raising (evaluating the manager expression) and __exit__ raising
#     (after the body) both reported the BODY's last statement instead.
#
# WithAst now stores the item's own span before evaluating the expression and
# again before __exit__, using the same literal-array form every statement uses.
#
# test_with NestedWith.testExceptionLocation.

import traceback

r = {}


class Dummy:
    def __enter__(self): return self
    def __exit__(self, *exc_info): return False


class InitRaises:
    def __init__(self): raise RuntimeError('init')


class EnterRaises:
    def __enter__(self): raise RuntimeError('enter')
    def __exit__(self, *exc_info): return False


class ExitRaises:
    def __enter__(self): return self
    def __exit__(self, *exc_info): raise RuntimeError('exit')


def init_raises():
    try:
        with Dummy(), InitRaises() as cm, Dummy() as d:      # line 47
            pass
    except Exception as e:
        return e


def enter_raises():
    try:
        with EnterRaises(), Dummy() as d:                    # line 55
            pass
    except Exception as e:
        return e


def exit_raises():
    try:
        with ExitRaises(), Dummy() as d:                     # line 63
            pass
    except Exception as e:
        return e


def _first(fn):
    return traceback.extract_tb(fn().__traceback__)[0]


# --- the frame names the manager's line, not the body's ------------------------
# Each is its function's ``with'' line.  Before this, init and exit reported the
# ``pass'' one line further down.

r['init_raises_line'] = repr(
    [_first(init_raises).lineno, init_raises.__code__.co_firstlineno + 2])
r['enter_raises_line'] = repr(
    [_first(enter_raises).lineno, enter_raises.__code__.co_firstlineno + 2])
r['exit_raises_line'] = repr(
    [_first(exit_raises).lineno, exit_raises.__code__.co_firstlineno + 2])
r['end_lineno_matches'] = repr(
    [_first(f).end_lineno == _first(f).lineno
     for f in (init_raises, enter_raises, exit_raises)])


# The COLUMNS come with it, which is what actually identifies WHICH manager
# failed: the span is stored as a literal array, exactly as every statement
# stores its own, so ___pushFrameFromPos___ reads PEP 657 columns back out.
r['init_raises_columns'] = repr(
    [_first(init_raises).colno, _first(init_raises).end_colno])


# --- KNOWN GAP, recorded rather than endorsed ----------------------------------
# A NESTED function loses the columns (the line is still right).  Its traceback
# frame is built by walking the Smalltalk stack rather than from the live
# ___curPos___, and that walk recovers only a LINE from the generated source --
# it pushes colno/end_colno as None.  Reaching them means teaching the walk to
# carry the whole span, not just its first element.  This is the half of
# test_with's testExceptionLocation that still fails, because its manager
# expressions live in functions nested inside the test method.
def _nested_case():
    def inner():
        try:
            with Dummy(), InitRaises() as cm:
                pass
        except Exception as e:
            return e
    f = traceback.extract_tb(inner().__traceback__)[0]
    return [f.colno, f.end_colno]


r['nested_function_columns_is_a_known_gap'] = repr(_nested_case())


EXPECTED = {
    'end_lineno_matches': '[True, True, True]',
    'enter_raises_line': '[55, 55]',
    'exit_raises_line': '[63, 63]',
    'init_raises_columns': '[22, 34]',
    'init_raises_line': '[47, 47]',
}

GRAIL_ONLY = {
    'nested_function_columns_is_a_known_gap': '[None, None]',
}


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-32s %s %s' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    for k in sorted(GRAIL_ONLY):
        actual = r[k]
        print('%-32s %s %s' % (k, 'XPASS' if actual == GRAIL_ONLY[k] else 'XFAIL', actual))
