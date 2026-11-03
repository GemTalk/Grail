"""Fixture: a ContextVar's Token is a context manager, as CPython 3.14's is.

CPython 3.14 made the Token that ContextVar.set returns a context manager:
entering answers the token, and leaving resets the variable to what it was
before the set (Python/context.c:1300-1333), so ``with var.set(x):`` scopes
a value to the block -- an exception leaving the block included.

Grail's Token had no __enter__ or __exit__, so every such ``with'' raised
TypeError: seven of test_context's tests.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import contextvars

r = {}

v = contextvars.ContextVar('v', default='outer')


def scoped():
    seen = []
    with v.set('inner') as token:
        seen.append((v.get(), token.var is v, token.old_value))
        with v.set('innermost'):
            seen.append(v.get())
        seen.append(v.get())
    seen.append(v.get())
    return seen


r['the_block_scopes_the_value'] = scoped()


def through_an_exception():
    try:
        with v.set('doomed'):
            raise KeyError('k')
    except KeyError as e:
        return v.get(), repr(e)


r['an_exception_still_resets'] = through_an_exception()

w = contextvars.ContextVar('w')


def unset_before():
    with w.set(1):
        inside = w.get()
    try:
        w.get()
        after = 'still set'
    except LookupError:
        after = 'unset again'
    return inside, after


r['an_unset_variable_is_unset_again'] = unset_before()


def reused():
    token = v.set('x')
    with token:
        pass
    try:
        v.reset(token)
    except RuntimeError:
        return 'RuntimeError'
    return 'reset twice'


r['a_token_resets_once'] = reused()

EXPECTED = {
    'the_block_scopes_the_value': [('inner', True, contextvars.Token.MISSING), 'innermost', 'inner', 'outer'],
    'an_exception_still_resets': ('outer', "KeyError('k')"),
    'an_unset_variable_is_unset_again': (1, 'unset again'),
    'a_token_resets_once': 'RuntimeError',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-33s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
