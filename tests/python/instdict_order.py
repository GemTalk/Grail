# Fixture for PyDictTestCase>>testInstanceDictPreservesInsertionOrder.
# obj.__dict__ / vars(obj) must iterate attributes in INSERTION order
# (CPython guarantee).  Grail's instance __dict__ is a PyInstanceDict live
# view over the instance's dynamic instVars (stored in declaration order),
# so this is ordered independently of PyDict -- the test locks the invariant
# alongside the ordered-dict (PyDict) work.  A class def + instantiation
# needs a real module (the eval: path can't instantiate an inline classdef).


class C:
    pass


o = C()
o.zz = 1
o.aa = 2
o.mm = 3
o.qq = 4
BEFORE = list(o.__dict__.keys())
VARSKEYS = list(vars(o).keys())
REP = repr(o.__dict__)
# del then re-assign appends at the end (CPython), matching a dynamic-instVar
# remove-then-add.
del o.aa
o.aa = 99
AFTER = list(o.__dict__.keys())
