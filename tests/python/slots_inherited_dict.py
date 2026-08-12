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
