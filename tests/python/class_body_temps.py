"""Fixture: class-body expressions that need a codegen temporary.

A class body is a scope, and Grail gives it a ``BlockAst`` like any other --
but ClassDefAst emits the body's statements one at a time straight into the
enclosing method and never asks that BlockAst to declare its temps.  So every
class-body construct whose codegen allocates one named an undefined symbol and
took the WHOLE module's compile down with it (Smalltalk CompileError 1001,
which ``except BaseException`` cannot see).

Two independent symptoms of that one gap, both here:

  * a generated ``___t_N`` -- the operand cache a CHAINED comparison needs, and
    with it every construct that can contain one: a comprehension filter, a
    conditional expression, a nested class, a class defined inside a function;

  * a user-written name -- the target of a WALRUS, which PEP 572 binds in the
    scope containing the expression.  For a class body that scope is the class
    NAMESPACE, so CPython leaves both the walrus target and the attribute it
    fed in ``C.__dict__``.

The same expression one line further in -- inside a method -- always compiled,
which is what made the failure look like a chained-comparison bug rather than a
scope one.  ``import urllib3`` died on the first shape (a class-body ``if``
guarded by ``(3, 12) <= sys.version_info < (3, 12, 3)``).
"""

LO = 1
HI = 10
X = 5
WORD = 'ab'


class Chained:
    """Every ___t_N shape, at class-body top level."""

    x = 5

    # the headline: one chain, one cached operand
    simple = 1 < x < 10

    # ...and the chain that does NOT need a cache, as a control
    unchained = 1 < x

    # a chain whose operands are module globals rather than class attributes
    from_globals = LO < X < HI

    # ``in`` / ``not in`` links allocate a temp of their own on top of the
    # shared operand cache
    membership = 'a' in WORD in ('ab', 'cd')
    negated = 'z' not in WORD in ('ab', 'cd')

    # three links, so two cached operands
    longer = 0 < x < 10 < 100

    # the same chain inside every comprehension form
    listed = [i for i in range(5) if 0 < i < 3]
    setted = {i for i in range(5) if 0 < i < 3}
    dicted = {k: k * 2 for k in range(5) if 0 < k < 3}
    genned = tuple(i for i in range(5) if 0 < i < 3)

    # ...and inside a conditional expression
    ternary = 'in-range' if 1 < x < 10 else 'out-of-range'

    # a chain that is used, not just stored
    doubled = (1 < x < 10) and (0 < x < 6)

    class Nested:
        """A class body nested in a class body has the same scope, and got the
        same undefined symbol -- it never reaches the module-binding block that
        used to be the only place a temp could be declared."""

        y = 7
        ok = 5 < y < 9

    def method(self):
        """The control that made this look like a comparison bug: the SAME
        expression in a method body always compiled, because a method's temps
        come from its own scope."""
        z = self.x
        return 1 < z < 10


def in_a_function():
    """A class defined inside a function reaches the emit by the third route
    (no module binding, no enclosing class), and failed identically."""

    class Local:
        y = 4
        ok = 1 < y < 10
        vals = [i for i in range(6) if 2 < i < 5]

    return Local.ok, Local.vals


class Walrus:
    """PEP 572 in a class body: the target binds in the class namespace."""

    # the proof that this is a SCOPE bug and not a lowering one: the undefined
    # symbol here was ``n``, written by hand, not a generated ``___t_N``
    z = (n := 7) + n

    # the walrus target is a real class attribute, readable by a LATER
    # statement the way any other class-body binding is
    echo = n * 2

    # a walrus whose branch does not run binds nothing -- the read then falls
    # through to module scope, exactly as a class-body name lookup does
    guarded = False and (never := 1)

    # both class-body statement forms that already routed their bindings
    # through the definitional store, now reached by a walrus too
    for _seed in [3]:
        looped = (m := _seed) + m
    if (flag := 4) > 3:
        branched = flag * 10


def probe():
    """Return a dict of observations for the SUnit case to assert against."""
    local_ok, local_vals = in_a_function()
    return {
        'simple': Chained.simple,
        'unchained': Chained.unchained,
        'from_globals': Chained.from_globals,
        'membership': Chained.membership,
        'negated': Chained.negated,
        'longer': Chained.longer,
        'listed': Chained.listed,
        'setted': sorted(Chained.setted),
        'dicted': sorted(Chained.dicted.items()),
        'genned': list(Chained.genned),
        'ternary': Chained.ternary,
        'doubled': Chained.doubled,
        'nested_ok': Chained.Nested.ok,
        'method': Chained().method(),
        'local_ok': local_ok,
        'local_vals': local_vals,
        'walrus_z': Walrus.z,
        'walrus_n': Walrus.n,
        'walrus_echo': Walrus.echo,
        'walrus_guarded': Walrus.guarded,
        'walrus_has_never': hasattr(Walrus, 'never'),
        'walrus_looped': Walrus.looped,
        'walrus_m': Walrus.m,
        'walrus_branched': Walrus.branched,
        'walrus_flag': Walrus.flag,
    }


EXPECTED = {
    'simple': True,
    'unchained': True,
    'from_globals': True,
    'membership': True,
    'negated': True,
    'longer': True,
    'listed': [1, 2],
    'setted': [1, 2],
    'dicted': [(1, 2), (2, 4)],
    'genned': [1, 2],
    'ternary': 'in-range',
    'doubled': True,
    'nested_ok': True,
    'method': True,
    'local_ok': True,
    'local_vals': [3, 4],
    'walrus_z': 14,
    'walrus_n': 7,
    'walrus_echo': 14,
    'walrus_guarded': False,
    'walrus_has_never': False,
    'walrus_looped': 6,
    'walrus_m': 3,
    'walrus_branched': 40,
    'walrus_flag': 4,
}


def diffs():
    """Keys where probe() disagrees with the CPython-measured EXPECTED table.

    The blanket check: a new observation added above is covered here the moment
    it gets an EXPECTED entry, without a matching SUnit method being written."""
    observed = probe()
    return sorted(k for k in EXPECTED if observed[k] != EXPECTED[k])


if __name__ == '__main__':
    observed = probe()
    for key in EXPECTED:
        actual = observed[key]
        expected = EXPECTED[key]
        print('%-18s %s %r' % (key, 'OK ' if actual == expected else 'DIFF', actual))
