# ``dir()`` on a CLASS did not list the class's methods.
#
# Grail splits in two what CPython keeps in one dict.  A class body's DATA
# attributes (``data = 42``) compile to an accessor pair on the METACLASS, and
# the class's METHODS are env-1 selectors on the class itself.  object>>__dir__
# scanned ``self class'' -- the metaclass -- and so answered exactly one of the
# two halves: dir(C) had ``data'' and no ``meth'', while dir(C()) had both
# (an instance's ``self class'' IS the class).
#
# CPython's type.__dir__ merges cls.__dict__ with each base's and DELIBERATELY
# omits the metaclass ("methods belonging to the metaclass would probably be
# more confusing than helpful").  Grail cannot omit it -- that is where half the
# answer is stored -- so the union of both chains is the closest reachable
# thing.  What it costs is the metaclass's own selectors leaking in, which they
# did before this change as well.
#
# The second half of the same defect: ``C.meth`` is an UnboundMethod, which is
# what a class hands back where CPython hands back a plain function
# (``C().meth`` is a BoundMethod -- exactly CPython's function/method split).
# inspect.isfunction did not know the name, so isroutine() was False for every
# method reached through its class and classify_class_attrs called them all
# "data".
#
# test_enum TestStdLib.test_inspect_classify_class_attrs; the same list reaches
# inspect.getmembers and pydoc.

import inspect
from collections import UserDict

r = {}


class Base:
    base_data = 0

    def inherited(self):
        pass


class C(Base):
    data = 42

    def meth(self):
        pass

    @staticmethod
    def stat():
        pass

    @classmethod
    def cls_m(cls):
        pass

    @property
    def prop(self):
        return 1


_names = ('data', 'base_data', 'meth', 'inherited', 'prop', 'stat', 'cls_m')

# --- dir() on the class now reaches both halves ---------------------------------

r['dir_of_class_has_every_name'] = repr([n in dir(C) for n in _names])
# A class with no instance attributes: CPython answers the same list either way,
# because dir(instance) is list(inst.__dict__) + dir(type(inst)).
r['dir_of_class_equals_dir_of_instance'] = repr(
    all(n in dir(C()) for n in _names))

# --- an UnboundMethod is a routine ------------------------------------------------

r['a_class_method_is_a_routine'] = repr(
    [inspect.isroutine(C.meth), inspect.isfunction(C.meth)])
# ...and reached through an INSTANCE it is a bound method, not a function.
r['an_instance_method_is_bound'] = repr(
    [inspect.ismethod(C().meth), inspect.isfunction(C().meth)])

# --- so classify_class_attrs classifies them -----------------------------------------

_c = {a.name: a for a in inspect.classify_class_attrs(C)}
r['classify_kinds'] = repr([_c[n].kind for n in ('data', 'base_data', 'meth', 'inherited')])
r['classify_homes'] = repr(
    [_c[n].defining_class is h
     for n, h in (('data', C), ('base_data', Base), ('meth', C), ('inherited', Base))])

# --- a UserDict is not reversible -------------------------------------------------
# Exposed rather than caused by the above: dir(dict) never reported __reversed__
# before, so test_collections' ``dir(UserDict) >= dir(dict)'' passed vacuously.
# Upstream's UserDict subclasses MutableMapping and inherits ``__reversed__ =
# None'' from Mapping; Grail's is standalone and never said so, and reversed()
# fell through to the SEQUENCE protocol that __len__ and __getitem__ make it
# look like.

try:
    list(reversed(UserDict({'a': 1, 'b': 2})))
    r['reversed_userdict'] = 'no error'
except Exception as _e:
    r['reversed_userdict'] = '%s: %s' % (type(_e).__name__, _e)
r['userdict_has_every_dict_name'] = repr(sorted(set(dir(dict)) - set(dir(UserDict))))

# --- KNOWN GAPS, recorded rather than endorsed -------------------------------------
# Both are about what a class __dict__ HOLDS, not about dir(), and each is its
# own piece of work.  CPython is expected to DISAGREE with every value below.
#
# 1. A property reached through the class is not the property object -- ``C.prop''
#    answers an UnboundMethod, so classify_class_attrs calls it a method where
#    CPython calls it a property.  (It works correctly on an INSTANCE: C().prop
#    is 1, asserted here so the gap stays narrow.)
r['property_on_a_class_is_a_known_gap'] = repr(
    [type(C.prop).__name__, _c['prop'].kind, C().prop])

# 2. A staticmethod and a classmethod are both stored as an UnboundMethod, and
#    ``kind'' is read off the stored object precisely because that object is what
#    tells them apart -- so both come back as plain methods.
r['staticmethod_kind_is_a_known_gap'] = repr(
    [_c['stat'].kind, _c['cls_m'].kind])


EXPECTED = {
    'a_class_method_is_a_routine': '[True, True]',
    'an_instance_method_is_bound': '[True, False]',
    'classify_homes': '[True, True, True, True]',
    'classify_kinds': "['data', 'data', 'method', 'method']",
    'dir_of_class_equals_dir_of_instance': 'True',
    'dir_of_class_has_every_name': '[True, True, True, True, True, True, True]',
    'reversed_userdict': "TypeError: 'UserDict' object is not reversible",
    'userdict_has_every_dict_name': '[]',
}

GRAIL_ONLY = {
    'property_on_a_class_is_a_known_gap': "['UnboundMethod', 'method', 1]",
    'staticmethod_kind_is_a_known_gap': "['method', 'method']",
}


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-38s %s %s' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    for k in sorted(GRAIL_ONLY):
        actual = r[k]
        print('%-38s %s %s' % (k, 'XPASS' if actual == GRAIL_ONLY[k] else 'XFAIL', actual))
