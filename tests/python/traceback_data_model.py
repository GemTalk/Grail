# Fixture for TracebackTestCase (Phase 1 of the traceback design,
# docs/Python_Traceback_Design.md).  Everything here is pure Python and needs
# no runtime-populated traceback (Phase 2 provides those) -- it exercises the
# traceback module's data model: FrameSummary / StackSummary, the PEP 657
# column slicing, and the exc.__traceback__ / with_traceback slot.
#
# The PyTraceback linked-list walk (extract_tb) is exercised separately from
# the Smalltalk side of TracebackTestCase, which can construct PyCode / PyFrame
# / PyTraceback directly.

import traceback


def _frame_summary_slicing():
    # A FrameSummary carrying PEP 657 columns recovers the sub-expression the
    # location points at, exactly as test_dictcomps.test_exception_locations
    # does:  line[colno - indent : end_colno - indent].  The raw line is
    # indented 16 spaces; FrameSummary stores it stripped, and colno/end_colno
    # are absolute, so the 16-space indent cancels.
    raw = "                {x:x for x in BrokenIter(init_raises=True)}"
    fs = traceback.FrameSummary(
        "<test>", 12, "init_raises", line=raw,
        end_lineno=12, colno=30, end_colno=58)
    indent = 16
    return (
        fs.lineno == 12
        and fs.end_lineno == 12
        and fs.colno == 30
        and fs.end_colno == 58
        and fs.name == "init_raises"
        and fs.filename == "<test>"
        and fs.line[fs.colno - indent:fs.end_colno - indent] == "BrokenIter(init_raises=True)"
    )


def _frame_summary_tuple_shape():
    # CPython FrameSummary is a 4-tuple (filename, lineno, name, line) for
    # indexing / iteration, independent of the extra column fields.
    fs = traceback.FrameSummary("f.py", 7, "g", line="  x = 1")
    return (
        len(fs) == 4
        and fs[0] == "f.py"
        and fs[1] == 7
        and fs[2] == "g"
        and fs[3] == "x = 1"                # stored stripped
        and list(fs) == ["f.py", 7, "g", "x = 1"]
        and fs == ("f.py", 7, "g", "x = 1")
    )


def _stacksummary_format():
    fs = traceback.FrameSummary("f.py", 7, "g", line="x = 1")
    rendered = traceback.StackSummary([fs]).format()
    return (
        isinstance(rendered, list)
        and len(rendered) == 1
        and 'File "f.py", line 7, in g' in rendered[0]
    )


def _default_traceback_is_none():
    # A never-raised exception has no traceback; the slot answers None (not a
    # BoundMethod-wrapped accessor, the pre-Phase-1 behaviour).  Stays None
    # even after Phase 2, which only populates it during an actual raise.
    return ValueError("x").__traceback__ is None


def _with_traceback_returns_self():
    e = ValueError("x")
    returned = e.with_traceback(None)
    return returned is e and e.__traceback__ is None


def _extract_tb_of_none_is_empty():
    # extract_tb(None) is a valid empty StackSummary (indexing [0] would
    # IndexError -- which is exactly the pre-Phase-1 stub failure this whole
    # effort removes for the populated case).
    result = traceback.extract_tb(None)
    return len(result) == 0


RESULTS = {
    'frame_summary_slicing': _frame_summary_slicing(),
    'frame_summary_tuple_shape': _frame_summary_tuple_shape(),
    'stacksummary_format': _stacksummary_format(),
    'default_traceback_is_none': _default_traceback_is_none(),
    'with_traceback_returns_self': _with_traceback_returns_self(),
    'extract_tb_of_none_is_empty': _extract_tb_of_none_is_empty(),
}
