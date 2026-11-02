"""Fixture: a size that fits Py_ssize_t but cannot be built is a MemoryError.

CPython raises MemoryError when the allocation for a result fails
(PyErr_NoMemory): ``'x'.center(2**40)'', ``'%*d' % (2**40, 1)'',
``'{:2000000000000}'.format(1)'', ``'a' * 2**40'', ``(0,) * 2**40''.  Grail
attempted each build and the session died on a fatal VM out-of-memory, which no
``except'' sees -- or, for a format-spec width, on an OutOfRange from the
allocation primitive, just as uncatchable.  Past Py_ssize_t the answers are
CPython's OverflowErrors, in its order: the argument conversion's, and
unicode_repeat's ``repeated string is too long'' (Objects/unicodeobject.c).
expandtabs takes a C int (Objects/clinic/unicodeobject.c.h).

NOT self-running, on purpose: CPython on macOS overcommits memory, so it does
not raise for these sizes -- it tries to build them.  The answers are read from
CPython's source, and the module is driven from UnbuildableSizesTestCase.
"""

r = {}


def outcome(thunk):
    try:
        thunk()
        return 'built'
    except (MemoryError, OverflowError) as e:
        return '%s: %s' % (type(e).__name__, e) if isinstance(e, OverflowError) else 'MemoryError'


HUGE = 2 ** 40
r['padding'] = [outcome(lambda: 'x'.center(HUGE)), outcome(lambda: 'x'.ljust(HUGE)),
                outcome(lambda: 'x'.rjust(HUGE)), outcome(lambda: 'x'.zfill(HUGE))]
r['format_widths'] = [outcome(lambda: '%*d' % (HUGE, 1)), outcome(lambda: '{:2000000000000}'.format(1)),
                      outcome(lambda: format(1, '2000000000000')), outcome(lambda: '%2000000000000s' % 'x')]
r['repeats'] = [outcome(lambda: 'a' * HUGE), outcome(lambda: (0,) * HUGE)]
r['past_ssize'] = [outcome(lambda: 'x'.center(2 ** 63)), outcome(lambda: 'ab' * 2 ** 62),
                   outcome(lambda: 'a\tb'.expandtabs(HUGE))]
r['the_session_goes_on'] = 'x'.center(5, '*') + ('%3d' % 7) + 'ab' * 2

EXPECTED = {
    'padding': 4 * ['MemoryError'],
    'format_widths': 4 * ['MemoryError'],
    'repeats': 2 * ['MemoryError'],
    'past_ssize': ['OverflowError: Python int too large to convert to C ssize_t',
                   'OverflowError: repeated string is too long',
                   'OverflowError: Python int too large to convert to C int'],
    'the_session_goes_on': '**x**  7abab',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))
