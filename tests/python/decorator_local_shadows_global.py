"""A decorator naming a local that shadows a module global applies the local (#1605).

Grail routed a bare-name decorator through the module whenever the module body
bound that name, without asking whether a local shadowed it.  So inside a
function, ``@my_deco'' with a local ``my_deco'' -- a nested def, a
parameter, a local of a function beyond a nested class -- applied the GLOBAL
decorator, silently.  CPython resolves the local first.  The rows cover a
single decorator, a chain, a class nested in the function, a parameter, a
local two functions up, and the guards: a name with no local, ``global''
declared in the function, and a class-body attribute.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


def my_deco(f):
    return ('global', f.__name__)


def other(f):
    return f


def nested_def():
    def my_deco(f):
        return ('local', f.__name__)

    @my_deco
    def q():
        return 'body'
    return q


def chain():
    def my_deco(f):
        return ('local', f if isinstance(f, str) else f.__name__)

    @my_deco
    @other
    def q():
        return 'body'
    return q


def nested_class():
    def my_deco(f):
        return property(lambda self: ('local', f.__name__))

    class L:
        @my_deco
        def q(self):
            return 'body'
    return L().q


def parameter(my_deco):
    @my_deco
    def q():
        return 'body'
    return q


def two_levels_up():
    def my_deco(f):
        return ('local-two-up', f.__name__)

    def inner():
        @my_deco
        def q():
            return 'body'
        return q
    return inner()


def no_local():
    @my_deco
    def q():
        return 'body'
    return q


def declared_global():
    global my_deco

    @my_deco
    def q():
        return 'body'
    return q


class Cb:
    my_deco = staticmethod(lambda f: property(lambda self: ('class-attr', f.__name__)))

    @my_deco
    def q(self):
        return 'body'


t('nested def shadows the global', nested_def)
t('in a decorator chain', chain)
t('from a class nested in the function', nested_class)
t('a parameter shadows the global', lambda: parameter(lambda f: ('param', f.__name__)))
t('a local two functions up', two_levels_up)
t('guard: no local, the global applies', no_local)
t('guard: global declared in the function', declared_global)
t('guard: a class-body attribute shadows the global', lambda: Cb().q)


EXPECTED = {
    'nested def shadows the global': "('local', 'q')",
    'in a decorator chain': "('local', 'q')",
    'from a class nested in the function': "('local', 'q')",
    'a parameter shadows the global': "('param', 'q')",
    'a local two functions up': "('local-two-up', 'q')",
    'guard: no local, the global applies': "('global', 'q')",
    'guard: global declared in the function': "('global', 'q')",
    'guard: a class-body attribute shadows the global': "('class-attr', 'q')",
}


def mismatches():
    """The rows that differ from CPython's, as 'label: got X, CPython Y'."""
    return ['%s: got %s, CPython %s' % (k, r.get(k), v)
            for k, v in EXPECTED.items() if r.get(k) != v]


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
