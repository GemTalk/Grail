# CPython's object.__repr__ names the object:
#
#     <module.QualName object at 0x7f9c1c0d3e50>
#
# Grail printed ``<Foo object>'' -- neither the module nor the address.  That
# was not just terse, it was WRONG in a way tests can rely on: two distinct
# objects of the same class had EQUAL reprs.
#
# CPython object_repr, which this now mirrors:
#
#     if (mod != NULL && !equal(mod, "builtins"))
#         "<%U.%U object at %p>" % (mod, qualname, self)
#     else
#         "<%s object at %p>" % (tp_name, self)
#
# so the module qualifies the name unless it is builtins, the name is the
# __qualname__ (an inner class reads ``Outer.Inner''), the address is id(self)
# in hex, and either part is dropped unless it is a STRING -- which earns its
# keep in Grail, where several internal classes answer something else entirely
# for __module__.

import operator
import pickle

r = {}


class Foo:
    pass


class Outer:
    class Inner:
        pass


f = Foo()
r['repr'] = repr(f)
r['module_qualified'] = repr(f).startswith('<default_object_repr.Foo object at 0x')
r['ends'] = repr(f).endswith('>')

# The address IS id(), as CPython guarantees by printing the pointer.
r['address_is_id'] = hex(id(f)) in repr(f)

# str() falls through to __repr__, so it says the same thing.
r['str_matches'] = str(f) == repr(f)

# The whole point: two objects of one class no longer read identically.
r['distinct'] = repr(Foo()) != repr(Foo())
r['same_object'] = repr(f) == repr(f)

# The NAME is the qualname, so a nested class carries its enclosing class.
r['nested'] = repr(Outer.Inner()).startswith('<default_object_repr.Outer.Inner object at 0x')

# --- the builtins module is left off -------------------------------------------
#
# CPython's else branch: object() reads ``<object object at 0x...>'', not
# ``<builtins.object object at 0x...>''.

o = object()
r['builtins'] = repr(o).startswith('<object object at 0x')
r['builtins_module'] = type(o).__module__

# --- a class with its own __repr__ is untouched ---------------------------------


class Mine:
    def __repr__(self):
        return 'mine'


r['own_repr'] = repr(Mine())

# --- a non-string __module__ is dropped rather than printed ----------------------
#
# Grail's BoundMethod answers an UnboundMethod for __module__; without
# CPython's PyUnicode_Check the repr read ``<anUnboundMethod.BoundMethod object
# at 0x...>''.


class Holder:
    def method(self):
        pass


bm = Holder().method
r['bound_method'] = repr(bm).startswith('<BoundMethod object at 0x')

# --- operator's getters repr by CONTENT ------------------------------------------
#
# CPython gives all three a repr built from what they hold, which is what makes
# ``repr(pickle.loads(pickle.dumps(f))) == repr(f)'' hold -- test_operator
# asserts exactly that.  Grail's had none, so they fell to object.__repr__ and
# that comparison passed only for as long as the default repr carried no
# address to differ in.

r['attrgetter'] = repr(operator.attrgetter('name'))
r['attrgetter_multi'] = repr(operator.attrgetter('a', 'b.c'))
r['itemgetter'] = repr(operator.itemgetter(0))
r['itemgetter_multi'] = repr(operator.itemgetter(1, 2))
r['methodcaller'] = repr(operator.methodcaller('upper'))
r['methodcaller_args'] = repr(operator.methodcaller('m', 1, x=2))

r['roundtrips'] = ';'.join(
    str(repr(pickle.loads(pickle.dumps(g))) == repr(g))
    for g in (operator.attrgetter('name'), operator.itemgetter(0),
              operator.methodcaller('upper'), operator.methodcaller('m', 1, x=2)))
