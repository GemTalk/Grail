"""Fixture: the compile-time errors of future statements.

A future statement is a ``from __future__ import`` among a module's leading
statements, after an optional docstring.  Each feature it names must be one
Python knows, ``braces`` included only as a joke (Python/future.c), and a
``from __future__ import`` anywhere else, at any depth, is misplaced
(Python/symtable.c check_import_from).  Grail compiled all of them
(test_exceptions testSyntaxErrorOffset, test_future).

The checks run after the parse, so a syntax error elsewhere in the source is
the one reported.  Every check here holds under CPython 3.14, which is what
makes it evidence.
"""

r = {}

MISPLACED = 'from __future__ imports must occur at the beginning of the file'


def outcome(source):
    try:
        compile(source, '<fragment>', 'exec')
        return 'ok'
    except SyntaxError as exc:
        return (exc.msg, exc.lineno, exc.offset, exc.end_lineno, exc.end_offset)


r['unknown_feature'] = outcome('from __future__ import doesnt_exist')
r['unknown_with_alias'] = outcome('from __future__ import nope as n')
r['unknown_after_known'] = outcome('from __future__ import nested_scopes\nfrom __future__ import rested_snopes')
r['star'] = outcome('from __future__ import *')
r['braces'] = outcome('from __future__ import braces')
r['braces_second_name'] = outcome('from __future__ import (division,\n   braces)')
r['after_a_statement'] = outcome('x=1\nfrom __future__ import division')
r['after_an_import'] = outcome('import os\nfrom __future__ import braces')
r['on_the_same_line'] = outcome('from __future__ import division; x=1; from __future__ import annotations')
r['after_a_second_string'] = outcome("'''Docstring'''\n\"not a docstring\"\nfrom __future__ import nested_scopes")
r['after_a_relative_one'] = outcome('from .__future__ import nested_scopes\nfrom __future__ import barry_as_FLUFL')
r['in_a_function'] = outcome('def f():\n  from __future__ import division')
r['syntax_error_first'] = outcome('from __future__ import braces\n1 +')[:3]
r['legal'] = [outcome(each) for each in (
    'from __future__ import annotations',
    '"doc"\nfrom __future__ import division\nfrom __future__ import annotations\nx = 1',
    'from __future__ import (nested_scopes, generators, division, absolute_import,\n'
    '    with_statement, print_function, unicode_literals, generator_stop, annotations)',
    'import __future__\nx = __future__.annotations')]

EXPECTED = {
    'unknown_feature': ('future feature doesnt_exist is not defined', 1, 24, 1, 36),
    'unknown_with_alias': ('future feature nope is not defined', 1, 24, 1, 33),
    'unknown_after_known': ('future feature rested_snopes is not defined', 2, 24, 2, 37),
    'star': ('future feature * is not defined', 1, 24, 1, 25),
    'braces': ('not a chance', 1, 24, 1, 30),
    'braces_second_name': ('not a chance', 2, 4, 2, 10),
    'after_a_statement': (MISPLACED, 2, 1, 2, 32),
    'after_an_import': (MISPLACED, 2, 1, 2, 30),
    'on_the_same_line': (MISPLACED, 1, 39, 1, 73),
    'after_a_second_string': (MISPLACED, 3, 1, 3, 37),
    'after_a_relative_one': (MISPLACED, 2, 1, 2, 38),
    'in_a_function': (MISPLACED, 2, 3, 2, 34),
    'syntax_error_first': ('invalid syntax', 2, 4),
    'legal': ['ok'] * 4,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-22s %-5s -> %r' % (key, 'OK' if actual == EXPECTED[key] else 'FAIL', actual))
    print(SUMMARY)
