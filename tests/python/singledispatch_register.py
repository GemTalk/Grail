"""functools.singledispatch: wrapper metadata and annotation-form register().

Grail keeps annotations as PEP 563 SOURCE STRINGS, which is what makes most of
this both possible and delicate: the register() decorator has to resolve a
string to a class, decide when it cannot, and distinguish "never a class" from
"not resolvable here" from "valid but unsupported".
"""

import functools
import typing


def wrapper_carries_function_metadata():
    """CPython's singledispatch ends with update_wrapper(wrapper, func).

    Without it g.__name__ / g.__doc__ raised AttributeError on the wrapper.
    """
    @functools.singledispatch
    def g(obj):
        "Simple test"
        return "Test"
    return g.__name__ == 'g' and g.__doc__ == 'Simple test'


def arity_error_names_the_function():
    """``f requires at least 1 positional argument`` -- the FUNCTION's name,
    not a generic label.  Depends on the update_wrapper copy above."""
    @functools.singledispatch
    def f(*args, **kwargs):
        pass
    for call in (lambda: f(), lambda: f(a=1)):
        try:
            call()
            return 'no raise'
        except TypeError as e:
            if 'f requires at least 1 positional argument' not in str(e):
                return 'wrong message: %s' % e
    return 'ok'


def first_parameter_annotation_wins():
    """THE bug: the inference kept the LAST annotated parameter, not the first.

    Here arg2's annotation is unresolvable, so picking it silently registered a
    junk key and the registration never matched -- f("") fell through to the
    default.  Annotation dicts are insertion-ordered, so the first non-'return'
    key is genuinely the first parameter.
    """
    @functools.singledispatch
    def f(arg, arg2=None):
        return "default"

    @f.register
    def _(arg: str, arg2: undefined = None):   # noqa: F821 - deliberately undefined
        return "forward reference"

    return f(1) == "default" and f("") == "forward reference"


def unresolved_forward_reference_raises():
    """A bare name that resolves to nothing is an error, not a silent
    registration under a string key."""
    @functools.singledispatch
    def f(arg):
        return "default"

    try:
        @f.register
        def _(arg: undefined):   # noqa: F821 - deliberately undefined
            return "forward reference"
    except TypeError as e:
        return 'ok' if 'is an unresolved forward reference' in str(e) else 'wrong: %s' % e
    return 'no raise'


def subscripted_annotation_raises():
    """A subscripted generic is never a class, so register() must reject it.

    Detectable ONLY because annotations are source strings: the runtime value
    would not help, since Grail's __class_getitem__ is an identity stub and
    ``list[int] is list``.
    """
    @functools.singledispatch
    def f(arg):
        return "default"

    results = []

    def check(fn, label):
        try:
            f.register(fn)
            results.append('no raise for %s' % label)
        except TypeError as e:
            if "Invalid annotation for 'arg'" not in str(e):
                results.append('wrong message for %s: %s' % (label, e))

    # Written out rather than exec'd: annotations are never evaluated, so even
    # ``list[int] | str`` is safe here (Grail records the source text), and an
    # exec'd def does not land in the namespace dict anyway.
    def a(arg: list[int]):
        return 'generic'

    def b(arg: typing.List[float]):
        return 'generic'

    def c(arg: list[int] | str):
        return 'generic'

    def d(arg: typing.List[float] | bytes):
        return 'generic'

    check(a, 'list[int]')
    check(b, 'typing.List[float]')
    check(c, 'list[int] | str')
    check(d, 'typing.List[float] | bytes')
    return results or 'ok'


def union_of_plain_classes_does_not_raise():
    """A union of plain classes is VALID CPython that Grail cannot dispatch on
    yet, so it must not raise.

    This is the discrimination that makes subscripted_annotation_raises safe: a
    bare "contains a bracket" test would reject unions too, because
    ``typing.Union[int, str]`` has brackets as well.  Rejecting them would turn
    working user code into a hard TypeError; falling through to the default is
    the softer, correct-for-now failure.
    """
    @functools.singledispatch
    def f(arg):
        return "default"

    @f.register
    def _(arg: typing.Union[int, str]):
        return "union"

    # Not dispatched (the gap), but crucially it did not raise.
    return f(1) == "default"


def plain_class_annotation_still_registers():
    """Guard: the ordinary annotation form must keep working."""
    @functools.singledispatch
    def f(arg):
        return "default"

    @f.register
    def _(arg: int):
        return "int"

    @f.register
    def _(arg: str):
        return "str"

    return f(1) == "int" and f("x") == "str" and f(1.5) == "default"
