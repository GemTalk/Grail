"""Fixtures for PEP 678 __notes__ and TracebackException equality.

Driven by PythonTests>>TracebackTestCase.  Each function answers True when
the behaviour matches CPython, so a failure names the specific rule.
"""

import traceback


def notes_render_under_the_message():
    """add_note text appears on its own line(s) after the exception line."""
    e = ValueError(123)
    vanilla = ''.join(traceback.format_exception_only(e))
    if vanilla != 'ValueError: 123\n':
        return False

    e.add_note('My Note')
    if ''.join(traceback.format_exception_only(e)) != vanilla + 'My Note\n':
        return False

    e.add_note('Second')
    return (''.join(traceback.format_exception_only(e))
            == vanilla + 'My Note\nSecond\n')


def notes_are_absent_until_the_first_add_note():
    """CPython leaves __notes__ ABSENT rather than an empty list, so a bare
    exception renders no note lines and reading the attribute raises."""
    e = ValueError('x')
    try:
        e.__notes__
        return False
    except AttributeError:
        pass
    return ''.join(traceback.format_exception_only(e)) == 'ValueError: x\n'


def notes_attribute_is_writable_and_deletable():
    """__notes__ is a plain writable attribute in CPython.  Grail keeps it in
    the dynamic-instVar slot named for the attribute itself, so assignment and
    deletion go through the ordinary attribute path."""
    e = ValueError(1)

    e.add_note('one')
    if e.__notes__ != ['one']:
        return False

    # Deletion returns it to the ABSENT state, so a read raises again...
    del e.__notes__
    try:
        e.__notes__
        return False
    except AttributeError:
        pass
    if ''.join(traceback.format_exception_only(e)) != 'ValueError: 1\n':
        return False

    # ...and add_note recreates it from scratch rather than resurrecting the
    # old list.
    e.add_note('two')
    if e.__notes__ != ['two']:
        return False

    # Direct assignment is visible to both a read and the formatter.
    e.__notes__ = ['a', 'b']
    return (e.__notes__ == ['a', 'b']
            and ''.join(traceback.format_exception_only(e))
                == 'ValueError: 1\na\nb\n')


def non_list_notes_render_as_repr():
    """__notes__ set to a non-sequence (or to a str/bytes, which are
    sequences but are one value, not a note-per-character) renders as a single
    repr() line -- CPython's fallback branch."""
    e = ValueError(2)
    base = 'ValueError: 2\n'

    e.__notes__ = 'please do not explode me'
    if ''.join(traceback.format_exception_only(e)) != base + "'please do not explode me'\n":
        return False

    e.__notes__ = b'please do not show me as numbers'
    if ''.join(traceback.format_exception_only(e)) != base + "b'please do not show me as numbers'\n":
        return False

    class BadThing:
        def __str__(self):
            return 'bad str'

        def __repr__(self):
            return 'bad repr'

    e.__notes__ = BadThing()
    if ''.join(traceback.format_exception_only(e)) != base + 'bad repr\n':
        return False

    # A non-str ITEM inside the list uses str(), not repr().
    e.__notes__ = [BadThing(), 'Final Note']
    return (''.join(traceback.format_exception_only(e))
            == base + 'bad str\nFinal Note\n')


def unprintable_notes_do_not_escape_the_formatter():
    """A traceback has to print even when the objects in it raise on repr()."""
    class Unprintable:
        def __repr__(self):
            raise ValueError('bad value')

    e = ValueError(3)
    base = 'ValueError: 3\n'

    e.__notes__ = Unprintable()
    if ''.join(traceback.format_exception_only(e)) != base + '<__notes__ repr() failed>\n':
        return False

    e.__notes__ = [Unprintable(), 'Final Note']
    return (''.join(traceback.format_exception_only(e))
            == base + '<note str() failed>\nFinal Note\n')


def broken_getattr_is_reported_not_propagated():
    """getattr's default only absorbs AttributeError.  An exception whose
    __getattr__ raises something else must not take the formatter down: CPython
    reports the swallowed error as a note of its own."""
    class BrokenException(Exception):
        broken = False

        def __getattr__(self, name):
            if self.broken:
                raise ValueError('no ' + name)

    e = BrokenException(123)
    # Compare against the report taken BEFORE breaking it, as CPython's own
    # test does, rather than against a literal: defining __getattr__ currently
    # suppresses the exception's message here (this renders as
    # 'BrokenException\n', where CPython gives 'BrokenException: 123\n'), which
    # is a separate divergence in str() of an exception, not a notes problem.
    vanilla = ''.join(traceback.format_exception_only(e))
    e.broken = True
    return (''.join(traceback.format_exception_only(e))
            == vanilla + "Ignored error getting __notes__: ValueError('no __notes__')\n")


def traceback_exception_equality_is_by_content():
    """Two TracebackExceptions built from equivalent exceptions are equal --
    which is why the message is stored as a string rather than the exception
    being kept and compared by identity."""
    excs = []
    for _ in range(2):
        try:
            1 / 0
        except Exception as e:
            excs.append(traceback.TracebackException.from_exception(e))
    if not (excs[0] == excs[1]):
        return False
    if excs[0] is excs[1]:
        return False

    # ...and a different message is not equal.
    a = traceback.TracebackException(ValueError, ValueError('a'), None)
    b = traceback.TracebackException(ValueError, ValueError('b'), None)
    if a == b:
        return False

    # ...nor is a different type with the same message.
    c = traceback.TracebackException(TypeError, TypeError('a'), None)
    return not (a == c)


def traceback_exception_equality_defers_to_other_types():
    """__eq__ answers NotImplemented rather than False for a foreign operand,
    so Python falls back to the other side's __eq__."""
    class AlwaysEqual:
        def __eq__(self, other):
            return True

    exc = traceback.TracebackException(ValueError, ValueError('x'), None)
    return (exc != object()
            and exc == AlwaysEqual()
            and not (exc == object()))


def notes_take_part_in_equality():
    """A note changes the rendered output, so it has to change equality too."""
    plain = traceback.TracebackException(ValueError, ValueError('x'), None)

    noted_exc = ValueError('x')
    noted_exc.add_note('a note')
    noted = traceback.TracebackException(ValueError, noted_exc, None)

    return not (plain == noted)


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    checks = [
        notes_render_under_the_message,
        notes_are_absent_until_the_first_add_note,
        notes_attribute_is_writable_and_deletable,
        non_list_notes_render_as_repr,
        unprintable_notes_do_not_escape_the_formatter,
        broken_getattr_is_reported_not_propagated,
        traceback_exception_equality_is_by_content,
        traceback_exception_equality_defers_to_other_types,
        notes_take_part_in_equality,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
