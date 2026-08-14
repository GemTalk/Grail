"""Fixtures for ClassBodyDroppedStatementTestCase -- the two class-body
statement kinds Grail used to DROP.

CPython executes a class body top to bottom, so every statement in it runs at
class-definition time.  Grail compiles the body STRUCTURALLY -- it scans for the
names the body binds and emits one store per name -- so a statement that yields
no class-attribute pair had nothing to emit and was discarded whole, silently:

    class C:
        d = {}
        d['a'] = 1      # dropped: the target is a SUBSCRIPT, not a name
        k = d['a']      # KeyError

    class C:
        x = 1
        del x           # dropped: a ``del'' binds nothing
                        # hasattr(C, 'x') answered True

Both are now emitted at their own SOURCE POSITION, interleaved with the
attribute stores, because either can change what a later attribute value reads.

Every expectation was checked against CPython 3.14.
"""

def subscript_assign_runs():
    """The dropped write, and the read that made the loss visible."""
    class C:
        d = {}
        d['a'] = 1
        k = d['a']
    return (C.k, sorted(C.d.items()))


def subscript_assign_runs_in_source_order():
    """It has to run BETWEEN the attributes around it, not in a pass after
    them: ``before'' must miss the key and ``after'' must find it."""
    class C:
        d = {}
        before = 'a' in d
        d['a'] = 1
        after = 'a' in d
    return (C.before, C.after)


def del_removes_a_class_attribute():
    """``del x'' in a class body unbinds the class attribute -- the name is
    gone, not merely emptied, so hasattr is False and the read raises."""
    class C:
        x = 1
        del x
    try:
        C.x
        raised = 'no error'
    except AttributeError:
        raised = 'AttributeError'
    return (hasattr(C, 'x'), raised)


def del_of_an_unbound_name_raises():
    """CPython's class-body ``del'' is DELETE_NAME on the body's OWN namespace,
    so an unbound name is a NameError -- it does not quietly fall through to the
    module global or the enclosing local of that name."""
    try:
        class C:
            del nope
    except NameError:
        return 'NameError'
    return 'no error'


def del_does_not_reach_the_enclosing_local():
    """The name the class body deletes is its own.  Emitting the ordinary
    function-local form (``x := nil'') would have nilled the ENCLOSING def's
    temp, which CPython leaves entirely alone."""
    x = 7

    class C:
        x = 1
        del x

    return (hasattr(C, 'x'), x)


def del_in_a_method_is_still_a_local():
    """A method is a FUNCTION scope, so a ``del'' inside one is the ordinary
    local delete -- the class-body routing must not capture it."""
    class C:
        def m(self):
            a = 1
            del a
            try:
                return a
            except UnboundLocalError:
                return 'UnboundLocalError'
    return C().m()


def del_leaves_the_other_attributes_alone():
    """Only the named binding goes."""
    class C:
        x = 1
        y = 2
        del x
    return (hasattr(C, 'x'), C.y)


def del_of_a_subscript_still_works():
    """A ``del'' whose target carries its own receiver needs no class routing
    and keeps the emit it always had -- it was simply never reached at
    class-body level."""
    class C:
        d = {'a': 1, 'b': 2}
        del d['a']
    return sorted(C.d.items())
