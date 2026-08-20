"""``func.__type_params__'' (PEP 695), and ``typing.TypeVar'' as a real class.

Driven by PythonTests>>FunctionTypeParamsTestCase.  Each check answers True when
Grail agrees with CPython, so a failure names the exact rule.

THE ENABLING FIX WAS NOT IN __type_params__ AT ALL.  Grail already stamped the
type-parameter NAMES at the def site and minted placeholders lazily, so
``generic.__type_params__'' answered ``(T,)'' with the right name.  What failed
was the very first thing a caller does with it:

    T, = generic.__type_params__
    isinstance(T, typing.TypeVar)      # TypeError: arg 2 must be a type

because ``typing.TypeVar'' was a module-level FUNCTION returning a
_TypeVarInstance.  isinstance against a function raises rather than answering
False, so this was not a wrong answer but an unusable one.

TypeVar is now a CLASS, and a SUBCLASS of _TypeVarInstance rather than a rename,
so ParamSpec and TypeVarTuple keep answering plain _TypeVarInstance and stay
outside it -- which is what CPython does too (``isinstance(ParamSpec('P'),
TypeVar)'' is False there).  Folding them together would have traded one wrong
answer for another.

WHAT THE CLASS CHANGE BROKE, AND SILENTLY.  Grail compiles a module-level ``def
name'' into a real Smalltalk selector, so ``mod name: x'' finds a method; a
module-level ``class Name'' compiles to no selector, so the identical spelling is
a MessageNotUnderstood.  ExecBlock >> ___pyTypeVarNamed___: makes exactly that
send -- ``typing TypeVar: aName'' -- and guards it with a fallback to the bare
NAME STRING for the case where typing is not loaded.  So turning TypeVar into a
class made every PEP 695 type parameter quietly become its own name: measured as
``placeholder class = Unicode7'' where the baseline gave _TypeVarInstance.  That
send lives in ExecBlock.gs, which is filed into the SHARED base on 3.7 and so
cannot be edited per-user; the fix went into module >> doesNotUnderstand:, whose
existing attribute-call fallback covered only the two-argument ``_name:kw:''
varargs shape and now covers the plain ``name:'' shape as well.

The write and delete rules were separately absent: an assignment of any type was
ACCEPTED (``f.__type_params__ = 42'' stored the integer), and ``del'' reported
``AttributeError: __type_params__'' for an attribute every function has.  CPython
routes both through the setter, so both answer the same TypeError -- and its text
is ``must be set to a tuple'', NOT the ``must be set to a tuple object'' that
__defaults__ uses one branch away.

NOT COVERED HERE, and deliberately: a MODULE-LEVEL generic def.  Those compile to
real Smalltalk methods whose metadata lives in a PyCode method table, and the
``___pyTypeParams___'' stamp is emitted only on the nested-def cascade, so a
module-level ``def f[U]()'' answers AttributeError rather than ``(U,)''.  A check
for it was written, RUN, and then removed rather than left red: an unimplemented
gap is not a conformance regression, so it belongs in docs/Stdlib_Gaps.md -- where
the stale "__type_params__ is always ()" bullet has been corrected to say exactly
what remains -- instead of sitting as a permanently-failing fixture check.
test_funcattrs' test___type_params__ nests its subjects and so does not need it.
"""

import typing


def outer():
    """Nested on purpose: test_funcattrs' test___type_params__ nests its
    subjects, so they compile to BLOCKS rather than methods, and that is the
    path this pins.  A module-level generic def is a different code path, and
    an unimplemented one -- see the module docstring."""
    def generic[T](): pass
    def not_generic(): pass
    lambda_ = lambda: ...
    return generic, not_generic, lambda_


_generic, _not_generic, _lambda = outer()



def a_generic_def_reports_its_type_params():
    tp = _generic.__type_params__
    return isinstance(tp, tuple) and len(tp) == 1


def a_type_param_is_a_typevar_instance():
    """THE CHECK THIS WORK EXISTS FOR.  Before it, isinstance raised TypeError
    because typing.TypeVar was a function, not a class."""
    T, = _generic.__type_params__
    return isinstance(T, typing.TypeVar)


def a_type_param_carries_its_name():
    T, = _generic.__type_params__
    return T.__name__ == 'T'


def typevar_is_a_class():
    """Stated directly as well as through isinstance: the isinstance check above
    would also pass if TypeVar were some other class that T happened to be an
    instance of, and this says which property actually changed."""
    return isinstance(typing.TypeVar, type)


def typevar_still_accepts_its_old_signature():
    """The function it replaced took constraints and keyword-only options, and
    call sites pass them.  A class whose __init__ dropped them would fail here
    rather than silently ignore them.

    Two calls rather than one: CPython refuses constraints and ``bound''
    TOGETHER (``Constraints cannot be combined with bound=...''), which the
    first draft of this check got wrong and running it under CPython caught."""
    constrained = typing.TypeVar('T', int, str)
    bounded = typing.TypeVar('T', bound=object, covariant=True)
    return (constrained.__name__ == 'T' and bounded.__name__ == 'T'
            and isinstance(constrained, typing.TypeVar)
            and isinstance(bounded, typing.TypeVar))


def a_paramspec_is_not_a_typevar():
    """The reason TypeVar SUBCLASSES _TypeVarInstance instead of renaming it.
    CPython agrees: a ParamSpec is not a TypeVar."""
    return not isinstance(typing.ParamSpec('P'), typing.TypeVar)


def a_typevartuple_is_not_a_typevar():
    return not isinstance(typing.TypeVarTuple('Ts'), typing.TypeVar)


def a_plain_def_has_no_type_params():
    return _not_generic.__type_params__ == ()


def a_lambda_has_no_type_params():
    return _lambda.__type_params__ == ()


def _refuses(fn):
    """The message is compared, not just the class: CPython words this one
    without the trailing ``object'' that __defaults__ uses, and copying the
    neighbour's wording is the natural mistake."""
    try:
        fn()
    except TypeError as e:
        want = '__type_params__ must be set to a tuple'
        return True if str(e) == want else 'TypeError said %r, want %r' % (str(e), want)
    except Exception as e:
        return 'raised %s: %s' % (type(e).__name__, e)
    return 'was accepted'


def assigning_a_non_tuple_is_refused():
    def go():
        _not_generic.__type_params__ = 42
    return _refuses(go)


def deleting_type_params_is_refused():
    """NOT like __defaults__, whose delete is legal and clears it to None.
    CPython has no clearing path here, so the delete fails the tuple check."""
    def go():
        del _not_generic.__type_params__
    return _refuses(go)


def assigning_a_non_tuple_to_a_lambda_is_refused():
    """A lambda reaches the guard by the same side table but is a different
    object, so the two can regress apart."""
    def go():
        _lambda.__type_params__ = 42
    return _refuses(go)


def assigning_a_tuple_is_allowed_and_reads_back():
    T, = _generic.__type_params__
    _not_generic.__type_params__ = (T,)
    try:
        return _not_generic.__type_params__ == (T,)
    finally:
        _not_generic.__type_params__ = ()


if __name__ == '__main__':
    checks = [
        a_generic_def_reports_its_type_params,
        a_type_param_is_a_typevar_instance,
        a_type_param_carries_its_name,
        typevar_is_a_class,
        typevar_still_accepts_its_old_signature,
        a_paramspec_is_not_a_typevar,
        a_typevartuple_is_not_a_typevar,
        a_plain_def_has_no_type_params,
        a_lambda_has_no_type_params,
        assigning_a_non_tuple_is_refused,
        deleting_type_params_is_refused,
        assigning_a_non_tuple_to_a_lambda_is_refused,
        assigning_a_tuple_is_allowed_and_reads_back,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
