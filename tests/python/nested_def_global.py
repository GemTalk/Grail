"""Fixture: a NESTED def (or a def inside one) that declares ``global''.

``global x'' is a declaration, not a statement -- both Grail codegen paths emit
nothing for it.  What it decides is where every read and store of ``x'' in the
declaring scope goes: the MODULE binding, never a local, and never an enclosing
function's local either.

IN A TOP-LEVEL DEF OR A METHOD THAT COSTS THE IR PATH NOTHING, because the
PARSER strips a declared global from the declaring scope's variables, so no
local exists to be found by mistake.  A NESTED def compiles to a BLOCK of the
enclosing method, and the binding that must not win belongs to the ENCLOSING
scope, whose temps are still in scope inside the block.  The two halves of the
IR path then disagreed with each other: the store asked only whether a leaf
existed and found the enclosing one, while the read consulted the declaration
and went to the module.  Measured on the ``shadowing'' shape below, that wrote
the enclosing local and read a stale global -- two wrong answers at once, and
neither an error.

So the shapes here are chosen to SEPARATE the two bindings: every one of them
has an enclosing local of the same name as the global, and each check reports
both, so a store that lands in the wrong place cannot be hidden by a read that
lands in the same wrong place.

Everything here is verified against real CPython by running the file directly.
"""

r = {}

g1 = 'g1-initial'
g2 = 'g2-initial'
counter = 0
loopvar = None
caught = None
deleted_one = 'present'


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = '%s: %s' % (type(exc).__name__, exc)


class Holder:
    """The receiver of the enclosing frame is an INSTANCE, not the module."""

    def in_a_method(self):
        g1 = 'method local'

        def setit():
            global g1
            g1 = 'set from a method nested def'
            return g1

        return setit(), g1


record('inside_a_method', Holder().in_a_method)


def augassign_shadowed():
    """An augmented store is a read AND a write; both must route together."""
    counter = 100

    def bump():
        global counter
        counter += 5
        return counter

    return bump(), counter


record('augassign_shadowed', augassign_shadowed)


def two_names_one_statement():
    g1 = 'local1'
    g2 = 'local2'

    def setboth():
        global g1, g2
        g1 = 'both-1'
        g2 = 'both-2'

    setboth()
    return g1, g2


record('two_names_one_statement', two_names_one_statement)


def doubly_nested_reads_it():
    """The declaration reaches a def nested inside the DECLARING one.

    ``g1'' is a free variable of ``inner'' by the closure machinery's reckoning,
    but the cell it needs reads the MODULE, not a captured temp -- there is no
    temp to capture.  This is the shape whose cell build raised, so the whole
    enclosing method fell back to text with every value still correct.
    """
    g1 = 'shadow'

    def outer():
        global g1
        g1 = 'set by outer nested'

        def inner():
            return g1

        return inner()

    return outer(), g1


record('doubly_nested_reads_it', doubly_nested_reads_it)


def a_loop_target_is_global():
    """A ``for'' target is a binder like any other."""
    loopvar = 'shadow'

    def spin():
        global loopvar
        for loopvar in (1, 2, 3):
            pass
        return loopvar

    return spin(), loopvar


record('a_loop_target_is_global', a_loop_target_is_global)


def an_except_target_is_global():
    """``except X as name'' binds, and PEP 3110 unbinds it afterwards."""
    caught = 'shadow'

    def boom():
        global caught
        try:
            raise ValueError('kaboom')
        except ValueError as caught:
            return str(caught)

    return boom(), caught


record('an_except_target_is_global', an_except_target_is_global)


def a_del_of_a_global():
    """``del'' of a declared global REMOVES the module binding."""
    deleted_one = 'shadow'

    def drop():
        global deleted_one
        del deleted_one
        try:
            return deleted_one
        except NameError:
            return 'NameError'

    return drop(), deleted_one


record('a_del_of_a_global', a_del_of_a_global)


def a_lambda_inside_reads_it():
    g2 = 'shadow'

    def setit():
        global g2
        g2 = 'lambda sees this'
        return (lambda: g2)()

    return setit(), g2


record('a_lambda_inside_reads_it', a_lambda_inside_reads_it)


def an_unbound_global():
    """A declared global that was never bound raises NameError, not None."""
    def read():
        global never_bound_anywhere
        return never_bound_anywhere

    return read()


record('an_unbound_global', an_unbound_global)


def the_enclosing_declares_it_too():
    global g1

    def setit():
        global g1
        g1 = 'both levels declared'
        return g1

    return setit(), g1


record('the_enclosing_declares_it_too', the_enclosing_declares_it_too)


def a_parameter_of_the_enclosing(g2):
    """The enclosing binding is a PARAMETER, which the nested def must not see."""
    def setit():
        global g2
        g2 = 'not the parameter'
        return g2

    return setit(), g2


record('a_parameter_of_the_enclosing',
       lambda: a_parameter_of_the_enclosing('param'))


EXPECTED = {
    'inside_a_method': ('set from a method nested def', 'method local'),
    'augassign_shadowed': (5, 100),
    'two_names_one_statement': ('local1', 'local2'),
    'doubly_nested_reads_it': ('set by outer nested', 'shadow'),
    'a_loop_target_is_global': (3, 'shadow'),
    'an_except_target_is_global': ('kaboom', 'shadow'),
    'a_del_of_a_global': ('NameError', 'shadow'),
    'a_lambda_inside_reads_it': ('lambda sees this', 'shadow'),
    'an_unbound_global': "NameError: name 'never_bound_anywhere' is not defined",
    'the_enclosing_declares_it_too': ('both levels declared', 'both levels declared'),
    'a_parameter_of_the_enclosing': ('not the parameter', 'param'),
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        actual = r[key]
        print('%-5s %-32s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-32s is not in EXPECTED' % ('FAIL', extra))
