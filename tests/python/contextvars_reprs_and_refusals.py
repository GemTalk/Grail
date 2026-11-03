"""Fixture: contextvars reprs its objects and refuses its misuses as CPython's does.

CPython's _contextvars (Python/context.c):

* Context() takes no arguments; a Context compares equal to one holding the
  same variables and values, is unhashable, refuses a key that is not a
  ContextVar, and is registered as a collections.abc.Mapping
  (Lib/contextvars.py);
* ContextVar() takes exactly one positional str name, hashed as it is made;
  its repr names its default and its address, and a default that
  contains it is cut short by that container's own guard; a variable with no value raises LookupError carrying the
  variable;
* reset refuses a used token, then one from another variable, then one from
  another context, each message starting with the token's repr;
* none of Context, ContextVar and Token can be subclassed.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import collections.abc
import contextvars as cv
import re

r = {}


def outcome(thunk):
    try:
        return thunk()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def masked(text):
    return re.sub(r'0x[0-9a-fA-F]+', 'ADDR', text)


r['context_arguments'] = [outcome(lambda: cv.Context(1)), outcome(lambda: cv.Context(a=1)),
                          type(cv.Context(**{})).__name__]
r['context_keys'] = [outcome(lambda: cv.Context()[1]), outcome(lambda: 1 in cv.Context()),
                     outcome(lambda: cv.Context().get(1))]
r['context_is_a_mapping'] = [isinstance(cv.Context(), collections.abc.Mapping),
                             issubclass(cv.Context, collections.abc.Mapping)]
r['context_equality'] = [cv.Context() == cv.Context(), cv.Context() == {},
                         outcome(lambda: hash(cv.Context())).startswith('TypeError')]
r['contextvar_arguments'] = [outcome(lambda: cv.ContextVar()), outcome(lambda: cv.ContextVar(1)),
                             outcome(lambda: cv.ContextVar('a', 'b'))]

a = cv.ContextVar('a')
d = cv.ContextVar('d', default=123)
lst = []
rec = cv.ContextVar('r', default=lst)
lst.append(rec)
r['reprs'] = [masked(repr(a)), masked(repr(d)), masked(repr(rec)), masked(repr(lst))]
r['lookup_carries_the_variable'] = masked(outcome(lambda: cv.ContextVar('c').get()))


def resets():
    v, w = cv.ContextVar('v'), cv.ContextVar('w')
    used = v.set(1)
    v.reset(used)
    other = w.set(2)
    return [masked(outcome(lambda: v.reset(used))), masked(outcome(lambda: v.reset(other)))]


r['reset_refusals'] = resets()
r['final_types'] = [masked(outcome(lambda: type('X', (t,), {}))) for t in (cv.ContextVar, cv.Context, cv.Token)]

EXPECTED = {
    'context_arguments': ['TypeError: Context() does not accept any arguments'] * 2 + ['Context'],
    'context_keys': ['TypeError: a ContextVar key was expected, got 1'] * 3,
    'context_is_a_mapping': [True, True],
    'context_equality': [True, False, True],
    'contextvar_arguments': ['TypeError: ContextVar() takes exactly 1 positional argument (0 given)',
                             'TypeError: context variable name must be a str',
                             'TypeError: ContextVar() takes at most 1 positional argument (2 given)'],
    'reprs': ["<ContextVar name='a' at ADDR>", "<ContextVar name='d' default=123 at ADDR>",
              "<ContextVar name='r' default=[<ContextVar name='r' default=[...] at ADDR>] at ADDR>",
              "[<ContextVar name='r' default=[...] at ADDR>]"],
    'lookup_carries_the_variable': "LookupError: <ContextVar name='c' at ADDR>",
    'reset_refusals': ["RuntimeError: <Token used var=<ContextVar name='v' at ADDR> at ADDR> has already been used once",
                       "ValueError: <Token var=<ContextVar name='w' at ADDR> at ADDR> was created by a different ContextVar"],
    'final_types': ["TypeError: type '_contextvars.%s' is not an acceptable base type" % n
                    for n in ('ContextVar', 'Context', 'Token')],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-28s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
