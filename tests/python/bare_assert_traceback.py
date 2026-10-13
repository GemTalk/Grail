"""A bare ``assert'' carries the full traceback, as ``raise'' does.

``assert cond'' with no message raised through the kernel's env-0 class-side
``AssertionError signal'', which skips Grail's raise path, and the exception
that produced held only the frame that caught it: ``outer() -> inner():
assert 0'' reported <module> alone -- until some other AssertionError had been
raised the Python way in the same session, after which it was right.  pytest
reports a failing test from that traceback, so a plain ``assert'' in a test
showed none of the test's own frames.  ``assert cond, msg'' was unaffected.

The first check below is deliberately the first failing assert in this file:
that is the case that broke.  Every expectation was measured against CPython
3.14.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:160])


def chain(tb):
    out = []
    while tb is not None:
        out.append(tb.tb_frame.f_code.co_name)
        tb = tb.tb_next
    return out


def inner_bare():
    assert 1 == 2


def outer_bare():
    inner_bare()


def inner_msg():
    assert 1 == 2, 'with a message'


def outer_msg():
    inner_msg()


def caught(fn):
    try:
        fn()
    except AssertionError as exc:
        return exc
    return None


first = caught(outer_bare)
check('the_first_bare_assert_keeps_its_frames',
      chain(first.__traceback__), ['caught', 'outer_bare', 'inner_bare'])
check('a_later_bare_assert_too',
      chain(caught(outer_bare).__traceback__)[1:], ['outer_bare', 'inner_bare'])
check('an_assert_with_a_message',
      chain(caught(outer_msg).__traceback__)[1:], ['outer_msg', 'inner_msg'])


def _innermost(exc):
    tb = exc.__traceback__
    while tb.tb_next is not None:
        tb = tb.tb_next
    return tb


check('the_innermost_line_is_the_assert',
      _innermost(first).tb_lineno - inner_bare.__code__.co_firstlineno, 1)
check('a_bare_assert_has_no_args',
      (first.args, str(first), repr(first)), ((), '', 'AssertionError()'))


def _during_handling():
    try:
        try:
            raise KeyError('k')
        except KeyError:
            assert False
    except AssertionError as exc:
        return type(exc.__context__).__name__, exc.__cause__, exc.__suppress_context__


check('raised_while_handling_records_the_context',
      _during_handling(), ('KeyError', None, False))


def _plain():
    try:
        assert []
    except AssertionError as exc:
        return type(exc).__name__, exc.args
    return 'passed'


check('a_falsy_value_still_fails', _plain(), ('AssertionError', ()))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
