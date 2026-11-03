"""Fixture: ``__str__ = None'' and ``__format__ = None'' block str() and format().

A class body that binds a special method to None blocks the protocol:
CPython finds the None on the type and calls it, so the operation raises
"'NoneType' object is not callable" rather than falling back -- str() to
repr(), format() to str().  test_str's test_format checks it for
``"{!s}"'' and ``"{}"''.

Grail fell back, answering the repr.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(thunk):
    try:
        return repr(thunk())
    except TypeError as e:
        return 'TypeError: %s' % e


class StrBlocked:
    def __repr__(self):
        return 'StrBlocked()'

    __str__ = None


class FormatBlocked:
    def __repr__(self):
        return 'FormatBlocked()'

    __format__ = None


class Unblocked(StrBlocked):
    def __str__(self):
        return 'a str of its own'


s, f = StrBlocked(), FormatBlocked()
NOT_CALLABLE = "TypeError: 'NoneType' object is not callable"

r['str_blocked'] = [outcome(lambda: str(s)), outcome(lambda: '{!s}'.format(s)), outcome(lambda: '{}'.format(s)),
                    outcome(lambda: '%s' % (s,)), outcome(lambda: f'{s}')]
r['repr_still_works'] = [outcome(lambda: repr(s)), outcome(lambda: '{!r}'.format(s))]
r['format_blocked'] = [outcome(lambda: format(f)), outcome(lambda: '{}'.format(f)), outcome(lambda: f'{f}')]
r['str_of_a_format_blocked_object'] = [outcome(lambda: str(f)), outcome(lambda: '{!s}'.format(f))]
r['a_subclass_def_unblocks'] = outcome(lambda: str(Unblocked()))

EXPECTED = {
    'str_blocked': [NOT_CALLABLE] * 5,
    'repr_still_works': ["'StrBlocked()'", "'StrBlocked()'"],
    'format_blocked': [NOT_CALLABLE] * 3,
    'str_of_a_format_blocked_object': ["'FormatBlocked()'", "'FormatBlocked()'"],
    'a_subclass_def_unblocks': "'a str of its own'",
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-32s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
