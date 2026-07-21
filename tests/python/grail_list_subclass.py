# Fixture for ListTestCase>>testSubclassConstruction.
#
# A built-in-collection subclass with no __init__ of its own inherits
# population from the built-in __init__, detected at RUNTIME so DYNAMIC bases
# work too (list_tests test_getitemoverwriteiter uses `class T(self.type2test)`;
# test_list test_keywords_in_subclass covers plain / __init__ / __new__ forms).
class Sub(list):
    pass


class SubGetitem(list):
    def __getitem__(self, key):
        return "override"


class SubInit(list):
    def __init__(self, seq, newarg=None):
        super().__init__(seq)
        self.newarg = newarg


class SubNew(list):
    def __new__(cls, seq, newarg=None):
        self = super().__new__(cls, seq)
        self.newarg = newarg
        return self


def _dynamic_base():
    base = list                      # dynamic (non-literal) base
    class T(base):
        def __getitem__(self, key):
            return "override"
    return T((1, 2))


def check():
    ok = []
    ok.append(list(Sub([1, 2])) == [1, 2])
    # iter() uses list storage, NOT the __getitem__ override:
    ok.append(next(iter(SubGetitem((1, 2)))) == 1)
    si = SubInit([1, 2], newarg=3)
    ok.append(list(si) == [1, 2] and si.newarg == 3)
    sn = SubNew([1, 2], newarg=3)
    ok.append(list(sn) == [1, 2] and sn.newarg == 3)
    t = _dynamic_base()
    ok.append(len(t) == 2 and next(iter(t)) == 1)
    try:
        Sub(sequence=())
        ok.append(False)
    except TypeError:
        ok.append(True)
    return all(ok)
