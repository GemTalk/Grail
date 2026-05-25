# Fixture for VarargsNamingTestCase.
#
# Grail's varargs codegen compiles
#   def f(*args, **kwargs): ...
# to a Smalltalk method
#   _f: positional kw: kwargs
# whose body block declares the user's vararg / kwarg names as
# temps so they're rebindable (Python params are; Smalltalk method
# params aren't).
#
# When the user happens to name their vararg ``positional'' or
# their kwarg ``kwargs'', the block temp shadows the method param
# and the binding line ``kwargs := kwargs ifNil: [...]'' reads
# the nil temp instead of the passed-in dict.  Jinja2's
# ``Template.render(self, *args, **kwargs):'' tripped this and
# every render() silently dropped its keyword arguments.
#
# Fix: rename the method params to internal sentinels
# (``___pos___'' / ``___kw___'') when collision detected.


def collides_kwargs(*args, **kwargs):
    """User's **kwarg name == 'kwargs' — the collision case.
    Returns a tuple (kwargs_dict_size, args_tuple_size, name_value)."""
    return (len(kwargs), len(args), kwargs.get('name', 'MISSING'))


def collides_positional(*positional, **kw):
    """User's *vararg name == 'positional' — the other collision case."""
    first = positional[0] if len(positional) > 0 else 'EMPTY'
    return (len(positional), len(kw), first)


def no_collision(*items, **options):
    """Neither name matches the method-param convention — sanity
    check that the non-collision path still works."""
    return (len(items), len(options), options.get('verbose', False))


# Drive each case at module level so the tests can read the results
# without needing kwargs-call dispatch in test code.

collides_kwargs_result = collides_kwargs(1, 2, name='World', extra=True)
collides_positional_result = collides_positional('first', 'second', verbose=True)
no_collision_result = no_collision('x', 'y', 'z', verbose=True, debug=False)
