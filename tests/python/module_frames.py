"""Fixtures for MODULE-SCOPE traceback frames -- CPython's ``<module>''.

Driven by PythonTests>>ModuleFrameTestCase.  Each check answers True when the
behaviour matches CPython, so a failure names the specific rule.

WHAT WAS MISSING, AND IT WAS NOT JUST THE FRAME.  Grail's traceback walk
IDENTIFIES a Python frame by finding a ``___curPos___'' store in it, and module
bodies had none -- the store was emitted only inside functions.  So an exception
caught at module scope produced NO TRACEBACK AT ALL: not a traceback missing its
``<module>'' entry, but an empty one, with the frames of every function the
exception passed through missing too.  A script whose exception is caught in its
own top level printed the exception line and nothing else.

exec() AND eval() ARE THE SAME QUESTION.  Their bodies are module bodies -- a
compiled doit rather than a method, which is why they have no selector and land
among the blocks in the walk -- and CPython names their frame ``<module>'' too.
Two things about them are knowable only at the exec: the FILENAME, which is
compile()'s second argument and reaches the frame through a literal codegen
stamps into the body, and the NAMES the body can see, which live in the scope
the doit was compiled against rather than in any Smalltalk temporary.

Run this file under CPython (``python3 tests/python/module_frames.py'') to see
what it produces.  Every check here answers identically under CPython and Grail.
"""

import sys
import traceback


def _boom():
    raise ValueError("boom")                      # line 31


def _frames(exc):
    return [(fs.name, fs.lineno) for fs in traceback.extract_tb(exc.__traceback__)]


# --- an exception caught at module scope ------------------------------------
try:
    _boom()                                       # line 40
except ValueError as _e:
    _module_catch = _frames(_e)

try:
    raise KeyError("top")                         # line 45
except KeyError as _e:
    _module_raise = _frames(_e)


def a_module_scope_catch_has_frames():
    """Two frames: the module at the CALL, then the function at the raise.
    This answered [] -- no frames at all -- before module bodies recorded a
    position, which is the whole reason this fixture exists."""
    return _module_catch == [('<module>', 40), ('_boom', 31)]


def a_module_scope_raise_names_the_module():
    """One frame, named ``<module>'', at the raising line."""
    return _module_raise == [('<module>', 45)]


# --- exec() and eval() ------------------------------------------------------
def an_exec_body_is_a_module_frame():
    """Its frame is ``<module>'', and its co_filename is compile()'s second
    argument -- not the file of whatever caught the exception, which is where
    every other frame's filename comes from."""
    code = compile("raise IndexError('x')", "<made up>", "exec")
    try:
        exec(code, {}, {})
    except IndexError as e:
        tb = traceback.extract_tb(e.__traceback__)
        last = tb[-1]
        return (last.name == '<module>'
                and last.filename == '<made up>'
                and last.lineno == 1)
    return False


def an_exec_body_keeps_the_frames_around_it():
    """The frames OUTSIDE the exec survive it.  They did not: the exec'd body
    became the walk's pending frame, nothing ever matched it, and every frame
    beyond it was skipped as already-unwound -- so a three-frame traceback came
    back with one."""
    def middle():
        exec(compile("raise IndexError('x')", "<made up>", "exec"), {}, {})

    def outer():
        try:
            middle()
        except IndexError as e:
            return [fs.name for fs in traceback.extract_tb(e.__traceback__)]
    return outer() == ['outer', 'middle', '<module>']


def an_eval_suggests_a_name_from_its_own_scope():
    """``Did you mean'' draws on the frame's locals, and for an eval'd body
    those are the mapping eval() was given rather than any temporary of the
    frame it appears in.

    Read off the FULL format_exception and not str(e): the suggestion is
    something the formatter adds, the exception's own message never carries it,
    and the candidates come from the TRACEBACK's innermost frame -- so
    format_exception_only, which is handed no traceback, offers none either."""
    def func():
        abcdef = 1
        eval("abcdeg", globals().copy(), locals())

    try:
        func()
    except NameError as e:
        return "Did you mean: 'abcdef'?" in ''.join(
            traceback.format_exception(e))
    return False


def an_exec_body_shows_no_source_line():
    """A ``<...>'' filename is not a path, so CPython renders the frame with no
    source line at all -- linecache has nothing for a name that was never a
    file.  Grail carries the compiled statement in the position literal codegen
    emits, and printing it there is a line CPython never shows."""
    code = compile("1 / 0", "<does not exist>", "exec")
    try:
        exec(code, {}, {})
    except ZeroDivisionError as e:
        return ''.join(traceback.format_exception(e)).endswith(
            '  File "<does not exist>", line 1, in <module>\n'
            'ZeroDivisionError: division by zero\n')
    return False


CHECKS = [
    a_module_scope_catch_has_frames,
    a_module_scope_raise_names_the_module,
    an_exec_body_is_a_module_frame,
    an_exec_body_keeps_the_frames_around_it,
    an_eval_suggests_a_name_from_its_own_scope,
    an_exec_body_shows_no_source_line,
]

RESULTS = {}
for _fn in CHECKS:
    try:
        RESULTS[_fn.__name__] = _fn() is True
    except Exception as _exc:
        RESULTS[_fn.__name__] = type(_exc).__name__ + ': ' + str(_exc)


if __name__ == '__main__':
    for _fn in CHECKS:
        _got = RESULTS[_fn.__name__]
        print('%-4s %s' % ('OK' if _got is True else 'FAIL', _fn.__name__))
