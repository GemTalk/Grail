"""Fixture: compile(src, f, 'single') shows each expression statement's value.

``single'' is the interactive mode: the REPL compiles ``>>> 1 + 1'' with it,
and so does doctest, for every example.  An expression statement compiled that
way passes its value to sys.displayhook, which writes repr(value) to sys.stdout
and stores it in builtins._ -- that is how ``>>> 1 + 1'' prints 2, and how
doctest sees an example's output to compare.

Grail accepted the mode and ignored it, so an expression example produced no
output at all and every such doctest failed with ``Got nothing''.  It also had
the second half wrong: sys.displayhook wrote the Smalltalk printString straight
to the gem's stdout, so even a direct call never reached a REDIRECTED
sys.stdout -- which is the only kind doctest and captured_stdout() use.

THE SCOPE IS THE INTERACTIVE STATEMENT, not just its top line: an expression in
a ``for'' at the top level shows every value, while one in a def's body does
not (it runs later, in its own scope).  ``in_a_loop'' and ``not_in_a_def'' pin
that boundary from both sides.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import builtins
import io
import sys

r = {}


def shown(src):
    """What exec(compile(src, '<ex>', 'single')) writes to sys.stdout."""
    buf = io.StringIO()
    saved = sys.stdout
    sys.stdout = buf
    try:
        exec(compile(src, '<ex>', 'single'), {})
    finally:
        sys.stdout = saved
    return buf.getvalue()


r['an_expression_shows_its_repr'] = [shown('1 + 1\n'), shown('"x"\n')]
r['none_shows_nothing'] = shown('None\n')
r['print_is_not_doubled'] = shown('print("hi")\n')
r['each_statement_on_a_line'] = shown('1; 2\n')
r['in_a_loop'] = shown('for i in range(3): i\n')
r['not_in_a_def'] = shown('def f():\n    7\n')
r['not_in_a_class_body'] = shown('class C:\n    8\n')


def _through_a_custom_hook():
    seen = []
    saved = sys.displayhook
    sys.displayhook = seen.append
    try:
        exec(compile('3 * 3\n', '<ex>', 'single'), {})
    finally:
        sys.displayhook = saved
    return seen


r['the_hook_is_looked_up_at_run_time'] = _through_a_custom_hook()


def _underscore():
    shown('41 + 1\n')
    return builtins._


r['builtins_underscore_is_set'] = _underscore()


def _written(fn):
    """What fn() writes to sys.stdout."""
    buf = io.StringIO()
    saved = sys.stdout
    sys.stdout = buf
    try:
        fn()
    finally:
        sys.stdout = saved
    return buf.getvalue()


# Not the mode, but the same code path: exec mode must stay silent.
r['exec_mode_shows_nothing'] = _written(
    lambda: exec(compile('1 + 1\n', '<ex>', 'exec'), {}))

# And the hook itself, called directly, writes to a redirected stdout.
r['displayhook_writes_to_sys_stdout'] = _written(
    lambda: sys.displayhook([1, 'a']))


EXPECTED = {
    'an_expression_shows_its_repr': ['2\n', "'x'\n"],
    'none_shows_nothing': '',
    'print_is_not_doubled': 'hi\n',
    'each_statement_on_a_line': '1\n2\n',
    'in_a_loop': '0\n1\n2\n',
    'not_in_a_def': '',
    'not_in_a_class_body': '',
    'the_hook_is_looked_up_at_run_time': [9],
    'builtins_underscore_is_set': 42,
    'exec_mode_shows_nothing': '',
    'displayhook_writes_to_sys_stdout': "[1, 'a']\n",
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in sorted(EXPECTED):
        actual = r[key]
        print('%-5s %-36s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
