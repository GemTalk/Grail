"""Fixture: an f-string conversion is the NAME s, r or a, written right after
the ``!``.

CPython reads the whole NAME after the ``!`` and refuses anything but those
three, a NAME separated from the ``!``, something that is not a NAME at all,
and a conversion followed by anything but the spec's ``:`` or the field's
``}`` (Parser/action_helpers.c:966-987, Grammar/python.gram:1528-1530).
Grail took the first letter alone, so ``f'{3!ss}'`` formatted with !s, and
the rest were ``invalid syntax`` (test_fstring test_conversions).  Every check
here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(source):
    try:
        return eval(source)
    except SyntaxError as exc:
        return (exc.msg, exc.lineno, exc.offset, exc.end_lineno, exc.end_offset)


def invalid(name):
    return "f-string: invalid conversion character '%s': expected 's', 'r', or 'a'" % name


r['name_too_long'] = [outcome(each) for each in ("f'{3!ss}'", "f'{3!ss:s}'", "f'{3!s1}'", "f'{3!s_}'", "f'{3!rr}'")]
r['name_not_a_conversion'] = [outcome(each) for each in ("f'{3!x}'", "f'{3!S}'", "f'{3!_}'", "f'{3!é}'")]
r['t_string'] = outcome("t'{3!ss}'")
r['name_not_right_after'] = [outcome(each) for each in ("f'{3! s}'", "f'{3!  r}'", "f'''{x!\nr}'''")]
r['not_a_name'] = [outcome(each) for each in ("f'{3!{\"r\"}}'", "f'{3!1}'")]
r['missing'] = [outcome(each) for each in ("f'{3!}'", "f'{3! }'", "f'{3!:x}'")]
r['followed_by_something_else'] = [outcome(each) for each in ("f'{3!r=}'", "f'{3!r!s}'")]
r['legal'] = [outcome(each) for each in ("f'{3!s }'", "f'{3!r:>5}'", "f'{3!=4}'", "f'{3=!r}'", "f'{\"x\"!a}'")]

EXPECTED = {
    'name_too_long': [(invalid('ss'), 1, 6, 1, 8), (invalid('ss'), 1, 6, 1, 8), (invalid('s1'), 1, 6, 1, 8),
                      (invalid('s_'), 1, 6, 1, 8), (invalid('rr'), 1, 6, 1, 8)],
    'name_not_a_conversion': [(invalid('x'), 1, 6, 1, 7), (invalid('S'), 1, 6, 1, 7), (invalid('_'), 1, 6, 1, 7),
                              (invalid('é'), 1, 6, 1, 7)],
    't_string': (invalid('ss').replace('f-string', 't-string'), 1, 6, 1, 8),
    'name_not_right_after': [
        ('f-string: conversion type must come right after the exclamation mark', 1, 5, 1, 8),
        ('f-string: conversion type must come right after the exclamation mark', 1, 5, 1, 9),
        ('f-string: conversion type must come right after the exclamation mark', 1, 7, 2, 2)],
    'not_a_name': [('f-string: invalid conversion character', 1, 6, 1, 7)] * 2,
    'missing': [('f-string: missing conversion character', 1, 6, 1, 7),
                ('f-string: missing conversion character', 1, 7, 1, 8),
                ('f-string: missing conversion character', 1, 6, 1, 7)],
    'followed_by_something_else': [("f-string: expecting ':' or '}'", 1, 7, 1, 8)] * 2,
    'legal': ['3', '    3', 'True', '3=3', "'x'"],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-28s %-5s -> %r' % (key, 'OK' if actual == EXPECTED[key] else 'FAIL', actual))
    print(SUMMARY)
