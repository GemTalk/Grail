"""Fixture: sys.displayhook and sys.excepthook, called as CPython calls them.

Both hooks are argument-clinic functions (Python/clinic/sysmodule.c.h): one
positional argument and three, no keywords, and CPython's own messages for
anything else.  displayhook needs sys.stdout and says "lost sys.stdout" when a
program deleted it or set it to None (Python/sysmodule.c:751-810), and an
expression statement compiled in 'single' mode reads sys.displayhook when it
runs, saying "lost sys.displayhook" when it is gone (Python/intrinsics.c,
print_expr).  excepthook handed a value that is not an exception prints one
line about it to sys.stderr instead of raising (Python/pythonrun.c,
print_exception_invalid_type).

Grail's sys.__excepthook__ called with nothing answered the hook itself, a
lost sys.stdout went unnoticed, a deleted displayhook was an AttributeError,
and a non-exception value raised -- test_sys's DisplayHookTest and
ExceptHookTest.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import builtins
import io
import sys

r = {}


def outcome(thunk):
    try:
        return thunk()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def single(source):
    return eval(compile(source, '<fixture>', 'single'))


# Called as values, as test_sys's assertRaises(TypeError, dh) calls them.
excepthook, displayhook = sys.__excepthook__, sys.__displayhook__

r['excepthook_arity'] = [outcome(lambda: excepthook()),
                         outcome(lambda: excepthook(1, 2)),
                         outcome(lambda: excepthook(1, 2, 3, x=1))]

r['displayhook_arity'] = [outcome(lambda: displayhook()),
                          outcome(lambda: displayhook(1, 2)),
                          outcome(lambda: displayhook(1, x=2))]

r['hooks_keep_their_names'] = [sys.excepthook.__name__, sys.__excepthook__.__name__,
                               sys.displayhook.__name__, sys.__displayhook__.__name__]


def displayed(value):
    saved = sys.stdout
    sys.stdout = io.StringIO()
    try:
        sys.displayhook(value)
        return sys.stdout.getvalue(), builtins._
    finally:
        sys.stdout = saved


r['displayhook_shows_and_remembers'] = displayed(42)


def without_stdout(how):
    saved = sys.stdout
    builtins._ = 'before'
    if how == 'deleted':
        del sys.stdout
    else:
        sys.stdout = None
    try:
        return outcome(lambda: sys.displayhook(42)), builtins._
    finally:
        sys.stdout = saved


r['a_lost_stdout'] = [without_stdout('deleted'), without_stdout('None')]


def without_displayhook():
    saved = sys.displayhook
    del sys.displayhook
    try:
        return outcome(lambda: single('42'))
    finally:
        sys.displayhook = saved


r['a_lost_displayhook'] = without_displayhook()


def with_displayhook(hook):
    saved = sys.displayhook
    sys.displayhook = hook
    try:
        return outcome(lambda: single('6 * 7'))
    finally:
        sys.displayhook = saved


seen = []
r['single_mode_calls_the_current_hook'] = [with_displayhook(seen.append), seen]


def refusing(value):
    raise ValueError('refused %r' % (value,))


r['a_raising_hook_raises'] = with_displayhook(refusing)


def reported(*arguments):
    saved = sys.stderr
    sys.stderr = io.StringIO()
    try:
        answer = sys.excepthook(*arguments)
        return answer, sys.stderr.getvalue()
    finally:
        sys.stderr = saved


r['a_value_that_is_not_an_exception'] = [reported(1, '1', 1), reported(ValueError, 7, None)]

EXPECTED = {
    'excepthook_arity': ['TypeError: excepthook expected 3 arguments, got 0',
                         'TypeError: excepthook expected 3 arguments, got 2',
                         'TypeError: sys.excepthook() takes no keyword arguments'],
    'displayhook_arity': ['TypeError: sys.displayhook() takes exactly one argument (0 given)',
                          'TypeError: sys.displayhook() takes exactly one argument (2 given)',
                          'TypeError: sys.displayhook() takes no keyword arguments'],
    'hooks_keep_their_names': ['excepthook', 'excepthook', 'displayhook', 'displayhook'],
    'displayhook_shows_and_remembers': ('42\n', 42),
    'a_lost_stdout': [('RuntimeError: lost sys.stdout', None),
                      ('RuntimeError: lost sys.stdout', None)],
    'a_lost_displayhook': 'RuntimeError: lost sys.displayhook',
    'single_mode_calls_the_current_hook': [None, [42]],
    'a_raising_hook_raises': 'ValueError: refused 42',
    'a_value_that_is_not_an_exception': [
        (None, 'TypeError: print_exception(): Exception expected for value, str found\n'),
        (None, 'TypeError: print_exception(): Exception expected for value, int found\n')],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-36s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
