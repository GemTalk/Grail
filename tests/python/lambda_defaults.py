"""Lambda parameter binding — defaults, keyword matching, keyword-only args.

Until this round a lambda bound every named parameter with a bare
``positional at: i``, so any argument the caller did not pass POSITIONALLY
indexed past the end of the array and raised a Smalltalk OffsetError (error
2003) — uncatchable from Python and fatal to the whole module load.  Both
``(lambda x=1: x)()`` and ``(lambda x: x)(x=5)`` hit it, which made
``lambda n=i: ...`` — the standard idiom for capturing a loop variable by
value — unusable.

The interesting cases are the three semantics a default carries in Python, all
of which fall out of evaluating it ONCE at definition time in the ENCLOSING
scope: loop capture, single evaluation, and shared mutable defaults.
"""

RESULTS = {}


def _catch(fn, *args, **kw):
    """Run fn, reporting an exception as 'ExcName: message'."""
    try:
        return fn(*args, **kw)
    except BaseException as exc:                     # noqa: BLE001
        return '%s: %s' % (type(exc).__name__, exc)


# ------------------------------------------------- 1. shapes that used to crash

def positional_defaults():
    return [
        _catch(lambda x=1: x),                       # default used
        _catch(lambda x=1: x, 9),                    # default overridden
        _catch(lambda a, b=2: (a, b), 1),
        _catch(lambda a, b=2: (a, b), 1, 7),
        _catch(lambda a, b=2, c=3: (a, b, c), 1, 7),
    ] == [1, 9, (1, 2), (1, 7), (1, 7, 3)]


def keyword_matching():
    """A named parameter is bindable BY NAME, with or without a default —
    ``(lambda x: x)(x=5)`` crashed just as hard as a missing default."""
    return [
        _catch(lambda x: x, x=5),
        _catch(lambda a, b=2: (a, b), 1, b=7),
        _catch(lambda a, b=2: (a, b), a=1, b=7),
        _catch(lambda a, b=2: (a, b), b=7, a=1),     # order is irrelevant
    ] == [5, (1, 7), (1, 7), (1, 7)]


def missing_argument_is_a_catchable_typeerror():
    """The point of the fix: the failure is a Python TypeError, not a Smalltalk
    OffsetError that no ``except`` can see."""
    return [
        _catch(lambda a: a),
        _catch(lambda a, b=2: (a, b)),
        _catch(lambda *, k: k),
    ] == ['TypeError: <lambda>() missing required argument: a',
          'TypeError: <lambda>() missing required argument: a',
          'TypeError: <lambda>() missing keyword-only argument: k']


# --------------------------------------------------------- 2. keyword-only args

def keyword_only_args():
    return [
        _catch(lambda *, k=3: k),
        _catch(lambda *, k=3: k, k=8),
        _catch(lambda *a, k=1: (a, k), 1, 2, k=9),
        _catch(lambda x, *, k=1: (x, k), 5),
    ] == [3, 8, ((1, 2), 9), (5, 1)]


# ------------------------------------------- 3. *args is a tuple, **kwargs is
# only the UNMATCHED keywords

def star_args_is_a_tuple():
    """Was an Array, so isinstance(a, tuple) was False and ``a + (3,)`` failed;
    splatting it back out worked, which is why the werkzeug proxy lambdas never
    noticed."""
    f = lambda *a: a
    got = f(1, 2)
    return (got == (1, 2) and isinstance(got, tuple)
            and got + (3,) == (1, 2, 3) and f() == ())


def kwargs_excludes_bound_parameters():
    """Python's **kwargs collects only the keywords that matched no named
    parameter.  With keyword matching now enabled, a named parameter bound from
    the kwargs dict must be REMOVED from it — and the caller's dict must not be
    mutated in the process."""
    return [
        _catch(lambda x, **kw: (x, kw), x=1, y=2),
        _catch(lambda **kw: kw, y=2),
        _catch(lambda x=0, **kw: (x, kw), y=2),
        _catch(lambda *, k=1, **kw: (k, kw), k=5, z=6),
    ] == [(1, {'y': 2}), {'y': 2}, (0, {'y': 2}), (5, {'z': 6})]


# ------------------------------- 4. the three def-time-evaluation consequences

def loop_variable_capture():
    """THE idiom the crash made unusable: ``lambda n=i:`` freezes i as it is
    now.  Without the default every closure would answer 2."""
    fns = []
    for i in range(3):
        fns.append(lambda n=i: n)
    return [f() for f in fns] == [0, 1, 2]


def default_is_evaluated_once_at_definition():
    calls = []

    def side():
        calls.append(1)
        return len(calls)

    f = lambda v=side(): v
    return [f(), f(), len(calls)] == [1, 1, 1]


def mutable_default_is_shared_across_calls():
    f = lambda acc=[]: (acc.append(1), len(acc))[1]
    return [f(), f(), f()] == [1, 2, 3]


def default_reads_the_enclosing_scope_not_the_parameter():
    """``X=X'' — the default must see the ENCLOSING binding even though the
    parameter shadows that name inside the body.  This resolved as a read of
    the lambda's own parameter and was emitted into the definition-time outer
    block where no such temp exists: CompileError 1001, 'undefined symbol'.
    It is the lambda counterpart of jinja2's
    ``def root(context, missing=missing)``."""
    missing = 'enclosing'
    f = lambda missing=missing: missing
    return f() == 'enclosing' and f('passed') == 'passed'


def nested_definers_may_reuse_a_parameter_name():
    """The def-time default temps are named per SOURCE POSITION, so an inner
    lambda defaulting the same parameter name as its enclosing def (or an
    enclosing lambda) does not redeclare the outer temp — which would be a
    Smalltalk compile error, not shadowing."""
    def outer(a=1):
        return lambda a=2: a

    nested_lambda = lambda a=1: (lambda a=2: a)()
    return [_catch(outer()), _catch(nested_lambda)] == [2, 2]


def a_lambda_default_still_sees_enclosing_function_locals():
    """The parameter-list hop skips only the lambda it climbed out of; an
    enclosing def's locals are still in scope for the default expression."""
    def outer():
        x = 41
        return lambda x=x + 1: x
    return _catch(outer()) == 42


# ------------------------------------------------ 5. shapes that already worked

def reserved_name_parameters_still_work():
    """``self''/``super'' are Smalltalk pseudo-variables, transported as
    ``_<name>''.  The keyword LOOKUP must use the Python name, so ``self=''
    still binds."""
    return [
        _catch(lambda self=7: self),
        _catch(lambda self=7: self, 8),
        _catch(lambda self: self, self=9),
    ] == [7, 8, 9]


def no_parameters_and_pure_star_forms():
    return [
        _catch(lambda: 42),
        _catch(lambda *a, **kw: (a, kw), 1, k=2),
        _catch(lambda a, *rest: (a, rest), 1, 2, 3),
    ] == [42, ((1,), {'k': 2}), (1, (2, 3))]


RESULTS = {
    'positional_defaults': positional_defaults(),
    'keyword_matching': keyword_matching(),
    'missing_argument': missing_argument_is_a_catchable_typeerror(),
    'keyword_only': keyword_only_args(),
    'star_args_tuple': star_args_is_a_tuple(),
    'kwargs_excludes_bound': kwargs_excludes_bound_parameters(),
    'loop_capture': loop_variable_capture(),
    'evaluated_once': default_is_evaluated_once_at_definition(),
    'mutable_shared': mutable_default_is_shared_across_calls(),
    'enclosing_scope': default_reads_the_enclosing_scope_not_the_parameter(),
    'nested_same_name': nested_definers_may_reuse_a_parameter_name(),
    'enclosing_function_local': a_lambda_default_still_sees_enclosing_function_locals(),
    'reserved_names': reserved_name_parameters_still_work(),
    'no_params_and_stars': no_parameters_and_pure_star_forms(),
}
