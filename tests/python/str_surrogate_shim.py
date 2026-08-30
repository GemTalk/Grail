"""A lone-surrogate ``str`` crossing into the C shim, and back.

[[str_surrogate_protocol]] made such a string first-class on the SMALLTALK side
of the str protocol.  This covers the other border it has to cross: the C shim,
where Grail's compiled ``_sre`` lives.  ``re`` is the reason this matters in
practice -- it is the one stdlib module that routinely receives an arbitrary
str straight from user code and hands it to C.

Two independent defects sat on that border, and both presented as something
other than a surrogate problem:

* ``PyUnicode_Check`` reads ``Py_TPFLAGS_UNICODE_SUBCLASS`` off the type
  address the wrapper carries, and ``CPythonShim >> typeAddrFor:`` had no
  mapping for the boxed-str classes, so they fell through to ``object``.  The
  flag was clear, the check answered false, and ``_sre`` reported
  ``TypeError: expected string or bytes-like object, got 'object'`` -- where
  ``object`` is a C ``tp_name``, not anything Python was ever handed.
* ``get_ucs4_for_string`` fetches content by sending ``encodeAsUTF8``, in
  environment 0.  Strict UTF-8 cannot encode D800..DFFF at all, and the boxed
  classes' ``doesNotUnderstand:`` hooks forward only environment 1, so the send
  was an uncatchable Smalltalk DNU rather than a Python error.

The read direction is only half a round trip.  A match must also come BACK:
``_sre`` returns a span through ``PyUnicode_Substring:from:to:``, which slices
with ``copyFrom:to:`` -- another environment-0 send, and another DNU.  So a
surrogate PATTERN and a surrogate SUBJECT are separate cases, and the checks
below keep them separate.

Measured against CPython first; this file is self-running, so
``scripts/check_python_fixtures.sh`` keeps it that way.  Every assertion is on
a ``repr``, a boolean, or a span index -- never on printing the character,
because writing a lone surrogate to a UTF-8 stream raises in CPython too.
"""

import re

PAT = '[\ud800-\udfff]'      # a character class OVER the surrogate block
SUBJ = 'a\ud800b'            # a subject with one lone surrogate in it


# --- the pattern crosses into C -------------------------------------------

def compiles_a_surrogate_pattern():
    """The original blocker, reduced to three lines.

    bleach reaches this through html5lib's ``_inputstream.py``, which builds a
    class over the surrogate block with an ``eval`` and compiles it at import
    time.  Before the fix this raised the ``got 'object'`` TypeError above."""
    return re.compile(PAT) is not None


def compiled_pattern_reads_back():
    """``.pattern`` survives the round trip unchanged.

    Compiling is not on its own proof the string arrived intact -- a mangled
    pattern compiles just as happily."""
    return re.compile(PAT).pattern == PAT


def surrogate_pattern_misses_plain_text():
    """A surrogate class matches nothing in ordinary text.

    The negative case is load-bearing: a pattern that had lost its code points
    in transit could still compile, and could still match something."""
    return re.compile(PAT).search('abc') is None


# --- the subject crosses into C -------------------------------------------

def plain_pattern_over_surrogate_subject():
    """An ordinary pattern scanning a subject that contains a surrogate.

    This is the commoner shape in the wild -- the pattern is a literal in
    library code, the surrogate arrives in the data."""
    return re.findall('[a-z]', SUBJ) == ['a', 'b']


def match_span_is_correct():
    """The span is measured in CODE POINTS, so the surrogate counts as one.

    A UTF-8 byte offset leaking out as a character index would read 1..4 here
    rather than 1..2 -- the surrogate is three bytes in the WTF-8 form the
    shim now transfers."""
    return re.search(PAT, SUBJ).span() == (1, 2)


def match_group_round_trips():
    """The matched text comes BACK out of C as the same code point.

    This is the half that ``PyUnicode_Substring`` owns.  Asserted on repr:
    the value is a lone surrogate and cannot be printed."""
    return repr(re.search(PAT, SUBJ).group()) == "'\\ud800'"


def substitution_preserves_neighbours():
    """Replacing the surrogate leaves the ordinary characters either side.

    Neighbours are the check that matters: an off-by-one in the byte/code-point
    conversion eats them, which is exactly how a mis-decode showed up in
    test_textwrap's umlaut wraps."""
    return re.sub(PAT, '?', SUBJ) == 'a?b'


def split_around_a_surrogate():
    return re.split(PAT, 'x\ud801y') == ['x', 'y']


def findall_returns_each_surrogate():
    return [repr(x) for x in re.findall(PAT, '\ud800\ud801')] == [
        "'\\ud800'", "'\\ud801'"]


# --- slicing out of a surrogate string narrows -----------------------------

def sliced_span_without_surrogate_is_plain():
    """A span containing no surrogate comes back as an ORDINARY str.

    Grail keeps the invariant that a ``PyStrSurrogate`` always holds at least
    one surrogate, so slicing out of one has to demote.  In CPython there is
    only ever one str type and this is trivially true -- which is the point:
    the check reads the same on both sides."""
    m = re.search('[a-z]', SUBJ)
    return type(m.group()).__name__ == 'str' and m.group() == 'a'


CHECKS = [
    compiles_a_surrogate_pattern,
    compiled_pattern_reads_back,
    surrogate_pattern_misses_plain_text,
    plain_pattern_over_surrogate_subject,
    match_span_is_correct,
    match_group_round_trips,
    substitution_preserves_neighbours,
    split_around_a_surrogate,
    findall_returns_each_surrogate,
    sliced_span_without_surrogate_is_plain,
]


def run():
    """Every check by name, mapping to True / False / the error text.

    Each runs in its own try/except so one failure reports as one failing name
    rather than taking down the module.  That matters more here than usual:
    the interesting failures on this border are uncatchable Smalltalk errors
    and hard shim faults, which take the whole import with them if they are
    not contained."""
    out = {}
    for fn in CHECKS:
        try:
            out[fn.__name__] = fn() is True
        except BaseException as exc:
            out[fn.__name__] = '%s: %s' % (type(exc).__name__, exc)
    return out


RESULTS = run()


if __name__ == '__main__':
    for name in sorted(RESULTS):
        print('%-4s %s' % ('OK' if RESULTS[name] is True else 'FAIL', name))
