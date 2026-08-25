"""Fixture: a bulleted docstring must not move the reported frame line.

`___derivePythonLineForMethod___:ip:` finds the line by locating the caret that
`GsNMethod >> _sourceAtIp:` inserts, then taking the last ``___curPos___ := N``
at or above it.  The caret is marked like this:

    * ^1                                                            *******

and the scan used to identify it as "first line whose first non-blank character
is an asterisk".  That is not sufficient.  A Python DOCSTRING is emitted as a
multi-line Smalltalk string literal, so its own lines appear in the generated
source verbatim -- and a docstring bullet list is indistinguishable from the
caret marker:

    'Summary line.

        * first bullet
        '.

Because the scan takes the FIRST match, a bullet ABOVE the real caret wins and
the caret is located too early, so the line reported comes from higher up the
function -- here, the docstring's own position rather than the statement in
flight.

Comments are checked too, and they are NOT affected: a Python comment never
reaches the generated Smalltalk, whereas a string literal does. That asymmetry
is the whole of why this took a docstring to surface.

Every expected value below is CPython 3.14.6's. The `_getframe()` call and the
`f_lineno` read are on ONE line on purpose: Grail's frame is a snapshot taken
when `_getframe()` ran, while CPython's is live, so reading `f_lineno` on a
LATER line legitimately differs by a statement and would pin that difference
here instead of the bug.
"""

import sys


def bulleted_docstring():
    """Summary line.

    * first bullet
    * second bullet
    """
    a = 1
    return sys._getframe().f_lineno


def plain_docstring():
    """Summary line, no bullets."""
    a = 1
    return sys._getframe().f_lineno


def bulleted_comment():
    # Notes:
    # * first
    # * second
    a = 1
    return sys._getframe().f_lineno


def bulleted_string_that_is_not_a_docstring():
    """Doc."""
    text = """Not a docstring.

    * still a multi-line literal
    """
    return sys._getframe().f_lineno


def inner_caller():
    """Caller doc.

    * a bullet here too
    """
    return bulleted_docstring(), sys._getframe().f_lineno


EXPECTED = {
    'bulleted_docstring': 46,
    'plain_docstring': 52,
    'bulleted_comment': 60,
    'bulleted_string_that_is_not_a_docstring': 69,
    'inner_caller': (46, 77),
}

r = {
    'bulleted_docstring': bulleted_docstring(),
    'plain_docstring': plain_docstring(),
    'bulleted_comment': bulleted_comment(),
    'bulleted_string_that_is_not_a_docstring':
        bulleted_string_that_is_not_a_docstring(),
    'inner_caller': inner_caller(),
}


if __name__ == '__main__':
    for k in EXPECTED:
        print('%-4s %s' % ('OK' if r[k] == EXPECTED[k] else 'FAIL', k))
