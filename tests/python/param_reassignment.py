# Fixture for ImportlibTestCase >> testRunPathParamReassignment.
# Each top-level def exercises one branch of the param-needs-temp
# decision in FunctionDefAst >> generateMethodSourceOn:.


def bump(x):
    # Direct rebind of the parameter — needs a block temp.
    x = x + 1
    return x


def squash(predicate):
    # Rebind via a nested def — needs a block temp; NameAst-store
    # alone would miss this, so the walker must also treat
    # FunctionDefAst.name as a write in the enclosing scope.
    if predicate is None:
        def predicate(_):
            return 'replaced'
    return predicate(None)


def passthrough(value):
    # No rebind; the optimisation fires and `value` serves as the
    # Smalltalk method argument directly.
    return value


bumped = bump(10)
squashed = squash(None)
passed_through = passthrough(42)
