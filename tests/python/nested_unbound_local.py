"""Fixture: reading a local of a NESTED def before it is bound.

CPython raises ``UnboundLocalError`` for a local read on a path that has not
bound it.  Grail's text path emits a guard on every such read --
``(x ifNil: [UnboundLocalError ___signalUnbound___: #x])`` -- so the closure
form has always answered correctly.  The direct-to-IR path used to REFUSE any
closure its bound-before-read walk could not prove (``nestedDef:flow'', 16 class
methods), which kept it correct by staying away; it now emits the same guard.

Why this matters more than a missing-feature row: a bare read of an unbound
temp answers ``nil``, not an error.  So the failure mode is a silently wrong
VALUE -- the function returns None-ish instead of raising -- and every check
below is written to tell those two apart rather than merely to run.

The shapes here are the ones the corpus actually contains, taken from the
census's own examples: a binding inside a branch that does not run, a binding
after the read, a comprehension that does NOT bind the enclosing name (Python 3
gives it its own scope), a ``del`` that unbinds again, and the paths that DO
bind, which must keep working.

Everything here is verified against real CPython by running the file directly.
"""

r = {}


def caught(fn):
    """Run fn, reporting an UnboundLocalError as a string."""
    try:
        return fn()
    except UnboundLocalError:
        return 'UnboundLocalError'


# --- unbound on the path taken ----------------------------------------------

def branch_not_taken():
    def inner():
        if False:
            x = 0
        return x
    return caught(inner)


r['branch_not_taken'] = branch_not_taken()


def bound_after_the_read():
    def inner():
        y = x
        x = 1
        return y
    return caught(inner)


r['bound_after_the_read'] = bound_after_the_read()


def comprehension_does_not_bind_the_name():
    """Python 3 gives a comprehension its own scope, so this leaves x unbound."""
    def inner():
        if False:
            x = 0
        [x for x in [1]]
        return x
    return caught(inner)


r['comprehension_does_not_bind_the_name'] = comprehension_does_not_bind_the_name()


def deleted_then_read():
    def inner():
        x = 1
        del x
        return x
    return caught(inner)


r['deleted_then_read'] = deleted_then_read()


def unbound_only_on_one_branch():
    def inner(flag):
        if flag:
            x = 'bound'
        return x
    return inner(True), caught(lambda: inner(False))


r['unbound_only_on_one_branch'] = unbound_only_on_one_branch()


# --- the paths that DO bind must keep working -------------------------------

def plainly_bound():
    def inner():
        x = 41
        return x + 1
    return inner()


r['plainly_bound'] = plainly_bound()


def bound_in_both_branches():
    def inner(flag):
        if flag:
            x = 'yes'
        else:
            x = 'no'
        return x
    return inner(True), inner(False)


r['bound_in_both_branches'] = bound_in_both_branches()


def bound_by_a_loop_then_read():
    def inner():
        total = 0
        for i in range(4):
            total = total + i
        return total
    return inner()


r['bound_by_a_loop_then_read'] = bound_by_a_loop_then_read()


def parameters_are_bound_on_entry():
    def inner(a, b=2, *rest, **kw):
        return (a, b, rest, kw)
    return inner(1), inner(1, 9, 8, k=7)


r['parameters_are_bound_on_entry'] = parameters_are_bound_on_entry()


def a_none_valued_local_is_not_unbound():
    """The guard must distinguish ``unbound'' from ``bound to None''."""
    def inner():
        x = None
        return x is None
    return inner()


r['a_none_valued_local_is_not_unbound'] = a_none_valued_local_is_not_unbound()


# --- the enclosing scope's bindings still resolve ---------------------------

def reads_an_enclosing_local():
    outer_value = 'from-outer'

    def inner():
        return outer_value
    return inner()


r['reads_an_enclosing_local'] = reads_an_enclosing_local()


def shadows_an_enclosing_local():
    x = 'outer'

    def inner():
        x = 'inner'
        return x
    return inner(), x


r['shadows_an_enclosing_local'] = shadows_an_enclosing_local()


def a_closure_two_levels_down():
    def middle():
        def innermost():
            if False:
                z = 0
            return z
        return caught(innermost)
    return middle()


r['a_closure_two_levels_down'] = a_closure_two_levels_down()


EXPECTED = {
    'branch_not_taken': 'UnboundLocalError',
    'bound_after_the_read': 'UnboundLocalError',
    'comprehension_does_not_bind_the_name': 'UnboundLocalError',
    'deleted_then_read': 'UnboundLocalError',
    'unbound_only_on_one_branch': ('bound', 'UnboundLocalError'),
    'plainly_bound': 42,
    'bound_in_both_branches': ('yes', 'no'),
    'bound_by_a_loop_then_read': 6,
    'parameters_are_bound_on_entry': ((1, 2, (), {}), (1, 9, (8,), {'k': 7})),
    'a_none_valued_local_is_not_unbound': True,
    'reads_an_enclosing_local': 'from-outer',
    'shadows_an_enclosing_local': ('inner', 'outer'),
    'a_closure_two_levels_down': 'UnboundLocalError',
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-46s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-46s is not in EXPECTED' % ('FAIL', extra))
