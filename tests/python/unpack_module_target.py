"""Fixture: unpacking into MODULE names -- ``global a, b; a, b = x, y``.

Every leaf of an unpacking target has to be stored somewhere, and a
``global``-declared leaf has no local to store into: the parser strips a
declared global from the scope's variables, so the IR path's per-leaf
eligibility test -- "is this name in the local set" -- refused it, and with it
the whole statement.

THE SAME PREDICATE SERVES ``with ... as`` , which is why this fixture covers
both.  WithAst asks ___irUnpackTargetEligible___: / ___irUnpackLeafEligible___:
for its as-target, so ``with cm() as some_global:`` was refused for exactly the
same reason and is admitted by exactly the same change -- one row each in the
corpus, and one fix.

THE SHAPES MIX GLOBALS WITH LOCALS on purpose (``c, loc = ...``), because the
failure this guards against is routing a whole statement one way: the leaves
must be decided INDIVIDUALLY, each by the same four-way rule the plain
assignment's store consults.

``module_sees_the_change`` reads every name back from module scope at the end,
so a leaf that stored into a method temp -- right-looking inside its own
function, invisible outside -- cannot pass.

Everything here is verified against real CPython by running the file directly.
"""

r = {}

a = 'a0'
b = 'b0'
c = 'c0'
rest_target = None


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = '%s: %s' % (type(exc).__name__, exc)


def two_globals():
    global a, b
    a, b = 'A', 'B'
    return a, b


def a_global_and_a_local():
    global c
    c, loc = 'C', 'local'
    return c, loc


def swap_two_globals():
    global a, b
    a, b = b, a
    return a, b


def nested_tuple_target():
    global a, b
    a, (b, loc) = 'A2', ('B2', 'L2')
    return a, b, loc


def starred_global():
    global rest_target
    first, *rest_target = [1, 2, 3]
    return first, rest_target


class _CM:
    def __init__(self, value):
        self.value = value

    def __enter__(self):
        return self.value

    def __exit__(self, *a):
        return False


def with_as_a_global():
    global c
    with _CM('from-with') as c:
        inside = c
    return inside, c


def with_as_a_global_tuple():
    global a, b
    with _CM(('wa', 'wb')) as (a, b):
        pass
    return a, b


class H:
    def a_method_unpacking_globals(self):
        global a, b
        a, b = 'Am', 'Bm'
        return a, b


record('two_globals', two_globals)
record('a_global_and_a_local', a_global_and_a_local)
record('swap_two_globals', swap_two_globals)
record('nested_tuple_target', nested_tuple_target)
record('starred_global', starred_global)
record('a_method_unpacking_globals', H().a_method_unpacking_globals)
record('with_as_a_global', with_as_a_global)
record('with_as_a_global_tuple', with_as_a_global_tuple)
record('module_sees_the_change', lambda: (a, b, c, rest_target))

EXPECTED = {
    'two_globals': ('A', 'B'),
    'a_global_and_a_local': ('C', 'local'),
    'swap_two_globals': ('B', 'A'),
    'nested_tuple_target': ('A2', 'B2', 'L2'),
    'starred_global': (1, [2, 3]),
    'a_method_unpacking_globals': ('Am', 'Bm'),
    'with_as_a_global': ('from-with', 'from-with'),
    'with_as_a_global_tuple': ('wa', 'wb'),
    'module_sees_the_change': ('wa', 'wb', 'from-with', [2, 3]),
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        actual = r[key]
        print('%-5s %-28s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-28s is not in EXPECTED' % ('FAIL', extra))
