"""Fixture: an error in a field nested inside a format spec is located as CPython locates it.

A format spec may hold replacement fields of its own (``f'{x:{width}}'``),
and CPython reports their errors -- every field error, at the token it names
-- in the source like any other.  Grail parses a spec as an f-string of its
own, from a token that carried no anchors into the source, so such an error
had no location at all: ``compile`` placed it at the end of the f-string and
``eval`` raised a SyntaxError whose message was ``None``.  Every check here
holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(source):
    try:
        compile(source, '<fragment>', 'exec')
        return 'ok'
    except SyntaxError as exc:
        return (exc.msg, exc.lineno, exc.offset, exc.end_lineno, exc.end_offset)


def evaluated(source):
    try:
        return eval(source)
    except SyntaxError as exc:
        return (exc.msg, exc.args[0] if exc.args else None)


r['missing_expression'] = outcome("f'{10:{ }}'")
r['no_expression'] = outcome("f'{4:{/5}}'")
r['missing_comma_on_a_later_line'] = outcome("x = 1\nf'{3:{a b}}'")
r['two_specs_deep'] = outcome("f'{3:{4:{5 6}}}'")
r['in_the_second_spec_field'] = outcome("f'{3:{4}{.}}'")
r['eval_has_a_message'] = evaluated("f'{10:{ }}'")
r['legal'] = [evaluated("f'{3:{4}}'"), evaluated("f'{3.14159:.{2}f}'"), evaluated("f'{\"x\":{\">\"}{5}}'"),
              evaluated("f'{3:{4:{1}}}'")]

EXPECTED = {
    'missing_expression': ("f-string: valid expression required before '}'", 1, 9, 1, 10),
    'no_expression': ("f-string: expecting a valid expression after '{'", 1, 7, 1, 8),
    'missing_comma_on_a_later_line': ('invalid syntax. Perhaps you forgot a comma?', 2, 7, 2, 10),
    'two_specs_deep': ('invalid syntax. Perhaps you forgot a comma?', 1, 10, 1, 13),
    'in_the_second_spec_field': ("f-string: expecting a valid expression after '{'", 1, 10, 1, 11),
    'eval_has_a_message': ("f-string: valid expression required before '}'",
                           "f-string: valid expression required before '}'"),
    'legal': ['   3', '3.14', '    x', '   3'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-30s %-5s -> %r' % (key, 'OK' if actual == EXPECTED[key] else 'FAIL', actual))
    print(SUMMARY)
