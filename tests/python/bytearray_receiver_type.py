"""A `bytearray` method answers a `bytearray`.

CPython's rule is uniform: these methods answer the RECEIVER's type, so
every one of them on a `bytearray` gives a `bytearray` back.  Grail got
it right for some and wrong for others, and the split was arbitrary --
`upper` preserved the type while `lower` did not, from adjacent methods
written the same day.

The cause was a hardcoded `bytes ___new___:` where the established idiom
is `(self class) ___new___:`, so the result was built as the base type no
matter what it was called on.

`replace` was wrong for a different reason worth keeping separate: it
answers `new join: parts`, and `join` follows its RECEIVER -- which there
is the REPLACEMENT.  So the result type tracked an *argument* rather than
the object the method was called on.

This is the silent kind of defect: the bytes are right, so nothing fails
until something downstream mutates the result (a bytearray is mutable, a
bytes is not) or checks its type.

Every expectation was checked against CPython 3.14 first.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


def _t(value):
    return type(value).__name__


def _types(*values):
    return tuple(_t(v) for v in values)


# ------------------------------------------------ the whole surface

def _case_methods():
    b = bytearray(b'aBc')
    return _types(b.upper(), b.lower(), b.title(), b.capitalize(),
                  b.swapcase())


def _stripping():
    b = bytearray(b'  a  ')
    return _types(b.strip(), b.lstrip(), b.rstrip(),
                  bytearray(b'xax').strip(b'x'))


def _padding():
    b = bytearray(b'ab')
    return _types(b.center(6, b'-'), b.ljust(6, b'-'), b.rjust(6, b'-'),
                  b.zfill(6), bytearray(b'a\tb').expandtabs())


def _replacing():
    b = bytearray(b'aXbXc')
    return _types(b.replace(b'X', b'-'), b.replace(b'X', b'-', 1),
                  bytearray(b'AA').replace(b'', b'*'))


def _splitting():
    b = bytearray(b'aXbXc')
    return _types(b.split(b'X')[0], b.rsplit(b'X')[0],
                  bytearray(b'a\nb').splitlines()[0],
                  b.partition(b'X')[0], b.rpartition(b'X')[2])


def _trimming():
    return _types(bytearray(b'abc').removeprefix(b'a'),
                  bytearray(b'abc').removesuffix(b'c'))


def _already_worked():
    b = bytearray(b'ab')
    return _types(b[0:1], b + b'c', b * 2, b.copy(),
                  bytearray(b'-').join([b'a', b'b']),
                  b.translate(None, b'b'))


check('case_methods', _case_methods(), ('bytearray',) * 5)
check('stripping', _stripping(), ('bytearray',) * 4)
check('padding', _padding(), ('bytearray',) * 5)
check('replacing', _replacing(), ('bytearray',) * 3)
check('splitting', _splitting(), ('bytearray',) * 5)
check('trimming', _trimming(), ('bytearray',) * 2)
check('already_worked', _already_worked(), ('bytearray',) * 6)


# ------------------------------- the CONTENT is unchanged by all that

def _the_bytes_are_still_right():
    b = bytearray(b'aXbXc')
    return (bytes(bytearray(b'ABC').lower()),
            bytes(bytearray(b'ab cd').title()),
            bytes(b.replace(b'X', b'--')),
            bytes(b.replace(b'X', b'-', 1)),
            bytes(bytearray(b'AA').replace(b'', b'*-')),
            bytes(bytearray(b'  a  ').strip()),
            bytes(bytearray(b'-42').zfill(6)),
            bytes(bytearray(b'a\tbc\td').expandtabs(4)))


def _split_content():
    b = bytearray(b'aXbXc')
    return ([bytes(x) for x in b.split(b'X')],
            [bytes(x) for x in b.rsplit(b'X', 1)],
            [bytes(x) for x in b.partition(b'X')])


check('the_bytes_are_still_right', _the_bytes_are_still_right(),
      (b'abc', b'Ab Cd', b'a--b--c', b'a-bXc', b'*-A*-A*-', b'a', b'-00042',
       b'a   bc  d'))
check('split_content', _split_content(),
      ([b'a', b'b', b'c'], [b'aXb', b'c'], [b'a', b'X', b'bXc']))


# --------------------------------- a bytes receiver is still a bytes

def _bytes_stays_bytes():
    b = b'aXbXc'
    return _types(b.lower(), b.strip(), b.replace(b'X', b'-'),
                  b.split(b'X')[0], b.center(9, b'-'), b.zfill(9),
                  b.partition(b'X')[0], b.removeprefix(b'a'))


def _bytes_content_unchanged():
    return (b'ABC'.lower(), b'  a '.strip(), b'aXb'.replace(b'X', b'-'),
            b'aXb'.split(b'X'))


check('bytes_stays_bytes', _bytes_stays_bytes(), ('bytes',) * 8)
check('bytes_content_unchanged', _bytes_content_unchanged(),
      (b'abc', b'a', b'a-b', [b'a', b'b']))


# ------------------------- and the result is genuinely MUTABLE again

def _the_result_can_be_mutated():
    """The point of the type, not a detail of it: a bytearray result
    supports the mutation a bytes result would refuse."""
    result = bytearray(b'aXb').replace(b'X', b'-')
    result[0] = ord('z')
    result.append(ord('!'))
    return bytes(result)


check('the_result_can_be_mutated', _the_result_can_be_mutated(), b'z-b!')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
