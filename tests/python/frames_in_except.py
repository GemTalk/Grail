"""Fixture: inside an except body, the live stack starts at the handling function.

By the time an except body runs, CPython has unwound the function that raised
and everything it called.  Grail runs an except body inside a Smalltalk
handler block, and a Smalltalk handler runs ON TOP of the signalling frames,
before the stack unwinds.  So sys._getframe() inside caller's except used to
answer the frame of the function that raised, and with it
inspect.currentframe(), inspect.stack(), traceback.extract_stack(),
warnings' stacklevel and logging's findCaller: ``log.error()'' in an except
block was reported at the raising function and line.

The cases cover the ways a handler is reached: the first handler tried, one
reached past non-matching excepts (a recursion with its own except TypeError
at every level, which is also how a raise gets out of any try/except), a
nested except, a with block's __exit__, a finally run during the unwind, and
a generator started from an except body, whose frames span two processes.

Every EXPECTED check holds under CPython 3.14, which is what makes it
evidence.
"""

import io
import logging
import sys
import traceback
import warnings

r = {}


def _try(thunk):
    try:
        return ('ok', thunk())
    except BaseException as e:
        return (type(e).__name__, str(e))


def names(skip=1):
    """The live stack's function names from the caller out, cut at this
    fixture's module frame so that whatever loaded it does not show."""
    f = sys._getframe(skip)
    out = []
    while f is not None:
        out.append(f.f_code.co_name)
        if f.f_code.co_name == '<module>':
            break
        f = f.f_back
    return out


def boom():
    raise ValueError('boom')


def deep(n):
    if n == 0:
        boom()
    deep(n - 1)


def simple():
    try:
        deep(2)
    except ValueError:
        return names()


def nested():
    try:
        deep(2)
    except ValueError:
        try:
            boom()
        except ValueError:
            return names()


def calls_from_handler():
    def inner_fn():
        return names()
    try:
        deep(1)
    except ValueError:
        return inner_fn()


def recursive(n):
    try:
        if n == 0:
            boom()
        recursive(n - 1)
    except TypeError:
        pass


def past_non_matching_excepts():
    try:
        recursive(2)
    except ValueError:
        return names()


class CM:
    seen = None

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        CM.seen = names()
        return True


def with_exit():
    with CM():
        deep(1)
    return CM.seen


def finally_during_unwind():
    seen = []

    def f():
        try:
            deep(1)
        finally:
            seen.append(names())
    try:
        f()
    except ValueError:
        pass
    return seen[0]


def generator_from_handler():
    def g():
        yield names()
    try:
        deep(1)
    except ValueError:
        return next(g())


def locals_from_handler():
    marker = 42
    try:
        boom()
    except ValueError as e:
        fr = sys._getframe()
        return (fr.f_code.co_name, fr.f_locals.get('marker'),
                type(fr.f_locals.get('e')).__name__)


def extract_stack_from_handler():
    try:
        deep(1)
    except ValueError:
        return [fs.name for fs in traceback.extract_stack()][-2:]


def warning_from_handler():
    try:
        boom()
    except ValueError:
        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter('always')
            warnings.warn('x', stacklevel=1)
        return (w[0].lineno - warning_from_handler.__code__.co_firstlineno)


def logging_from_handler():
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(logging.Formatter('%(funcName)s %(lineno)d'))
    log = logging.getLogger('frames_in_except')
    log.addHandler(handler)
    log.propagate = False
    try:
        try:
            boom()
        except ValueError:
            log.error('in except')
    finally:
        log.removeHandler(handler)
    func, line = stream.getvalue().split()
    return (func, int(line) - logging_from_handler.__code__.co_firstlineno)


for _fn in (simple, nested, calls_from_handler, past_non_matching_excepts,
            with_exit, finally_during_unwind, generator_from_handler,
            locals_from_handler, extract_stack_from_handler,
            warning_from_handler, logging_from_handler):
    r[_fn.__name__] = _try(_fn)


EXPECTED = {
    # _try is live: it called the case, from inside a try of its own -- which
    # is not the try that caught, though it is outward of it.
    'simple': ('ok', ['simple', '_try', '<module>']),
    'nested': ('ok', ['nested', '_try', '<module>']),
    'calls_from_handler': ('ok', ['inner_fn', 'calls_from_handler', '_try',
                                  '<module>']),
    'past_non_matching_excepts': ('ok', ['past_non_matching_excepts', '_try',
                                         '<module>']),
    'with_exit': ('ok', ['__exit__', 'with_exit', '_try', '<module>']),
    'finally_during_unwind': ('ok', ['f', 'finally_during_unwind', '_try',
                                     '<module>']),
    'generator_from_handler': ('ok', ['g', 'generator_from_handler', '_try',
                                      '<module>']),
    'locals_from_handler': ('ok', ('locals_from_handler', 42, 'ValueError')),
    'extract_stack_from_handler': ('ok', ['_try',
                                          'extract_stack_from_handler']),
    'warning_from_handler': ('ok', 6),
    'logging_from_handler': ('ok', ('logging_from_handler', 11)),
}

KNOWN_DIVERGENCES = {
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS,
    sorted(r) == sorted(list(EXPECTED) + list(KNOWN_DIVERGENCES)))


if __name__ == '__main__':
    if sys.argv[1:] == ['--emit']:
        for key, value in r.items():
            print('    %r: %r,' % (key, value))
        raise SystemExit
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-44s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    for key, expected in KNOWN_DIVERGENCES.items():
        actual = r[key]
        print('%-5s %-44s -> %r' % ('OK' if actual == expected else 'XFAIL',
                                    key, actual))
    print(SUMMARY)
