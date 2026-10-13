"""gen.throw() adds frames on top of the traceback; __traceback__ is a slot.

An exception thrown into a generator arrives with the frames of wherever it was
first raised and caught.  CPython keeps them and prepends a frame for each
function it unwinds through from the yield.  Grail rebuilt the chain at the
next catch from the stack captured at the FIRST raise -- on the consumer's
process, which the generator body is not on -- so a ``with'' inside the
generator lost every frame below a re-raise, and pytest (which re-raises each
test's exception in pluggy and throws it into its capture wrapper) printed a
failure report without the failing test in it.

Two smaller defects were on the same path: ``e.__traceback__ = tb'' stored an
ordinary attribute that shadowed the real slot for every later read, and
contextlib's __exit__ did not hand the with statement back the exception's
original traceback as CPython's does.

Each chain is (function, line relative to its def).  Every expectation was
measured against CPython 3.14.
"""

import contextlib

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


def chain(tb):
    # Every function here is module-level, so its def line comes from the
    # function itself rather than from the frame's code.
    out = []
    while tb is not None:
        name = tb.tb_frame.f_code.co_name
        out.append((name, tb.tb_lineno - globals()[name].__code__.co_firstlineno))
        tb = tb.tb_next
    return out


def the_test():
    raise ValueError('x')


def reraised():
    exception = None
    try:
        the_test()
    except BaseException as exc:
        exception = exc
    raise exception


class Plain:
    def __enter__(self):
        return self

    def __exit__(self, *exc_info):
        return False


@contextlib.contextmanager
def gen_cm():
    yield


def wrapper(kind):
    if kind == 'contextmanager':
        with gen_cm():
            return (yield)
    elif kind == 'class cm':
        with Plain():
            return (yield)
    else:
        return (yield)


def drive(kind, source):
    g = wrapper(kind)
    next(g)
    try:
        source()
    except ValueError as exc:
        caught = exc
    try:
        g.throw(caught)
    except ValueError as exc:
        return chain(exc.__traceback__)


FRESH = [('the_test', 1)]
REUSED = [('reraised', 6), ('reraised', 3), ('the_test', 1)]

check('throw_prepends_the_generator_and_the_caller', drive('none', the_test),
      [('drive', 8), ('wrapper', 8), ('drive', 4)] + FRESH)
check('throw_keeps_a_reraised_chain', drive('none', reraised),
      [('drive', 8), ('wrapper', 8), ('drive', 4)] + REUSED)
check('a_with_in_the_generator_keeps_the_chain', drive('class cm', the_test),
      [('drive', 8), ('wrapper', 6), ('drive', 4)] + FRESH)
# The #1539 shape: what pytest's capture wrapper does to every failing test.
check('a_with_in_the_generator_keeps_a_reraised_chain', drive('class cm', reraised),
      [('drive', 8), ('wrapper', 6), ('drive', 4)] + REUSED)
check('a_contextmanager_in_the_generator_keeps_the_chain',
      drive('contextmanager', the_test),
      [('drive', 8), ('wrapper', 3), ('drive', 4)] + FRESH)
check('a_contextmanager_in_the_generator_keeps_a_reraised_chain',
      drive('contextmanager', reraised),
      [('drive', 8), ('wrapper', 3), ('drive', 4)] + REUSED)


def catcher():
    try:
        yield
    except ValueError as exc:
        yield chain(exc.__traceback__)


def caught_inside():
    g = catcher()
    next(g)
    try:
        reraised()
    except ValueError as exc:
        caught = exc
    return g.throw(caught)


check('a_catch_inside_the_generator_sees_its_own_frame', caught_inside(),
      [('catcher', 2), ('caught_inside', 4)] + REUSED)


def boom():
    raise ValueError('boom')


def first_chain():
    try:
        boom()
    except ValueError as exc:
        return exc, exc.__traceback__


def assigned_then(how):
    exc, saved = first_chain()
    try:
        try:
            raise exc
        except ValueError as inner:
            inner.__traceback__ = saved
            if how == 'bare':
                raise
            raise inner
    except ValueError as outer:
        return chain(outer.__traceback__)


SAVED = [('first_chain', 2), ('boom', 1)]
check('assignment_then_a_bare_raise_adds_nothing', assigned_then('bare'), SAVED)
check('assignment_then_raise_e_adds_its_frame', assigned_then('named'),
      [('assigned_then', 9)] + SAVED)

exc, saved = first_chain()
exc.__traceback__ = None
cleared = exc.__traceback__
exc.__traceback__ = saved
check('assignment_is_the_slot', (cleared, exc.__traceback__ is saved,
                                 exc.with_traceback(None).__traceback__),
      (None, True, None))


def refused(action):
    try:
        action()
    except TypeError as err:
        return str(err)
    return 'no error'


def assign_an_int():
    exc.__traceback__ = 5


def delete_it():
    del exc.__traceback__


check('assigning_a_non_traceback_is_refused', refused(assign_an_int),
      '__traceback__ must be a traceback or None')
check('deleting_it_is_refused', refused(delete_it), '__traceback__ may not be deleted')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
