"""Fixture: a starred target may follow at most 255 others.

CPython's unpacking opcode carries the count of targets before the star in
one byte, so its compiler refuses a star at index 256 or later with
"too many expressions in star-unpacking assignment" (Python/codegen.c:3399-3410)
-- in an assignment, a for target and a list target alike -- and compiles
one at index 255.

Grail compiled any count, so test_unpack_ex's "size constraints" examples
were not refused.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def targets(count):
    return ', '.join('a%d' % i for i in range(count))


def outcome(source):
    try:
        compile(source, '<fixture>', 'exec')
        return 'compiled'
    except SyntaxError as e:
        return 'SyntaxError: %s' % e.msg


r['at_the_limit'] = outcome(targets(255) + ', *rest = range(300)')
r['past_the_limit'] = [outcome(targets(256) + ', *rest = range(300)'),
                       outcome(targets(257) + ', *rest = range(300)')]
r['in_a_for_target'] = outcome('for ' + targets(256) + ', *rest in []: pass')
r['in_a_list_target'] = outcome('[' + targets(256) + ', *rest] = range(300)')
r['the_star_last_but_one'] = outcome(targets(255) + ', *rest, z = range(300)')

namespace = {}
exec(targets(255) + ', *rest = range(300)', namespace)
r['the_limit_still_unpacks'] = [namespace['a0'], namespace['a254'], len(namespace['rest'])]

EXPECTED = {
    'at_the_limit': 'compiled',
    'past_the_limit': ['SyntaxError: too many expressions in star-unpacking assignment'] * 2,
    'in_a_for_target': 'SyntaxError: too many expressions in star-unpacking assignment',
    'in_a_list_target': 'SyntaxError: too many expressions in star-unpacking assignment',
    'the_star_last_but_one': 'compiled',
    'the_limit_still_unpacks': [0, 254, 45],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-24s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
