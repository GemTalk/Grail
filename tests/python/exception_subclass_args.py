"""Fixtures for BaseException's varargs __init__ on user-defined subclasses.

Driven by PythonTests>>ExceptionSubclassArgsTestCase.  Each function answers
True when the behaviour matches CPython, so a failure names the specific rule.

The bug these pin: a subclass declared the commonest way --

    class MyError(Exception):
        pass

-- recorded NO args, because the generated constructor probes the varargs
selector ``___init__:kw:`` and BaseException only implemented the 0- and
1-argument forms.  The miss was swallowed (deliberately, so a plain data class
with no __init__ keeps zero-arg ``new`` semantics), so ``MyError('boom').args``
answered () and the message vanished from every render.
"""

import traceback


class Empty(Exception):
    pass


class WithDocstring(Exception):
    """A docstring is not an __init__."""


class WithClassAttr(Exception):
    code = 7


class Chained(Exception):
    def __init__(self, msg):
        super().__init__(msg)


class DeepEmpty(ValueError):
    pass


class Grandchild(DeepEmpty):
    pass


def a_subclass_with_no_init_records_args():
    """The headline case, in the four shapes a class body can take while still
    defining no __init__."""
    out = []
    for cls in (Empty, WithDocstring, WithClassAttr, DeepEmpty, Grandchild):
        e = cls('boom')
        out.append(e.args == ('boom',) and str(e) == 'boom')
    return all(out)


def args_is_the_whole_positional_tuple():
    """CPython's BaseException(*args) keeps every positional, and str() of a
    multi-arg exception is str(args) -- the tuple's repr."""
    return (Empty().args == ()
            and Empty('a').args == ('a',)
            and Empty('a', 'b').args == ('a', 'b')
            and Empty(1, 2, 3).args == (1, 2, 3)
            and str(Empty('a', 'b')) == "('a', 'b')"
            and str(Empty()) == '')


def a_subclass_that_chains_to_super_still_works():
    """The path that already worked must keep working -- it is dispatched
    statically and never reaches the varargs form."""
    e = Chained('boom')
    return e.args == ('boom',) and str(e) == 'boom'


def the_message_reaches_the_rendered_traceback():
    """Why this matters: the whole point is that ``raise MyError('boom')''
    reports its message.  Before the fix this rendered as bare
    ``exception_subclass_args.Empty''."""
    text = ''.join(traceback.format_exception_only(Empty('boom')))
    # The prefix is DERIVED, not the literal 'exception_subclass_args'.
    # format_exception_only qualifies by Empty.__module__ (which follows
    # __name__), and CPython suppresses that prefix entirely for '__main__' and
    # 'builtins' -- which is why `ValueError: x' has no prefix.  So the same
    # file renders 'exception_subclass_args.Empty: boom' when the harness
    # imports it and a bare 'Empty: boom' under `python3 thisfile.py'.  The
    # literal pinned the first and was silently wrong in the second; what the
    # check is really about is the message surviving, not the prefix.
    prefix = '' if __name__ in ('__main__', 'builtins') else __name__ + '.'
    return text == '%sEmpty: boom\n' % prefix


def a_raised_subclass_carries_its_message():
    """End to end, through an actual raise/except rather than construction."""
    try:
        raise Empty('boom')
    except Empty as e:
        caught = e
    return (caught.args == ('boom',)
            and str(caught) == 'boom'
            and 'boom' in ''.join(traceback.format_exception_only(caught)))


def keyword_arguments_are_rejected():
    """CPython: ``Exception(x=1)'' is a TypeError -- BaseException takes no
    keyword arguments.  A subclass that wants them defines its own __init__."""
    try:
        Empty(x=1)
        return False
    except TypeError:
        pass
    # ...and one that DOES define __init__ is unaffected, because it is
    # dispatched statically and never reaches BaseException's varargs form.
    class Kwargs(Exception):
        def __init__(self, **kw):
            super().__init__(kw.get('x'))

    return Kwargs(x=5).args == (5,)


def repr_sees_the_args():
    """args feeds __repr__, so it follows from the fix.

    NOT equality: CPython's BaseException defines no __eq__, so two distinct
    exceptions with equal args are still unequal.  Grail already matches that,
    and asserting it here keeps a future 'compare by args' change from looking
    like an improvement."""
    return (repr(Empty('boom')) == "Empty('boom')"
            and repr(Empty()) == 'Empty()'
            and repr(Empty('a', 'b')) == "Empty('a', 'b')"
            and not (Empty('a') == Empty('a')))


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    checks = [
        a_subclass_with_no_init_records_args,
        args_is_the_whole_positional_tuple,
        a_subclass_that_chains_to_super_still_works,
        the_message_reaches_the_rendered_traceback,
        a_raised_subclass_carries_its_message,
        keyword_arguments_are_rejected,
        repr_sees_the_args,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
