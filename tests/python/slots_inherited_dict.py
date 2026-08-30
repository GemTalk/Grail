# Regression fixture: __slots__ only removes the instance __dict__ when the
# WHOLE mro declares it.
#
# CPython drops the per-instance __dict__ only if every class in the mro
# except object declares __slots__.  A slotted class with a PLAIN base
# therefore still has one, and an attribute the base assigns keeps working.
# Grail decided strictness from the class's OWN declaration alone, so such a
# class could not even be constructed:
#
#     class Base:                       # no __slots__
#         def __init__(self): self.b = 2
#     class Sub(Base):
#         __slots__ = ('a',)
#     Sub()        # AttributeError: 'Sub' object has no attribute 'b'
#
# Pickling is the second half: __slots__ values live in NAMED instance
# variables, so they were absent from __getstate__ entirely and a slotted
# instance came back from a round trip with every slot unset.

import pickle

RESULTS = {}


class Base:
    def __init__(self):
        self.a = 1
        self.b = 2


class Sub(Base):
    __slots__ = ('a', 'spam')


_s = Sub()
RESULTS['slot_attr_reads'] = (_s.a == 1)
RESULTS['non_slot_attr_reads'] = (_s.b == 2)
RESULTS['has_dict'] = hasattr(_s, '__dict__')
RESULTS['unset_slot_absent'] = (not hasattr(_s, 'spam'))


def _assign_new():
    s = Sub()
    s.brand_new = 9
    return s.brand_new


RESULTS['can_assign_new_attr'] = (_assign_new() == 9)

# An all-slots chain must STILL be strict.
class SBase:
    __slots__ = ('x',)
    def __init__(self):
        self.x = 1


class SSub(SBase):
    __slots__ = ('y',)


def _strict_rejects():
    try:
        SSub().nope = 1
        return False
    except AttributeError:
        return True


RESULTS['all_slots_chain_still_strict'] = _strict_rejects()
RESULTS['all_slots_chain_has_no_dict'] = (not hasattr(SSub(), '__dict__'))
RESULTS['all_slots_chain_slot_works'] = (SBase().x == 1)

# The datetimetester shape: private names mangled by the BASE, with the
# base's third attribute deliberately omitted from __slots__.
class FO:
    def __init__(self, offset, name, dstoffset=42):
        self.__offset = offset
        self.__name = name
        self.__dstoffset = dstoffset
    def utcoffset(self):
        return self.__offset
    def tzname(self):
        return self.__name
    def dst(self):
        return self.__dstoffset


class FOSlots(FO):
    __slots__ = '_FO__offset', '_FO__name', 'spam'


_f = FOSlots(-300, 'cookie')
RESULTS['mangled_slot_reads'] = (_f.utcoffset() == -300)
RESULTS['mangled_slot_name_reads'] = (_f.tzname() == 'cookie')
RESULTS['mangled_non_slot_reads'] = (_f.dst() == 42)

# __getstate__ must carry BOTH halves, as CPython's (dict, slots) 2-tuple.
_state = _f.__getstate__()
RESULTS['getstate_is_pair'] = (isinstance(_state, tuple) and len(_state) == 2)
RESULTS['getstate_dict_half'] = (_state[0] == {'_FO__dstoffset': 42})
RESULTS['getstate_slots_half'] = (_state[1] == {'_FO__offset': -300, '_FO__name': 'cookie'})

# ...so a slotted instance survives a pickle round trip with slots intact.
for _p in (2, 5):
    _d = pickle.loads(pickle.dumps(_f, _p))
    RESULTS['roundtrip_slot_proto%d' % _p] = (_d.utcoffset() == -300)
    RESULTS['roundtrip_name_proto%d' % _p] = (_d.tzname() == 'cookie')
    RESULTS['roundtrip_nonslot_proto%d' % _p] = (_d.dst() == 42)
    RESULTS['roundtrip_no_spam_proto%d' % _p] = (not hasattr(_d, 'spam'))

# A class with NO slots anywhere keeps a plain-dict state (not a 2-tuple).
RESULTS['plain_getstate_not_pair'] = (not isinstance(Base().__getstate__(), tuple))

# ---------------------------------------------------------------------------
# The MIRROR rule: strictness is decided PER CLASS, never inherited.
#
# CPython gives a class a __dict__ unless the class ITSELF declares
# __slots__.  A slotted base's slot DESCRIPTORS are inherited; its "no
# __dict__, reject every other name" property is not.  Grail emitted its
# strictness marker once, on the slotted ancestor, and every descendant
# inherited it -- so a subclass declaring no __slots__ of its own was strict
# and could not be given an attribute at all:
#
#     class Base:
#         __slots__ = ()
#     class Sub(Base):
#         def __init__(self): self.x = 1     # AttributeError in Grail
#
# which is what stopped CPython's ipaddress.py, whose IPv4Network descends
# from a base spelled ``__slots__ = ()'' and whose __init__ assigns
# self.network_address (PR #731).
# ---------------------------------------------------------------------------

import functools


def _guard(fn):
    """Run fn(); a raise is a FAILED check, not an unloadable module.

    Every call guarded below returns True under CPython, so a False here is
    always a real disagreement.  Letting the exception escape instead would
    make the whole fixture unimportable on a Grail carrying the defect --
    and the SUnit report would then name the MODULE rather than the check
    that broke, turning a dozen named results into one opaque error."""
    try:
        return fn() is True
    except (AttributeError, TypeError):
        return False



# ---------------------------------------------------------------- empty tuple
# The exact shape from the ipaddress report.
class EmptySlotsBase:
    __slots__ = ()


class EmptySlotsChild(EmptySlotsBase):
    def __init__(self):
        self.x = 1


def _empty_tuple_base():
    s = EmptySlotsChild()
    return s.x == 1


RESULTS['child_of_empty_slots_assigns'] = _guard(_empty_tuple_base)
RESULTS['child_of_empty_slots_has_dict'] = _guard(
    lambda: hasattr(EmptySlotsChild(), '__dict__'))


# ------------------------------------------------------------- inherited slot
class A:
    __slots__ = ('x',)


class B(A):
    pass


def _b_arbitrary():
    b = B()
    b.zz = 2
    return b.zz == 2


def _b_slot_still_a_slot():
    # The inherited slot descriptor still wins: writing it must NOT land in
    # the instance __dict__.
    b = B()
    b.x = 1
    return b.x == 1 and 'x' not in b.__dict__


RESULTS['unslotted_child_assigns_arbitrary'] = _guard(_b_arbitrary)
RESULTS['unslotted_child_has_dict'] = hasattr(B(), '__dict__')
RESULTS['inherited_slot_bypasses_dict'] = _guard(_b_slot_still_a_slot)
RESULTS['unslotted_child_setattr_builtin'] = _guard(
    lambda: (lambda b: (setattr(b, 'q', 7), b.q == 7)[1])(B()))


def _b_delattr():
    b = B()
    b.zz = 3
    del b.zz
    return not hasattr(b, 'zz')


RESULTS['unslotted_child_delattr'] = _guard(_b_delattr)


# --------------------------------------------------------------- three levels
# A (slots) -> B (none, so it has a __dict__) -> C (slots again).  C's own
# declaration cannot take the __dict__ back away: B already gave every
# instance below it one.
class C(B):
    __slots__ = ('y',)


def _c_assign():
    c = C()
    c.y = 5
    c.qq = 6
    return c.y == 5 and c.qq == 6


RESULTS['reslotted_grandchild_assigns'] = _guard(_c_assign)
RESULTS['reslotted_grandchild_has_dict'] = hasattr(C(), '__dict__')


# ------------------------------------------------------- strict is still strict
# The opposite direction is already pinned above, on SBase/SSub: a chain in
# which EVERY class declares __slots__ stays strict and keeps no __dict__.
# testStrictnessIsNotInherited asserts those same keys, because the cheap
# wrong fix for everything below is to stop enforcing __slots__ at all.


# A class that names __dict__ in its own __slots__ is not strict either --
# that is CPython's documented opt-back-in.
class D1:
    __slots__ = ('a', '__dict__')


def _dict_member():
    d = D1()
    d.whatever = 1
    return d.whatever == 1 and hasattr(d, '__dict__')


RESULTS['dict_in_slots_not_strict'] = _guard(_dict_member)


# ------------------------------------------------- cached_property needs a dict
# functools.cached_property refuses to cache when the instance has no
# __dict__.  "Has no __dict__" is STRICT slots, not merely "some ancestor
# declared __slots__" -- an unslotted subclass of a slotted base has one.
class CPBase:
    __slots__ = ()


class CPSub(CPBase):
    @functools.cached_property
    def v(self):
        return 42


def _cached_property_on_unslotted_child():
    return CPSub().v == 42


class CPStrict:
    __slots__ = ('a',)

    @functools.cached_property
    def v(self):
        return 42


def _cached_property_strict_raises():
    try:
        CPStrict().v
    except TypeError:
        return True
    return False


RESULTS['cached_property_unslotted_child'] = _guard(_cached_property_on_unslotted_child)
RESULTS['cached_property_strict_raises'] = _guard(_cached_property_strict_raises)



if __name__ == '__main__':
    # Self-verifying under CPython: every RESULTS entry is a claim about what
    # CPython does, and the SUnit tests assert each is True.  Running the file
    # is what stops a check from pinning Grail's behaviour instead -- which is
    # why the whole fixture, both halves, opts into the gate.
    for _k in sorted(RESULTS):
        print('%-4s %s' % ('OK' if RESULTS[_k] is True else 'FAIL', _k))
