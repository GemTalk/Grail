"""Fixture: an exception refuses a bad note, state, location or handler as CPython's does.

Each of these died in Grail with an UNCATCHABLE Smalltalk error, or was
accepted, where CPython raises a TypeError (test_exceptions test_notes,
test_invalid_setstate, test_incorrect_constructor,
test_except_star_invalid_exception_type):

* ``add_note`` once ``__notes__`` is not a list was sent append:;
* ``__setstate__(42)`` was sent keysAndValuesDo:;
* a SyntaxError location of the wrong length was stored as given;
* ``except (ValueError, 42):`` joined 42 into a GemStone ExceptionSet.

What each still accepts is checked alongside.  Every check here holds under
CPython 3.14, which is what makes it evidence.
"""

r = {}


def refusal(call):
    try:
        return ('ok', call())
    except TypeError as exc:
        return str(exc)


def notes_not_a_list():
    exc = ValueError(1)
    exc.__notes__ = 42
    exc.add_note('x')


def notes_after_del():
    exc = ValueError(1)
    exc.add_note('a')
    del exc.__notes__
    exc.add_note('b')
    return exc.__notes__


def state(value):
    exc = ValueError(1)
    exc.__setstate__(value)
    return exc


def handler_tuple():
    try:
        raise ValueError
    except (ValueError, 42):
        pass


def handler_star_tuple():
    try:
        raise ValueError
    except* (ValueError, 42):
        pass


def handler_tuple_matches():
    try:
        raise KeyError('k')
    except (ValueError, KeyError) as exc:
        return type(exc).__name__


r['notes'] = [refusal(notes_not_a_list), refusal(lambda: ValueError(1).add_note(42)),
              refusal(lambda: ValueError(1).add_note(None)), notes_after_del()]
r['setstate'] = [refusal(lambda: state(42)), refusal(lambda: state([1])),
                 state(None).args, state({'x': 5}).x]
r['syntax_location'] = [
    refusal(lambda: SyntaxError('bad', ('bad.py', 1, 2))),
    refusal(lambda: SyntaxError('bad', ('bad.py', 1, 2, 4, 5, 6, 7, 8))),
    refusal(lambda: SyntaxError('bad', ('bad.py', 1, 2, 'text', -1))),
    refusal(lambda: SyntaxError('bad', 5)),
    SyntaxError('bad', ('bad.py', 1, 2, 'text')).text,
    SyntaxError('bad', ['bad.py', 3, 4, 'text', 3, 9]).end_offset,
    SyntaxError('bad', ('bad.py', 1, 2, 'text'), 'extra').filename,
]
r['handler_tuple'] = [refusal(handler_tuple), refusal(handler_star_tuple), handler_tuple_matches()]

MESSAGE = 'catching classes that do not inherit from BaseException is not allowed'
EXPECTED = {
    'notes': ['Cannot add note: __notes__ is not a list',
              'add_note() argument must be str, not int',
              'add_note() argument must be str, not None', ['b']],
    'setstate': ['state is not a dictionary', 'state is not a dictionary', (1,), 5],
    'syntax_location': ['function takes at least 4 arguments (3 given)',
                        'function takes at most 7 arguments (8 given)',
                        'end_offset must be provided when end_lineno is provided',
                        "'int' object is not iterable", 'text', 9, None],
    'handler_tuple': [MESSAGE, MESSAGE, 'KeyError'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-16s %-5s -> %r' % (key, 'OK' if actual == EXPECTED[key] else 'FAIL', actual))
    print(SUMMARY)
