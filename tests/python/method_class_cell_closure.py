"""Fixture: ``method.__closure__`` and the implicit ``__class__`` cell.

CPython's compiler gives a method an implicit closure over a single cell when
its body reads ``__class__`` -- by name, or through a zero-argument ``super()``,
which is the same thing spelled differently.  The cell is handed to the
metaclass as ``__classcell__`` and filled by ``type.__new__`` with the finished
class.  Grail already did all of that; what it did not do was let anything READ
the closure back, so ``Cls.f.__closure__`` raised AttributeError -- which is
test_super's test___classcell___expected_behaviour.

TWO THINGS MAKE THIS MORE THAN AN ACCESSOR.

FIRST, IT IS PER METHOD, NOT PER CLASS.  ``f`` and ``g`` below live in one class
body and disagree: ``f`` reads ``__class__`` and gets a one-tuple, ``g`` does not
and gets None.  Grail's existing record was a single class-wide flag (does ANY
method need a cell -- which is the right question for injecting __classcell__),
so answering from it would have given both methods the same wrong answer half
the time.  ``plain_is_none`` is that check, and it is the one a class-wide
implementation passes only by accident.

SECOND, ORDINARY CLASSES HAD NO CELL AT ALL.  The cell was created only when a
metaclass was watching -- there is no namespace to inject into otherwise -- and
that was invisible for as long as nothing read one back, because Grail resolves
``__class__`` LEXICALLY and never consults the cell to answer it.  CPython
creates the cell either way.  Every check here except the two metaclass ones
uses a plain class, so they fail against a metaclass-only implementation.

The identity checks are the point of the metaclass pair: the cell the metaclass
was handed must BE the cell in the method's closure, not an equal one, so the
cell has to be kept rather than reconstructed on demand.
"""

r = {}

# --- the metaclass half: __classcell__ and __closure__ are the same object ---

_snapshot = None


class Meta(type):
    def __new__(cls, name, bases, namespace):
        global _snapshot
        _snapshot = dict(namespace)
        return super().__new__(cls, name, bases, namespace)


class WithoutClassRef(metaclass=Meta):
    pass


r["no_ref_gets_no_classcell"] = "__classcell__" not in _snapshot


class WithClassRef(metaclass=Meta):
    def f(self):
        return __class__


_cell = _snapshot["__classcell__"]
r["ref_gets_a_classcell"] = _cell is not None
r["classcell_is_filled_with_the_class"] = _cell.cell_contents is WithClassRef
r["closure_holds_the_very_same_cell"] = WithClassRef.f.__closure__[0] is _cell
r["closure_is_a_one_tuple"] = len(WithClassRef.f.__closure__) == 1
# CPython does NOT leave __classcell__ behind as a class attribute.
try:
    WithClassRef.__classcell__
    r["classcell_is_not_an_attribute"] = "NOT RAISED"
except AttributeError:
    r["classcell_is_not_an_attribute"] = "AttributeError"


# --- everything below is a PLAIN class: no metaclass anywhere ---


class Base:
    def reads(self):
        return __class__

    def plain(self):
        return 1


class Sub(Base):
    pass


# Per method, in one class body.  A class-wide answer gets this wrong.
r["plain_method_closure_is_none"] = Base.plain.__closure__ is None
r["reading_method_has_a_closure"] = Base.reads.__closure__ is not None

# An inherited method closes over the cell of the class whose body it appeared
# in -- not the subclass it is reached through.
r["inherited_cell_is_the_defining_class"] = (
    Sub.reads.__closure__[0].cell_contents is Base)


class UsesSuper:
    def m(self):
        return super().__repr__()


# Zero-arg super() is the OTHER spelling of the same read, and in Grail it is a
# separate emit path that has to make the same record.
r["zero_arg_super_closes_over_the_cell"] = (
    UsesSuper.m.__closure__[0].cell_contents is UsesSuper)


class WithStatic:
    @staticmethod
    def s():
        return __class__

    @classmethod
    def c(cls):
        return __class__


# Reached off the class these are a different handle kind in Grail (BoundMethod
# rather than UnboundMethod), which is why they are checked separately: the
# plain-method read answered while these still raised.
r["staticmethod_has_the_closure"] = (
    WithStatic.s.__closure__[0].cell_contents is WithStatic)
r["classmethod_has_the_closure"] = (
    WithStatic.c.__closure__[0].cell_contents is WithStatic)


class Nested:
    def outer(self):
        def inner():
            return __class__
        return inner()


# The read is in a NESTED function, so the cell belongs to ``outer'' -- the
# class-body-level def is what ``__closure__'' is asked about.
r["nested_read_gives_the_method_a_closure"] = Nested.outer.__closure__ is not None
r["nested_cell_is_the_class"] = Nested.outer.__closure__[0].cell_contents is Nested
r["nested_read_still_resolves"] = Nested().outer() is Nested


EXPECTED = {
    "no_ref_gets_no_classcell": True,
    "ref_gets_a_classcell": True,
    "classcell_is_filled_with_the_class": True,
    "closure_holds_the_very_same_cell": True,
    "closure_is_a_one_tuple": True,
    "classcell_is_not_an_attribute": "AttributeError",
    "plain_method_closure_is_none": True,
    "reading_method_has_a_closure": True,
    "inherited_cell_is_the_defining_class": True,
    "zero_arg_super_closes_over_the_cell": True,
    "staticmethod_has_the_closure": True,
    "classmethod_has_the_closure": True,
    "nested_read_gives_the_method_a_closure": True,
    "nested_cell_is_the_class": True,
    "nested_read_still_resolves": True,
}


if __name__ == "__main__":
    for key, expected in EXPECTED.items():
        actual = r[key]
        print("%-4s %s -> %r" % ("OK" if actual == expected else "FAIL",
                                 key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print("%-4s %s is not in EXPECTED" % ("FAIL", extra))
