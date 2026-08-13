"""Fixtures for GlobalDeclarationScopeTestCase -- which scope a name resolves to
once some enclosing scope has declared it ``global''.

``global x'' binds the name to the module for the WHOLE of the declaring scope,
including the functions nested inside it.  Grail consulted only the NEAREST
enclosing function, so a nested def whose own scope said nothing about x
resolved it to an intervening function's local instead:

    x = 7
    def f():
        x = 1
        def g():
            global x
            def h(): return x     # 7 in CPython; Grail answered f's 1
            return h()
        return g()

Inside exec() the same code failed for a second, independent reason: the doit's
scope slot and the enclosing def's local are both spelled ``x'', and Smalltalk
resolves a bare identifier lexically, so the block temp shadowed the global.

Every expectation was checked against CPython 3.14.
"""

x = 7
# The write case gets its OWN global, so running it cannot disturb the read case.
xw = 7
y = 9


# ------------------------------------------------- resolution through a nested def

def read_through_intervening_scope():
    """h is two scopes inside the one that declared x global."""
    x = 1

    def g():
        global x

        def i():
            def h():
                return x
            return h()
        return i()
    return g()


def write_then_read_through_intervening_scope():
    """The declaring scope also ASSIGNS: the nested read must see the new
    global value, not the intervening local."""
    xw = 3

    def g():
        global xw
        xw = 2

        def i():
            def h():
                return xw
            return h()
        return i()
    return (g(), xw)


def own_local_beats_an_outer_global_declaration():
    """The INNERMOST scope with something to say wins.  k binds its own x, so
    g's declaration does not reach it -- a walk that stopped at the first
    global declaration it met would answer 2 here."""
    x = 1

    def g():
        global x

        def k():
            x = 5
            return x
        return k()
    return (g(), x)


def declaration_does_not_leak_to_a_sibling():
    """A symbol-table bug of CPython's own once leaked the declaration from one
    nested def to the next.  h has no declaration, so its y is f's local."""
    y = 1

    def g():
        global y
        return y

    def h():
        return y + 1
    return (g(), h())


def global_declared_but_unbound():
    """A name declared global and never bound anywhere raises NameError, not
    UnboundLocalError -- it is not a local."""
    def g():
        global never_bound_anywhere

        def h():
            return never_bound_anywhere
        return h()
    try:
        g()
    except NameError as e:
        return "NameError"
    return "NO ERROR"


# ------------------------------------------------------------------ inside exec()

SRC_READ = """if 1:
    x = 7
    def f():
        x = 1
        def g():
            global x
            def i():
                def h():
                    return x
                return h()
            return i()
        return g()
    r = f()
    rx = x
"""

SRC_WRITE = """if 1:
    x = 7
    def f():
        x = 1
        def g():
            global x
            x = 2
            def i():
                def h():
                    return x
                return h()
            return i()
        return g()
    r = f()
    rx = x
"""

SRC_PARALLEL = """if 1:
    def f():
        y = 1
        def g():
            global y
            return y
        def h():
            return y + 1
        return g, h
    y = 9
    g, h = f()
    result9 = g()
    result2 = h()
"""


def exec_read_through_intervening_scope():
    ns = {}
    exec(SRC_READ, ns)
    return (ns['r'], ns['rx'])


def exec_write_through_intervening_scope():
    """The store is the half with the worse failure mode: routed to the
    enclosing local, the assignment succeeds and the global silently keeps its
    old value."""
    ns = {}
    exec(SRC_WRITE, ns)
    return (ns['r'], ns['rx'])


def exec_separate_globals_and_locals():
    """Three-argument exec: the global-declared binding goes to the globals
    mapping while everything else goes to locals."""
    local_ns = {}
    global_ns = {}
    exec(SRC_PARALLEL, local_ns, global_ns)
    return (global_ns['result9'], global_ns['result2'])


def exec_scope_handle_is_not_a_binding():
    """The scope handle codegen uses to name a global slot explicitly is
    machinery and must not surface as a name the exec'd source defined."""
    ns = {}
    exec("z = 1", ns)
    return [k for k in ns if 'pyGlobals' in str(k)]
