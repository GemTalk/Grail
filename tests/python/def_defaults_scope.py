"""Fixtures for DefDefaultsScopeTestCase -- ``def f(x=x)``.

A default expression is evaluated in the scope ENCLOSING the def, at
definition time, so a parameter of the same name does not shadow it:

    limit = 7
    def f(v, limit=limit):      # the default reads the MODULE's limit
        return limit            # the body reads the PARAMETER

Grail resolved the default in the function's OWN scope, and the idiom broke
three different ways depending on where the def sat:

  * module-level def -- the default read the parameter, which is still nil
    while its own default is being computed, so f(0) answered nil
  * def or lambda nested in a def, over a MODULE global -- the default is
    hoisted into a definition-time block outside the function, and a bare
    identifier for a module attribute does not compile there, so the WHOLE
    MODULE failed to import: CompileError 1001, 'undefined symbol'
  * copy.py's own ``def _deepcopy_list(x, memo, deepcopy=deepcopy)``

The rule already existed for ``lambda`` (see lambda_defaults.py) and was
restricted to it on the belief that a def's defaults were already handled
elsewhere.  They were not.

Every expectation was checked against CPython 3.14.
"""

limit = 7


def helper(a):
    return 'h' + str(a)


def module_level(v, limit=limit):
    """THE BUG, in its simplest form.  Grail answered None here: the default
    read the parameter it was itself about to bind."""
    return limit


def module_level_callable(v, helper=helper):
    """The shape that matters in practice -- the idiom exists to make a
    module-level function a local lookup.  copy.py uses it for ``deepcopy``
    and the resulting None was CALLED: 'UndefinedObject' object is not
    callable."""
    return helper(v)


def the_body_still_reads_the_parameter(v, limit=limit):
    """Only the DEFAULT escapes the function's scope.  Inside the body the
    parameter shadows the global, as it does in CPython."""
    return limit


class K:
    def method(self, limit=limit):
        """A class-body method's default is emitted inline, a third emit path
        with the same rule."""
        return limit

    def method_callable(self, v, helper=helper):
        return helper(v)


def class_body_method_defaults():
    """A class-body method's default is emitted INLINE -- a third emit path
    with the same rule."""
    return (K().method(), K().method_callable(5), K().method(42))


def nested_def_over_a_module_global():
    """THE COMPILE ERROR.  The default is hoisted into a definition-time block
    OUTSIDE the nested def, where ``limit'' is a module attribute rather than
    a temp -- emitting a bare identifier there failed to compile and took the
    whole module with it."""
    def inner(v, limit=limit):
        return limit
    return inner(0)


def nested_def_over_an_enclosing_local():
    """...and the walk must still find an ENCLOSING FUNCTION's local: it skips
    only the scope it climbed out of.  Widening the rule too far would break
    this."""
    limit = 'enclosing'

    def inner(v, limit=limit):
        return limit
    return inner(0)


def a_lambda_in_a_def_over_a_module_global():
    """The lambda half of the same emit, over a module global rather than an
    enclosing local -- the case lambda_defaults.py does not reach."""
    f = lambda v, limit=limit: limit
    return f(0)


def defaults_are_evaluated_at_definition_time():
    """CPython evaluates a default ONCE, when the def executes -- so rebinding
    the name afterwards does not change it."""
    saved = limit
    try:
        def g(x=limit):
            return x
        globals()['limit'] = 99
        return g()
    finally:
        globals()['limit'] = saved


def a_mutable_default_is_still_shared():
    """The default is evaluated once, so the SAME list is reused across calls
    -- the property the definition-time emit exists to preserve."""
    def g(acc=[]):
        acc.append(1)
        return len(acc)
    return [g(), g(), g()]


def an_ordinary_default_is_unaffected():
    """A default naming something the function does NOT bind takes the same
    path it always did."""
    def g(v, fn=helper):
        return fn(v)
    return g(3)
