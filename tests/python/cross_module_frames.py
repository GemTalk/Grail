"""Fixtures for the FILENAME of a traceback frame whose function is defined in
another module.

Driven by PythonTests>>CrossModuleFrameTestCase.  Each check answers True when
the behaviour matches CPython, so a failure names the specific rule.

WHAT WAS WRONG.  Every frame but the module body took its filename from the
CATCHING code object.  ``___codeForMethod___'' described that as "so every frame
in a traceback names the module it came from" and its own comment admitted the
rest: it is a different file whenever the exception crosses a module.  So a
function defined in helper.py and called from main.py rendered as

    File <main.py>, line 9, in raises

-- the right line and columns against the WRONG FILE.  And because
FrameSummary prefers linecache over the embedded source line, the frame then
printed line 9 OF THE CALLER, with a caret line under text from another module
entirely.  Every program of more than one module was affected, which is all of
them.

A method's own class knows better: a Python function of module X is compiled as
a method on class X, whose module body carries the ``___pyFile___'' stamp
codegen puts there.  The checks below are on the basename and on the rendered
source line, so they say nothing about where the checkout lives.

Run this file under CPython (``python3 tests/python/cross_module_frames.py'') to
see what it produces.  Every check here answers identically under CPython and
Grail.
"""

import os
import sys
import traceback

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import cross_module_helper                                    # noqa: E402


def _frames(exc):
    return [(fs.name, os.path.basename(fs.filename), fs.lineno, fs.line)
            for fs in traceback.extract_tb(exc.__traceback__)]


def _catch(fn):
    try:
        fn()
    except ZeroDivisionError as e:
        return _frames(e)
    return None


def a_frame_names_the_file_its_function_came_from():
    """The innermost frame is in the helper, not in this file -- and the source
    line it renders is the helper's, which is what the wrong filename actually
    cost: linecache read the same line number out of the calling file."""
    return _catch(cross_module_helper.raises)[-1] == (
        'raises', 'cross_module_helper.py', 9, 'return 1 / 0')


def the_calling_frame_still_names_the_calling_file():
    """The frame in THIS module is unaffected -- the fix must not simply move
    the confusion the other way."""
    frames = _catch(cross_module_helper.raises)
    return frames[0][1] == 'cross_module_frames.py'


def a_nested_def_in_another_module_names_that_module():
    """A nested def is a Smalltalk block inside its enclosing method, and takes
    its file from the same place."""
    return _catch(cross_module_helper.raises_from_nested)[-1] == (
        'inner', 'cross_module_helper.py', 14, 'return 1 / 0')


def a_lambda_in_another_module_names_that_module():
    """So does a lambda."""
    return _catch(cross_module_helper.raises_from_lambda)[-1] == (
        '<lambda>', 'cross_module_helper.py', 19, 'return (lambda: 1 / 0)()')


def an_exec_body_still_keeps_compiles_filename():
    """The <module> frame of an exec()'d body reads its filename from a stamp
    codegen puts in the body itself, which is the only place compile()'s second
    argument survives.  That has to keep winning over the class the doit is
    evaluated against."""
    code = compile("raise IndexError('x')", "<made up>", "exec")
    try:
        exec(code, {}, {})
    except IndexError as e:
        return [(fs.name, fs.filename)
                for fs in traceback.extract_tb(e.__traceback__)][-1] == (
                    '<module>', '<made up>')
    return False


def an_exec_defined_function_keeps_compiles_filename():
    """A function DEFINED by exec()'d code has neither of the two things a
    filename was read from.  It is compiled as a block inside the doit's own
    method, so there is no module class to ask, and it is not the body that
    carries the ``___pyFile___'' stamp holding compile()'s second argument.  So
    its frame fell back to the CATCHING code object -- this file -- and an
    exec'd helper was reported as living in whatever module happened to call
    it, one line under a <module> frame saying '<made up>' about the same
    source.  The calling frame in this file has to stay this file, so the check
    is on both."""
    ns = {}
    exec(compile("def helper():\n    return 1 / 0\n", "<made up>", "exec"), ns)
    try:
        ns['helper']()
    except ZeroDivisionError as e:
        frames = [(fs.name, fs.filename, fs.lineno)
                  for fs in traceback.extract_tb(e.__traceback__)]
        return (frames[-1] == ('helper', '<made up>', 2)
                and os.path.basename(frames[0][1]) == 'cross_module_frames.py')
    return False


CHECKS = [
    a_frame_names_the_file_its_function_came_from,
    the_calling_frame_still_names_the_calling_file,
    a_nested_def_in_another_module_names_that_module,
    a_lambda_in_another_module_names_that_module,
    an_exec_body_still_keeps_compiles_filename,
    an_exec_defined_function_keeps_compiles_filename,
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
