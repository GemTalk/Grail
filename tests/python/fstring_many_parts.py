"""Fixture: an f-string with very many parts compiles, and still evaluates them left to right.

CPython builds an f-string flat, so its size is limited only by memory:
test_fstring joins 256 f-strings of 255 fields each and expects the
concatenation.  Grail joined the parts with a left-folded chain of ``+``, one
level per part, and every pass over the tree recursed through it -- some
130,000 levels for that case, a RecursionError.  Joining them as a balanced
tree keeps the order fields are evaluated in, which this checks.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def build(n, extra=''):
    return "f'" + ('{x} ' * n) + extra + "'"


x = 'X'
width = 1
r['around_256'] = [eval(build(i)) == (x + ' ') * i for i in range(250, 260)]
r['many_concatenated'] = eval(build(255) * 256) == (x + ' ') * (255 * 256)
r['nested_spec'] = eval(build(253, '{x:{width}} ')) == (x + ' ') * 254
r['constants'] = eval("f'{1}' 'x' 'y'" * 1024) == '1xy' * 1024

order = []


def note(i):
    order.append(i)
    return i


joined = eval("f'" + ''.join('{note(%d)}' % i for i in range(300)) + "'", {'note': note})
r['evaluation_order'] = (len(joined), order == list(range(300)))

EXPECTED = {
    'around_256': [True] * 10,
    'many_concatenated': True,
    'nested_spec': True,
    'constants': True,
    'evaluation_order': (len(''.join(str(i) for i in range(300))), True),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-18s %-5s -> %r' % (key, 'OK' if actual == EXPECTED[key] else 'FAIL', actual))
    print(SUMMARY)
