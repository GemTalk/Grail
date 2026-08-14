# Two definition-time errors CPython raises from _EnumDict/EnumType.__new__ that
# Grail accepted silently.
#
# 1. ``def _generate_next_value_'' AFTER the members that need it.
#
#    CPython resolves each auto() AS THE CLASS BODY EXECUTES, so a generator
#    defined below the members would have arrived too late -- _EnumDict raises
#    rather than let the values disagree with the source.  Grail resolves in a
#    single later pass, so it happily applied the generator to every member: the
#    class read as working code that quietly disagreed with CPython on all three
#    values.
#
#    Only a member that ACTUALLY needed generating counts.  An auto() built
#    OUTSIDE the body with its value already set never calls the generator, so
#    it does not constrain where the generator may appear.
#
# 2. a user __new__ that never sets _value_ and whose member_type cannot be
#    constructed from the member's args.  The member ends up with no value at
#    all, and CPython reports ``_value_ not set in __new__''.  Grail's coercion
#    is best-effort and kept the raw class-body tuple, papering over it.

from enum import Enum, auto

r = {}


def _err(fn):
    try:
        fn()
        return 'no error'
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


# --- 1. _generate_next_value_ ordering ----------------------------------------

def _gnv_after_members():
    class Color(Enum):
        red = auto()
        green = auto()
        blue = auto()

        def _generate_next_value_(name, start, count, last):
            return name


r['gnv_after'] = _err(_gnv_after_members)


# Defined FIRST: the ordinary, legal spelling.
class Early(Enum):
    def _generate_next_value_(name, start, count, last):
        return name
    red = auto()
    green = auto()


r['gnv_first'] = ','.join('%s=%s' % (m.name, m.value) for m in Early)


# A preset auto() does not call the generator, so it does not constrain it
# (test_auto_order_wierd).
weird_auto = auto()
weird_auto.value = 'pathological case'


class Wierd(Enum):
    red = weird_auto

    def _generate_next_value_(name, start, count, last):
        return name
    blue = auto()


r['gnv_preset'] = ','.join('%s=%s' % (m.name, m.value) for m in Wierd)


# No generator at all: plain auto() numbering is untouched.
class Plain(Enum):
    a = auto()
    b = auto()


r['no_gnv'] = ','.join('%s=%d' % (m.name, m.value) for m in Plain)


# --- 2. __new__ that leaves _value_ unset -------------------------------------

def _no_value_set():
    class Combined(str, Enum):
        def __new__(cls, value, sequence):
            enum = str.__new__(cls, value)
            enum.sequence = sequence
            return enum
        key_type = 'An$(1,2)', 0
        company_id = 'An$(3,2)', 1


r['no_value'] = _err(_no_value_set)


# A __new__ that DOES set _value_ is fine.
class Fine(str, Enum):
    def __new__(cls, value, sequence):
        obj = str.__new__(cls, value)
        obj._value_ = value
        obj.sequence = sequence
        return obj
    a = 'ay', 0
    b = 'bee', 1


r['value_set'] = '%s/%d/%s' % (Fine.a.value, Fine.b.sequence, Fine.a)


# And a mixin whose member_type CAN take the args still builds, rather than
# being turned into an error by the stricter path.
class Constructible(str, Enum):
    june = 1
    july = 2


r['constructible'] = ','.join('%s=%r' % (m.name, m.value) for m in Constructible)

# Was a known gap, now closed: CPython builds ``three = b'3', 'ascii''' as
# str(b'3', 'ascii') == '3'.  Grail's str handle is a one-argument BoundMethod,
# so the coercion could not make the call and -- the path being best-effort --
# the raw tuple survived as the member's value.  A member value whose first
# element is BYTES now routes through str's varargs entry.  See
# str_decode_args.py, which pins the whole shape including the argument
# validation.


class Encoded(str, Enum):
    three = b'3', 'ascii'


r['encoded_gap'] = repr(Encoded.three.value)
