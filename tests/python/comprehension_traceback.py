# Fixture for TracebackTestCase>>testComprehensionExceptionTraceback (Phase 2 of
# the traceback design): an exception from a comprehension's iterator protocol
# now carries a real traceback whose innermost-caught frame is located at the
# iterable expression (PEP 657) inside the enclosing function.
#
# This exercises the WHOLE runtime path -- FunctionDefAst def-time PyCode stamp,
# the ComprehensionAst frame-capture wrapper, and traceback.extract_tb -- that
# greens test_dictcomps/test_setcomps test_exception_locations.  The exact
# column arithmetic is checked there; here we assert the mechanism populated a
# frame at the right function/line with the iterable in its source line.

import traceback


class _Boom:
    def __iter__(self):
        raise ValueError("boom")


def _run():
    def g():
        try:
            return [y for y in _Boom()]
        except Exception as e:
            return e

    exc = g()
    tb = traceback.extract_tb(exc.__traceback__)
    frame = tb[0] if tb else None
    return {
        'has_frame': frame is not None,
        'name_is_g': (frame.name == 'g') if frame else False,
        'line_has_boom': ('_Boom' in frame.line) if (frame and frame.line) else False,
        'colno_is_int': isinstance(frame.colno, int) if frame else False,
        # colno/end_colno span exactly the iterable call `_Boom()` (7 chars).
        'iterable_span_width': (
            frame.end_colno - frame.colno == len('_Boom()')
        ) if (frame and frame.colno is not None and frame.end_colno is not None) else False,
        # `return [y for y in _Boom()]` is indented 12 spaces (_run->g->try);
        # colno/end_colno are absolute, frame.line is stripped of those 12.
        'iterable_span_is_boom': (
            frame.line[frame.colno - 12:frame.end_colno - 12] == '_Boom()'
        ) if (frame and frame.line and frame.colno is not None) else False,
    }


RESULTS = _run()
