"""Fixture: a bare ``eval(expr)'' / ``exec(src)'' inside a comprehension in a def.

Since PEP 709 (3.12) a list, set or dict comprehension in a function is
INLINED into the function's frame, so ``eval('x')'' inside one sees the
comprehension variable ``x'' and the function's own locals together.  Grail
spells a bare single-argument eval/exec as a compile-time rewrite (step 0c of
CallAst >> printSmalltalkOn:) that hands the evaluated source a snapshot of
the enclosing function's names -- and that snapshot already appends the
targets of every comprehension the call sits in.

The IR path refused the call (`CallAst:frameSensitive-eval-bareRewrite' /
`-exec-bareRewrite') on the belief that a comprehension needed a different
namespace helper.  That is true only at MODULE scope; inside a def it is the
same snapshot, which the IR path already builds.

``free_name_not_captured'' is the guard on the other side: a name the
comprehension never mentions is not a free variable of the nested def, so the
evaluated source cannot see it -- CPython's NameError, which an over-eager
snapshot would turn into a value.
"""

r = {}


def record(key, fn):
    try:
        r[key] = 'NO RAISE: ' + repr(fn())
    except BaseException as exc:          # noqa: BLE001 - the message IS the fixture
        r[key] = type(exc).__name__ + ': ' + str(exc)


def target_only(xs):
    return [eval('x * 2') for x in xs]


def target_and_local(xs):
    k = 10
    return [eval('x + k') for x in xs]


def exec_in_comprehension(xs):
    out = []
    [exec('out.append(x)') for x in xs]
    return out


def nested_comprehensions(xs):
    return [[eval('(x, y)') for y in xs] for x in xs]


def tuple_target(pairs):
    return [eval('a - b') for a, b in pairs]


def with_filter(xs):
    return [x for x in xs if eval('x % 2')]


def set_and_dict(xs):
    return sorted({eval('x') for x in xs}), {x: eval('x * x') for x in xs}


def generator_expression(xs):
    return list(eval('x') for x in xs)


def in_nested_def(xs):
    m = 3
    def inner():
        return [eval('x * m') for x in xs if m]
    return inner()


def free_name_not_captured(xs):
    z = 5
    def inner():
        return [eval('x + z') for x in xs]
    return inner()


class Holder:
    scale = 7

    def method(self, xs):
        return [eval('x * self.scale') for x in xs]


record('target_only', lambda: target_only([1, 2]))
record('target_and_local', lambda: target_and_local([1, 2]))
record('exec_in_comprehension', lambda: exec_in_comprehension([1, 2]))
record('nested_comprehensions', lambda: nested_comprehensions([1, 2]))
record('tuple_target', lambda: tuple_target([(5, 1), (7, 3)]))
record('with_filter', lambda: with_filter([1, 2, 3]))
record('set_and_dict', lambda: set_and_dict([1, 2]))
record('generator_expression', lambda: generator_expression([1, 2]))
record('in_nested_def', lambda: in_nested_def([1, 2]))
record('free_name_not_captured', lambda: free_name_not_captured([1]))
record('method', lambda: Holder().method([1, 2]))


EXPECTED = {
    'target_only': 'NO RAISE: [2, 4]',
    'target_and_local': 'NO RAISE: [11, 12]',
    'exec_in_comprehension': 'NO RAISE: [1, 2]',
    'nested_comprehensions':
        'NO RAISE: [[(1, 1), (1, 2)], [(2, 1), (2, 2)]]',
    'tuple_target': 'NO RAISE: [4, 4]',
    'with_filter': 'NO RAISE: [1, 3]',
    'set_and_dict': 'NO RAISE: ([1, 2], {1: 1, 2: 4})',
    'generator_expression': 'NO RAISE: [1, 2]',
    'in_nested_def': 'NO RAISE: [3, 6]',
    'free_name_not_captured': "NameError: name 'z' is not defined",
    'method': 'NO RAISE: [7, 14]',
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-24s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-24s is not in EXPECTED' % ('FAIL', extra))
