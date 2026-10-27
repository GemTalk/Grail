"""Fixture: a match statement's patterns are refused where CPython's compiler refuses them.

CPython's code generator checks each case's pattern before it emits it
(Python/codegen.c, codegen_match_inner and the codegen_pattern_* helpers):
an irrefutable pattern -- a capture or a wildcard -- must be last, in its
case and among its or-alternatives, unless the case is guarded; a pattern
binds each name once; or-alternatives bind the same names; a mapping looks up
each literal key once and only literal or dotted keys; a value pattern
compares against a literal or a dotted name, never an f-string; a class
pattern names each attribute once.  Its grammar refuses ``{**_}`` and a
lone ``(*x)``.  Grail compiled all of these.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(*case_lines):
    source = 'match subject:\n' + ''.join('    %s\n        pass\n' % c for c in case_lines)
    try:
        compile(source, '<test>', 'exec')
        return 'ok'
    except SyntaxError as e:
        return e.msg, e.lineno, e.offset


r['unreachable'] = [
    outcome('case a:', 'case 1:'),
    outcome('case _:', 'case 1:'),
    outcome('case x | 1:'),
    outcome('case _ | (True | False):'),
    outcome('case (x as y):', 'case 1:')]
r['bound_twice'] = [
    outcome('case [a, a]:'),
    outcome('case a as a:'),
    outcome('case {"k": a, **a}:'),
    outcome('case Point(a, b=a):'),
    outcome('case [a, ([a] | (a,))]:')]
r['alternatives'] = [
    outcome('case "a" | a:'),
    outcome('case [a, [b] | [c] | [d]]:')]
r['mapping_keys'] = [
    outcome('case {"a": _, "a": _}:'),
    outcome('case {0: _, False: _}:'),
    outcome('case {0: _, 0.0: _}:'),
    outcome('case {0: _, -0: _}:'),
    outcome('case {f"": _}:'),
    outcome('case {0+0: _}:')]
r['value_patterns'] = [
    outcome('case f"":'),
    outcome('case f"{x}":'),
    outcome('case f"a" "b":')]
r['class_and_sequence'] = [
    outcome('case Point(x=_, x=_):'),
    outcome('case [*a, *b]:')]
r['grammar'] = [outcome('case {**_}:'), outcome('case (*x):')]
r['still_compile'] = [outcome(*c) for c in (
    ('case x if x:', 'case 1:'),
    ('case [x, _]:', 'case 1:'),
    ('case [a] | (a,):', 'case _:'),
    ('case {"a": x, **rest}:', 'case 1:'),
    ('case {0: _, "0": _, b"0": _, None: _}:',),
    ('case Point(x=_, y=_):', 'case 1:'),
    ('case _ if subject:', 'case 1:'),
    ('case 1 | 2 | _:',),
    ('case (*x,):', 'case [*_, y]:'),
    ('case -1 | 1+2j | -1-2j | "s" "t" | b"b" | None | Color.RED:',))]

EXPECTED = {
    'unreachable': [
        ("name capture 'a' makes remaining patterns unreachable", 2, 10),
        ('wildcard makes remaining patterns unreachable', 2, 10),
        ("name capture 'x' makes remaining patterns unreachable", 2, 10),
        ('wildcard makes remaining patterns unreachable', 2, 10),
        ("name capture 'x' makes remaining patterns unreachable", 2, 11)],
    'bound_twice': [
        ("multiple assignments to name 'a' in pattern", 2, 14),
        ("multiple assignments to name 'a' in pattern", 2, 10),
        ("multiple assignments to name 'a' in pattern", 2, 10),
        ("multiple assignments to name 'a' in pattern", 2, 21),
        ("multiple assignments to name 'a' in pattern", 2, 15)],
    'alternatives': [('alternative patterns bind different names', 2, 10),
                     ('alternative patterns bind different names', 2, 14)],
    'mapping_keys': [
        ("mapping pattern checks duplicate key ('a')", 2, 10),
        ('mapping pattern checks duplicate key (False)', 2, 10),
        ('mapping pattern checks duplicate key (0.0)', 2, 10),
        ('mapping pattern checks duplicate key (0)', 2, 10),
        ('mapping pattern keys may only match literals and attribute lookups', 2, 10),
        ('imaginary number required in complex literal', 2, 13)],
    'value_patterns': [('patterns may only match literals and attribute lookups', 2, 10)] * 3,
    'class_and_sequence': [('attribute name repeated in class pattern: x', 2, 23),
                           ('multiple starred names in sequence pattern', 2, 10)],
    'grammar': [('invalid syntax', 2, 13), ('invalid syntax', 2, 13)],
    'still_compile': ['ok'] * 10,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-20s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
