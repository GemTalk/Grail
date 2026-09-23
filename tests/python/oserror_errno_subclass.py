"""OSError(errno, strerror) answers the errno's own subclass, as CPython's does.

``OSError(2, 'No such file or directory')`` IS a FileNotFoundError in CPython:
OSError.__new__ reads the errno and answers the subclass for it.  Grail
answered a plain OSError, so an ``except FileNotFoundError'' around code that
raises the two-argument form never fired -- and that form is what every
library writes when it re-raises an error it carried across a boundary.

Only for OSError ITSELF, and only where an errno was really supplied:

  * ``PermissionError(2, 'msg')'' stays a PermissionError.  A caller naming a
    subclass has already said which one it means, and CPython maps in
    OSError.__new__ alone.
  * ``OSError('just a message')'' and ``OSError(None, 'msg')'' stay OSError:
    the (errno, strerror) form is 2 to 5 arguments with an integer first.

ONLY THE ERRNOS DARWIN AND LINUX NUMBER ALIKE are mapped -- all of 1..34 plus
ECHILD, which is where every error a file operation reports lives.  CPython's
map also covers the network and non-blocking family (EAGAIN ->
BlockingIOError, ETIMEDOUT -> TimeoutError, ...), whose numbers differ between
the platforms; this fixture therefore asserts by NUMBER and never through the
errno module, whose values are the BSD ones everywhere (see its header).

Every expectation here was measured against CPython 3.14.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:160])


def _class_of(*args):
    return type(OSError(*args)).__name__


# ----------------------------------------------------------- the map

check('every_shared_errno_answers_its_own_subclass',
      [_class_of(n, 'msg') for n in (1, 2, 3, 4, 10, 13, 17, 20, 21, 32)],
      ['PermissionError', 'FileNotFoundError', 'ProcessLookupError',
       'InterruptedError', 'ChildProcessError', 'PermissionError',
       'FileExistsError', 'NotADirectoryError', 'IsADirectoryError',
       'BrokenPipeError'])
check('an_unmapped_errno_stays_a_plain_os_error',
      (_class_of(16, 'msg'), _class_of(22, 'msg'), _class_of(9999, 'msg')),
      ('OSError', 'OSError', 'OSError'))

# ----------------------------------------------------------- when it applies

check('the_arity_does_not_decide_the_class',
      (_class_of(2, 'msg'), _class_of(2, 'msg', 'f'),
       _class_of(2, 'msg', 'f', None, 'g')),
      ('FileNotFoundError',) * 3)
check('one_argument_or_none_stays_a_plain_os_error',
      (_class_of('just a message'), _class_of()), ('OSError', 'OSError'))
check('a_non_integer_errno_stays_a_plain_os_error',
      (_class_of(None, 'msg'), _class_of('2', 'msg')), ('OSError', 'OSError'))
check('a_subclass_named_by_the_caller_is_kept',
      (type(PermissionError(2, 'msg')).__name__,
       type(IsADirectoryError(2, 'msg')).__name__),
      ('PermissionError', 'IsADirectoryError'))

# ----------------------------------------------------------- what it is for

def _caught_as():
    try:
        raise OSError(2, 'No such file or directory', 'f.txt')
    except FileNotFoundError as exc:
        return ('FileNotFoundError', exc.errno, exc.filename, str(exc))
    except OSError:
        return 'caught only as OSError'


check('a_raised_two_argument_os_error_is_caught_as_its_subclass',
      _caught_as(),
      ('FileNotFoundError', 2, 'f.txt',
       "[Errno 2] No such file or directory: 'f.txt'"))
check('the_fields_survive_the_narrowing',
      (lambda exc: (exc.errno, exc.strerror, exc.filename, exc.args))(
          OSError(17, 'File exists', 'there')),
      (17, 'File exists', 'there', (17, 'File exists')))
check('isinstance_still_sees_an_os_error',
      (isinstance(OSError(2, 'm'), OSError), isinstance(OSError(2, 'm'), Exception)),
      (True, True))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
