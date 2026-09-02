"""Frame NAMES where a nested def and a lambda begin on the same line.

A nested ``def`` compiles to a block, and so does a lambda, so neither has a
selector to decode a name from.  The name is recovered instead from the
``PyCode`` stamp codegen writes into the enclosing method -- and the stamp used
to be located by LINE, which cannot separate two functions that begin on the
same one.  A ``def`` whose statement holds a lambda therefore reported the
LAMBDA's name for its own frame.
"""

import traceback


def _names_from_traceback(fn):
    try:
        fn()
    except ZeroDivisionError as exc:
        return [f.name for f in traceback.extract_tb(exc.__traceback__)]
    return None


def _lambda_shares_the_line():
    def inner():
        return (lambda: 1 / 0)()
    return inner()


def _lambda_on_its_own_line():
    def inner():
        f = lambda: 1 / 0
        return f()
    return inner()


def _two_lambdas_on_one_line():
    def inner():
        return (lambda: (lambda: 1 / 0)())()
    return inner()


def _recursive_nested_def():
    def rec(n):
        return 1 / n if n == 0 else rec(n - 1)
    return rec(2)


def _live_names():
    def inner():
        return (lambda: [f.name for f in traceback.extract_stack()])()
    return inner()


def a_def_sharing_a_line_with_a_lambda_keeps_its_name():
    """['..., inner, <lambda>'], not ['..., <lambda>, <lambda>'].

    The whole defect: both stamps' line ranges contain the shared line, and
    innermost-wins picked the lambda for BOTH frames.
    """
    return (_names_from_traceback(_lambda_shares_the_line)[-3:]
            == ['_lambda_shares_the_line', 'inner', '<lambda>'])


def a_lambda_on_its_own_line_is_unchanged():
    """The CONTROL: a lambda one line above the call already resolved, because
    the two functions then begin on different lines and the range test can tell
    them apart.  It must still resolve."""
    return (_names_from_traceback(_lambda_on_its_own_line)[-3:]
            == ['_lambda_on_its_own_line', 'inner', '<lambda>'])


def a_recursive_nested_def_keeps_its_own_name():
    """The other CONTROL, and the one that rules out fixing this by POSITION in
    the frame chain.  A nested def that recurses puts several frames at one
    line legitimately, all naming the same function -- so a rule that demoted
    the outer of two frames sharing a line would break this."""
    return (_names_from_traceback(_recursive_nested_def)[-4:]
            == ['_recursive_nested_def', 'rec', 'rec', 'rec'])


def two_lambdas_on_one_line_each_get_a_frame():
    """Two lambdas on one line share a firstlineno as well as a line, so
    nothing about the STAMP separates them either.  Each block still has its
    own bracket."""
    return (_names_from_traceback(_two_lambdas_on_one_line)[-4:]
            == ['_two_lambdas_on_one_line', 'inner', '<lambda>', '<lambda>'])


def the_live_stack_names_the_def_and_the_lambda():
    """The live walk -- what ``sys._getframe`` counts through -- shares the name
    derivation with the traceback walk and had the same defect."""
    return (_live_names()[-3:]
            == ['_live_names', 'inner', '<lambda>'])


CHECKS = [
    a_def_sharing_a_line_with_a_lambda_keeps_its_name,
    a_lambda_on_its_own_line_is_unchanged,
    a_recursive_nested_def_keeps_its_own_name,
    two_lambdas_on_one_line_each_get_a_frame,
    the_live_stack_names_the_def_and_the_lambda,
]

RESULTS = {}
for _fn in CHECKS:
    try:
        RESULTS[_fn.__name__] = _fn() is True
    except Exception as _exc:
        RESULTS[_fn.__name__] = type(_exc).__name__ + ': ' + str(_exc)


if __name__ == '__main__':
    for _fn in CHECKS:
        _got = RESULTS[_fn.__name__]
        print('%-4s %s' % ('OK' if _got is True else 'FAIL', _fn.__name__))
