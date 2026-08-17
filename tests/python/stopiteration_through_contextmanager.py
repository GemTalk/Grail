# Raising StopIteration inside a ``with'' over a @contextmanager must surface
# THAT StopIteration -- not the PEP 479 RuntimeError the generator machinery
# wraps it in on the way past.
#
# CPython and Grail AGREE on the wrapping itself: gen.throw(StopIteration())
# comes back as RuntimeError('generator raised StopIteration'), because a
# StopIteration leaving a generator frame is indistinguishable from the
# generator saying "I am done".  contextlib knows this and unwraps it:
#
#     except RuntimeError as exc:
#         if isinstance(value, StopIteration) and exc.__cause__ is value:
#             return False        # don't suppress; let the original out
#
# That test is an IDENTITY test, and Grail's carrier machinery broke it.  A
# carrier is the throwaway raised when a payload cannot be signalled directly,
# and gen.throw(value) is called from inside the with-statement's own handler --
# so value is in flight, and travels wrapped.  PEP 479 then chained the CARRIER
# as __cause__, ``exc.__cause__ is value'' came out False, and __exit__
# re-raised the RuntimeError instead of stepping aside.
#
# The second case is unrelated and older: ``raise next(iter([]))''.  RaiseAst
# routes every BARE-NAME callee through the construct-and-signal path, on the
# reasoning that a bare name is usually an exception class.  ``next'' is not,
# and the callee was REJECTED before the call was ever made -- reporting
# "exceptions must derive from BaseException" about a call whose whole point is
# to raise before it returns.  CPython evaluates the call and raises the result.
#
# test_with ExceptionalTestCase testRaisedStopIteration1 / testRaisedStopIteration3.

from contextlib import contextmanager

r = {}


@contextmanager
def cm():
    yield


def _outcome(fn):
    try:
        fn()
        return 'no error'
    except BaseException as e:
        return '%s: %s' % (type(e).__name__, e)


# --- the StopIteration the body raised is what comes out ------------------------

def _instantiated():
    with cm():
        raise StopIteration('from with')


def _exhaust():
    """Raises StopIteration before returning anything -- next()'s shape, but a
    name RaiseAst can resolve.  See the known gap below."""
    return next(iter([]))


def _uninstantiated():
    with cm():
        raise _exhaust()


r['instantiated'] = _outcome(_instantiated)
r['uninstantiated'] = _outcome(_uninstantiated)


# --- the wrapping itself is unchanged, and matches CPython ----------------------
# Pinned so a future fix cannot "solve" the above by skipping PEP 479: the
# RuntimeError is correct, and only contextlib is entitled to look past it.

def _thrown_in():
    def g():
        yield
    gi = g()
    next(gi)
    si = StopIteration('thrown in')
    try:
        gi.throw(si)
        return 'no error'
    except RuntimeError as e:
        return [str(e), e.__cause__ is si]


def _raised_by_body():
    def h():
        raise StopIteration('from body')
        yield
    try:
        next(h())
        return 'no error'
    except RuntimeError as e:
        return str(e)


r['thrown_in_wraps_and_chains'] = repr(_thrown_in())
r['raised_by_body_wraps'] = repr(_raised_by_body())


# --- raise <callable>(...) evaluates the call -----------------------------------
# ``raise NewStyleClass()'' must still be a TypeError -- but from the VALUE now,
# not from a callee rejected before it ran.

class NotAnException:
    pass


def _raise_non_exception():
    raise NotAnException()


r['non_exception_value'] = _outcome(_raise_non_exception)


# --- KNOWN GAP, recorded rather than endorsed ----------------------------------
# ``raise NAME(...)'' in a MODULE-LEVEL function cannot see a builtin NAME.
# RaiseAst emits the callee as a bare-name load, and that load does not consult
# builtins at this scope -- while the same call NOT under ``raise'' resolves
# fine, and the same ``raise'' inside a NESTED function resolves fine.  So this
# is about how RaiseAst emits its callee, not about StopIteration, and is why
# the case above is written nested.
def _module_level_raise_next():
    raise next(iter([]))


r['module_level_raise_builtin_is_a_known_gap'] = _outcome(_module_level_raise_next)


EXPECTED = {
    'instantiated': 'StopIteration: from with',
    'non_exception_value': 'TypeError: exceptions must derive from BaseException',
    'raised_by_body_wraps': "'generator raised StopIteration'",
    'thrown_in_wraps_and_chains': "['generator raised StopIteration', True]",
    'uninstantiated': 'StopIteration: ',
}

GRAIL_ONLY = {
    'module_level_raise_builtin_is_a_known_gap': "NameError: name 'next' is not defined",
}


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-42s %s %s' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    for k in sorted(GRAIL_ONLY):
        actual = r[k]
        print('%-42s %s %s' % (k, 'XPASS' if actual == GRAIL_ONLY[k] else 'XFAIL', actual))
