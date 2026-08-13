# enum.EnumDict -- public in CPython since 3.13 -- is the mapping an enum class
# body is built in.  It tracks member names in declaration order and REFUSES to
# let one be reused:
#
#     enumdict = EnumDict()
#     enumdict['a'] = 1
#     enumdict['a'] = 'other value'      # TypeError
#
# Grail bound ``enum.EnumDict`` to plain ``dict``, which accepts everything.
#
# test_enum TestEnumDict.test_enum_dict_standalone.

from enum import EnumDict

r = {}

d = EnumDict()
d['a'] = 1
r['stored'] = d['a']
r['type'] = type(d).__name__

try:
    d['a'] = 'other value'
    r['duplicate'] = 'NOT RAISED'
except TypeError as e:
    r['duplicate'] = str(e)

r['members'] = repr(d._member_names)
r['last_values'] = repr(d._last_values)
r['cls_name'] = repr(d._cls_name)

# Only the MutableMapping interface is overridden, which CPython's own test
# pins deliberately: ``|=`` goes through dict.__ior__ and succeeds, overwriting
# the value __setitem__ refused.
d |= {'a': 'other value'}
r['after_ior'] = d['a']

# --- reserved sunder names ------------------------------------------------------

d2 = EnumDict()

try:
    d2['_a_sunder_'] = 3
    r['bad_sunder'] = 'NOT RAISED'
except ValueError as e:
    r['bad_sunder'] = str(e)

# One of the supported ones goes in, and is NOT a member.
d2['_order_'] = 'x y'
r['ok_sunder'] = '%s;%s' % (d2['_order_'], list(d2._member_names))

# A dunder passes straight through, also without becoming a member.
d2['__doc__'] = 'docs'
r['dunder'] = '%s;%s' % (d2['__doc__'], list(d2._member_names))

# ``__order__`` is stored under CPython's modern spelling.
d3 = EnumDict()
d3['__order__'] = 'a b'
r['order_rename'] = '%s;%s' % (d3['_order_'], '__order__' in d3)

# --- what counts as a member ----------------------------------------------------

d4 = EnumDict()
d4['one'] = 1
d4['two'] = 2
d4['prop'] = property(lambda self: 1)      # a descriptor is not a member
d4['three'] = 3
r['member_order'] = repr(d4._member_names)
r['values_order'] = repr(d4._last_values)

# A name already used by a member cannot be rebound as a descriptor either.
try:
    d4['one'] = property(lambda self: 1)
    r['member_then_descriptor'] = 'NOT RAISED'
except TypeError as e:
    r['member_then_descriptor'] = str(e)

# --- KNOWN GAP, recorded rather than endorsed ------------------------------------
# CPython's dict.__ior__ mutates in place, so the object stays an EnumDict.
# Grail's ``|=`` builds a new plain dict, so the tracking is lost.  The value
# assertion above is what test_enum_dict_standalone checks, and it holds either
# way; this pins the difference so it is not mistaken for intended behaviour.

d6 = EnumDict()
d6['a'] = 1
d6 |= {'b': 2}
r['ior_type_is_a_known_gap'] = type(d6).__name__
