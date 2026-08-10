# ``Cls.__new__`` read off a class must answer the allocator FUNCTION, not run
# it.  Grail's class-attribute read looks for a synthesised getter+setter pair,
# and the metaclass chain bottoms out at ``object class'', which defines the
# allocator in both arities -- unary ``__new__'' and 1-arg ``__new__: cls''.
# Those are two arities of one method, not a getter and a setter, so every
# ``Cls.__new__'' on a Python user class CONSTRUCTED an instance instead
# (``Enum.__new__'' was ``<Enum.nil: nil>''), and the standard
# allocate-without-__init__ idiom died with a Smalltalk doesNotUnderstand.

from enum import Enum

r = {}


class P:
    def __init__(self):
        self.x = 1
        raise RuntimeError('__init__ must not run')


# Reading it does not construct.
r['plain_new_type'] = type(P.__new__).__name__ != 'P'

# The idiom copy / pickle / __reduce__ implementations rely on.
obj = P.__new__(P)
r['alloc_type'] = type(obj).__name__
r['alloc_skipped_init'] = not hasattr(obj, 'x')


class Q:
    def __new__(cls, *a):
        inst = object.__new__(cls)
        inst.made = True
        return inst


q = Q.__new__(Q)
r['user_new_ran'] = getattr(q, 'made', False)


# CPython EnumType.__new__ replaces the class's __new__ with Enum.__new__ --
# whatever built the members is kept as _new_member_ -- so this holds for a
# plain enum and for a data-mixed one whose mix-in defines __new__.
class PlainEnum(Enum):
    a = 1


class NamedInt(int):
    def __new__(cls, *args):
        name, *rest = args
        self = int.__new__(cls, *rest)
        self._intname = name
        return self


class MixedEnum(NamedInt, Enum):
    x = ('the-x', 1)


r['plain_enum_new_is_enum_new'] = PlainEnum.__new__ is Enum.__new__
r['mixed_enum_new_is_enum_new'] = MixedEnum.__new__ is Enum.__new__
