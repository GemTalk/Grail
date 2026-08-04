"""PEP 649 / PEP 749 annotations: __annotate__ and the three Formats.

Annotations are not stored, they are COMPUTED.  Every annotated def carries an
``__annotate__`` function built at def-time; reading ``__annotations__`` calls
it with ``Format.VALUE``.  Grail previously stored PEP 563 source strings
instead, because evaluating at def-time raised NameError on the forward
references that 55+ werkzeug/flask modules use -- deferral gets both the real
values and the safe module load.
"""

import functools
from annotationlib import Format, get_annotations


def annotations_are_values():
    """CPython 3.14 answers the evaluated objects, not their source text."""

    def f(a: int, *rest: float, **kw: bool) -> str:
        return "x"

    fa = f.__annotations__
    return (fa["a"] is int, fa["rest"] is float, fa["kw"] is bool,
            fa["return"] == str, "self" not in fa)


def string_format_is_still_available():
    """Format.STRING answers the source text and evaluates NOTHING -- which is
    what makes it work on an annotation no other format could render."""

    def f(a: int) -> nowhere_at_all:
        return a

    got = get_annotations(f, format=Format.STRING)
    return (got["a"], got["return"])


def annotate_is_identity_stable():
    """One function object per def, not one per read: functools.update_wrapper
    copies __annotate__ and check_wrapper asserts the wrapper shares it."""

    def f(a: int): pass

    return (f.__annotate__ is f.__annotate__, f.__annotate__ is not None)


def unannotated_has_no_annotate():
    """CPython: None, and an empty (but present) __annotations__ mapping."""

    def f(a): pass

    return (f.__annotate__ is None, f.__annotations__ == {})


def value_format_raises_for_a_name_bound_nowhere():
    def f(a: int) -> definitely_not_defined: ...

    try:
        f.__annotations__
    except NameError:
        return "NameError"
    return "NO RAISE"


def forwardref_resolves_what_it_can():
    """Per-KEY granularity: ``a`` resolves to int even though the return
    annotation cannot be resolved at all.  A single dict-building call that
    raised partway could not report both."""

    def f(a: int) -> still_not_defined: ...

    got = get_annotations(f, format=Format.FORWARDREF)
    return (got["a"] is int,
            got["return"].__forward_arg__,
            repr(got["return"]))


def a_name_bound_after_the_def_still_resolves():
    """The whole point of deferring.  The read raises while the name is
    unbound and succeeds once it is -- the annotation expression runs at READ
    time, in the scope that enclosed the def."""

    def f(x: bound_later): ...

    before = "NO RAISE"
    try:
        f.__annotations__
    except NameError:
        before = "NameError"

    bound_later = int
    return (before, f.__annotations__["x"] is int)


def a_string_literal_annotation_stays_a_string():
    """CPython evaluates the expression; for a literal that IS the string.
    Only annotationlib resolves it further."""

    def f(a: "int", b: 'some.dotted.name'): ...

    got = f.__annotations__
    return (got["a"], got["b"])


def update_wrapper_shares_the_annotate_function():
    """WRAPPER_ASSIGNMENTS names __annotate__, so the wrapper gets the
    wrapped function's deferred computation rather than a forced dict."""

    def inner(x: int): pass

    def wrapper(*args): pass

    functools.update_wrapper(wrapper, inner)
    return (wrapper.__annotate__ is inner.__annotate__,
            wrapper.__annotations__["x"] is int)


def update_wrapper_defers_an_unresolved_annotation():
    """The wrapper inherits the UNRESOLVED state, and both resolve together
    once the name is bound -- which copying a computed dict could not do."""

    def with_forward_ref(x: resolved_afterwards): pass

    def wrapper(*args): pass

    functools.update_wrapper(wrapper, with_forward_ref)
    shared = wrapper.__annotate__ is with_forward_ref.__annotate__

    raised = "NO RAISE"
    try:
        wrapper.__annotations__
    except NameError:
        raised = "NameError"

    resolved_afterwards = str
    return (shared, raised, wrapper.__annotations__["x"] == str)


def a_parameter_does_not_shadow_its_own_annotation():
    """Python evaluates parameter annotations in the ENCLOSING scope, so a
    parameter never shadows a name used in the signature.

    werkzeug's ``cache_control_property(key, empty, type, ...)`` annotates its
    own ``type`` parameter with the BUILTIN ``type``.  Emitting that annotation
    as a read of the parameter put a temp reference in the enclosing scope
    where no such temp exists: CompileError 1001, ``undefined symbol type'',
    which broke the whole module load rather than any one annotation.
    """

    def f(type: type, int: int = 3) -> type:
        return type

    got = f.__annotations__
    return (got["type"] is not None, got["int"] is not None,
            f(1, 2) == 1)


def module_level_and_method_annotations_are_values():
    """The three storage paths -- nested def, module-level def, class method --
    all answer values now."""

    inst = _Holder()
    return (mod_level.__annotations__["a"] is int,
            mod_level.__annotations__["return"] == str,
            inst.meth.__annotations__["arg"] is int,
            "self" not in inst.meth.__annotations__)


def mod_level(a: int) -> str:
    return "x"


class _Holder:
    def meth(self, arg: int) -> bool:
        return True
