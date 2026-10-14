"""Fixture: an exception takes any number of positional arguments.

CPython's BaseException keeps every positional in ``args'', however many.
Grail's class call had fixed forms for 0, 1, 2, 3 and 5 arguments only, so
``ValueError(0, 1, 2, 3)'' and every exception with six or more arguments was
``TypeError: ValueError() takes wrong number of arguments (4 positional, 0
keyword) - no matching method'' -- including OSError's four-argument
(errno, strerror, filename, winerror) form and BlockingIOError's
(test_exception_hierarchy test_blockingioerror).

BlockingIOError's third argument, when it is an integer, is
characters_written rather than a filename; ``args'' keeps all three.

Every EXPECTED check holds under CPython 3.14, which is what makes it
evidence.
"""

r = {}


def _err(thunk):
    try:
        return thunk()
    except Exception as e:
        return type(e).__name__ + ': ' + str(e)


def _bio(*a):
    e = BlockingIOError(*a)
    return e.args, getattr(e, 'characters_written', '<absent>'), str(e)


def _raised(n):
    try:
        raise KeyError(*range(n))
    except KeyError as e:
        return e.args


def _cw_lifecycle():
    e = BlockingIOError('a', 'b', 3)
    out = [e.characters_written]
    e.characters_written = 5
    out.append(e.characters_written)
    del e.characters_written
    out.append(_err(lambda: e.characters_written).split(':')[0])
    return tuple(out)


def _cw_deleted_message():
    e = BlockingIOError('a', 'b', 3)
    del e.characters_written
    return _err(lambda: e.characters_written)


r['value_error'] = tuple(ValueError(*range(n)).args for n in range(9))
r['raised'] = (_raised(4), _raised(6))
r['oserror_four'] = (lambda e: (type(e).__name__, e.args, e.filename))(OSError(2, 's', 'f', None))
r['oserror_six_plus'] = (lambda e: (type(e).__name__, e.args, e.errno))(OSError(2, 's', 'f', None, 'g', 'h'))
r['blocking_counts'] = (_bio('a', 'b', 3), _bio(11, 'b', 3))
r['blocking_no_count'] = tuple(_err(lambda n=n: _bio(*('a', 'b', 'c', 'd', 'e')[:n])) for n in range(6))
r['characters_written'] = _cw_lifecycle()
r['deleted_message'] = _cw_deleted_message()
r['still_no_keywords'] = _err(lambda: ValueError(1, 2, 3, 4, x=1))

EXPECTED = {
    'value_error': ((), (0,), (0, 1), (0, 1, 2), (0, 1, 2, 3), (0, 1, 2, 3, 4),
                    (0, 1, 2, 3, 4, 5), (0, 1, 2, 3, 4, 5, 6), (0, 1, 2, 3, 4, 5, 6, 7)),
    'raised': ((0, 1, 2, 3), (0, 1, 2, 3, 4, 5)),
    'oserror_four': ('FileNotFoundError', (2, 's'), 'f'),
    'oserror_six_plus': ('OSError', (2, 's', 'f', None, 'g', 'h'), None),
    'blocking_counts': ((('a', 'b', 3), 3, '[Errno a] b'), ((11, 'b', 3), 3, '[Errno 11] b')),
    'blocking_no_count': (((), '<absent>', ''), (('a',), '<absent>', 'a'),
                          (('a', 'b'), '<absent>', '[Errno a] b'),
                          (('a', 'b'), '<absent>', "[Errno a] b: 'c'"),
                          (('a', 'b'), '<absent>', "[Errno a] b: 'c'"),
                          (('a', 'b'), '<absent>', "[Errno a] b: 'c' -> 'e'")),
    'characters_written': (3, 5, 'AttributeError'),
    'still_no_keywords': 'TypeError: ValueError() takes no keyword arguments',
}

KNOWN_DIVERGENCES = {
    # CPython: 'AttributeError: characters_written', the bare getset name.
    'deleted_message': "AttributeError: 'BlockingIOError' object has no attribute 'characters_written'",
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS,
    sorted(r) == sorted(list(EXPECTED) + list(KNOWN_DIVERGENCES)))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-20s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    for key, expected in KNOWN_DIVERGENCES.items():
        actual = r[key]
        print('%-5s %-20s -> %r' % ('OK' if actual == expected else 'XFAIL', key, actual))
    print(SUMMARY)
