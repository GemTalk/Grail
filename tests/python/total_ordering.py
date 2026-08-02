"""Fixture for functools.total_ordering and for a comparison dunder supplied
as a class ATTRIBUTE rather than a compiled def.

A module fixture rather than an eval: string because every case defines a
class, and eval-path class statements are a known Grail limitation.
"""

import functools


@functools.total_ordering
class FromLt:
    def __init__(self, value):
        self.value = value
    def __lt__(self, other):
        return self.value < other.value
    def __eq__(self, other):
        return self.value == other.value


@functools.total_ordering
class FromLe:
    def __init__(self, value):
        self.value = value
    def __le__(self, other):
        return self.value <= other.value
    def __eq__(self, other):
        return self.value == other.value


@functools.total_ordering
class FromGt:
    def __init__(self, value):
        self.value = value
    def __gt__(self, other):
        return self.value > other.value
    def __eq__(self, other):
        return self.value == other.value


@functools.total_ordering
class FromGe:
    def __init__(self, value):
        self.value = value
    def __ge__(self, other):
        return self.value >= other.value
    def __eq__(self, other):
        return self.value == other.value


def six_comparisons(cls):
    """All six operators, on every root.  CPython answers every one True."""
    return [cls(1) < cls(2), cls(2) > cls(1), cls(1) <= cls(2),
            cls(2) >= cls(1), cls(2) <= cls(2), cls(2) >= cls(2),
            not (cls(1) > cls(2)), not (cls(2) < cls(1)),
            not (cls(1) >= cls(2)), not (cls(2) <= cls(1))]


def all_roots():
    out = {}
    for cls in (FromLt, FromLe, FromGt, FromGe):
        out[cls.__name__] = six_comparisons(cls)
    return out


def no_operations_defined():
    """A class with no ordering operation at all is a ValueError, not a
    silent pass-through."""
    try:
        @functools.total_ordering
        class A:
            pass
    except ValueError:
        return 'ValueError'
    return 'no error'


def no_overwrite():
    """int supplies all four, so nothing is synthesised and the inherited
    operators keep working."""
    @functools.total_ordering
    class A(int):
        pass
    return [A(1) < A(2), A(2) > A(1), A(1) <= A(2),
            A(2) >= A(1), A(2) <= A(2), A(2) >= A(2)]


@functools.total_ordering
class PuntsLt:
    def __init__(self, value):
        self.value = value
    def __eq__(self, other):
        if isinstance(other, PuntsLt):
            return self.value == other.value
        return False
    def __lt__(self, other):
        if isinstance(other, PuntsLt):
            return self.value < other.value
        return NotImplemented


def notimplemented_propagates():
    """A root that punts makes every derived operator punt too -- explicit
    dunder calls must hand back the NotImplemented singleton itself."""
    return [PuntsLt(1).__le__(1) is NotImplemented,
            PuntsLt(1).__gt__(1) is NotImplemented,
            PuntsLt(1).__ge__(1) is NotImplemented]


def type_error_when_not_implemented():
    """...and as an OPERATOR the punt has to surface as TypeError, not as a
    bogus bool or a runaway reflection."""
    got = []
    for expr in ('lt', 'le', 'gt', 'ge'):
        try:
            if expr == 'lt':
                PuntsLt(1) < 1
            elif expr == 'le':
                PuntsLt(1) <= 1
            elif expr == 'gt':
                PuntsLt(1) > 1
            else:
                PuntsLt(1) >= 1
            got.append(expr + ':no-error')
        except TypeError:
            got.append(expr + ':TypeError')
    return got


def derived_name():
    """CPython sets opfunc.__name__ = opname before installing it."""
    return FromLt.__ge__.__name__


def derived_binds_self():
    """Read through an INSTANCE, a synthesised operator binds self like the
    plain function CPython installs -- so the explicit dunder call takes just
    the other operand."""
    return FromLt(1).__le__(FromLt(2))


class Meters:
    """A comparison dunder assigned in the class body, not compiled as a def.
    In Python a ``def'' IS a class-dict entry, so the two are the same thing;
    in Grail they land in different stores, and only the compiled one used to
    answer the operator in the FORWARD direction."""
    def __init__(self, value):
        self.value = value
    def _less(self, other):
        return self.value < (other.value if isinstance(other, Meters) else other)
    __lt__ = _less


def attr_dunder_forward():
    """``a < b'' where BOTH sides carry the attribute: reachable before the
    fix too, by reflecting onto the other operand."""
    return Meters(1) < Meters(2)


def attr_dunder_against_foreign():
    """``a < 5'' -- there is no PythonInstance on the right to reflect onto,
    so the forward attribute is the only way to answer it."""
    return Meters(1) < 5
