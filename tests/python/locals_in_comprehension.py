"""Fixture: bare ``locals()'', ``vars()'' and ``dir()'' inside a comprehension
in a def.

PEP 709 inlines a list, set or dict comprehension into its function, so its
``locals()'' is the FUNCTION's locals plus the comprehension's own variables.
Grail's text path has answered exactly that since the comprehension-locals fix:
its function snapshot appends the enclosing comprehensions' targets.  The IR
path refused the call (`CallAst:frameSensitive-locals' / `-vars' / `-dir'),
because its scope test read the COMPILE context, which during the eligibility
probe of a top-level def has no function at all.  The emit it refused is the
snapshot it already builds for a plain ``locals()'' in a def.

A GENERATOR EXPRESSION is NOT inlined in CPython: it runs in a frame of its
own, whose locals are ``.0'' (the iterator) and its targets.  Grail treats it
like the other comprehensions on both paths, so that row is an XFAIL.
"""

r = {}


def record(key, fn):
    try:
        r[key] = 'NO RAISE: ' + repr(fn())
    except BaseException as exc:          # noqa: BLE001 - the message IS the fixture
        r[key] = type(exc).__name__ + ': ' + str(exc)


def locals_items(xs):
    k = 1
    return [sorted(locals().items()) for x in xs]


def vars_names(xs):
    return [sorted(vars()) for x in xs]


def dir_names(xs):
    k = 1
    return [dir() for x in xs]


def nested(xs):
    return [[sorted(locals()) for y in xs] for x in xs]


def tuple_target(pairs):
    return [sorted(locals()) for a, b in pairs]


def target_shadows_local(xs):
    x = 'outer'
    return [locals()['x'] for x in xs], x


def set_and_dict(xs):
    return ({len(locals()) for x in xs},
            {x: sorted(locals()) for x in xs})


def in_nested_def(xs):
    m = 2
    def inner():
        return [sorted(locals()) for x in xs if m]
    return inner()


def in_filter(xs):
    return [x for x in xs if 'x' in locals()]


def generator_expression(xs):
    return list(sorted(locals()) for x in xs)


class Holder:
    def method(self, xs):
        return [sorted(locals()) for x in xs]


record('locals_items', lambda: locals_items([1, 2]))
record('vars_names', lambda: vars_names([1]))
record('dir_names', lambda: dir_names([1]))
record('nested', lambda: nested([1]))
record('tuple_target', lambda: tuple_target([(1, 2)]))
record('target_shadows_local', lambda: target_shadows_local([1, 2]))
record('set_and_dict', lambda: set_and_dict([1]))
record('in_nested_def', lambda: in_nested_def([1]))
record('in_filter', lambda: in_filter([1, 2]))
record('generator_expression', lambda: generator_expression([1]))
record('method', lambda: Holder().method([1]))


EXPECTED = {
    'locals_items':
        "NO RAISE: [[('k', 1), ('x', 1), ('xs', [1, 2])], "
        "[('k', 1), ('x', 2), ('xs', [1, 2])]]",
    'vars_names': "NO RAISE: [['x', 'xs']]",
    'dir_names': "NO RAISE: [['k', 'x', 'xs']]",
    'nested': "NO RAISE: [[['x', 'xs', 'y']]]",
    'tuple_target': "NO RAISE: [['a', 'b', 'pairs']]",
    'target_shadows_local': "NO RAISE: ([1, 2], 'outer')",
    'set_and_dict': "NO RAISE: ({2}, {1: ['x', 'xs']})",
    'in_nested_def': "NO RAISE: [['m', 'x', 'xs']]",
    'in_filter': 'NO RAISE: [1, 2]',
    'method': "NO RAISE: [['self', 'x', 'xs']]",
}

# Grail's answer (both paths), so a fix shows up as an XPASS.
XFAIL = {
    'generator_expression': "NO RAISE: [['x', 'xs']]",
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-22s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for key, grail in XFAIL.items():
        actual = r[key]
        print('%-5s %-22s -> %r' % ('XFAIL' if actual != grail else 'XPASS',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED) - set(XFAIL)):
        print('%-5s %-22s is in neither table' % ('FAIL', extra))
