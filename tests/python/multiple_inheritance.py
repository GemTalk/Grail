# Fixture for MultipleInheritanceTestCase.
#
# Grail emulates Python multiple inheritance by keeping the class's
# Smalltalk single inheritance from the FIRST base and merging in the
# methods of the SECONDARY Python bases (importlib
# ___mergeSecondaryBases___).  Precedence: a method on the class or
# its primary chain wins; a secondary-base method overrides the
# universal object/PythonInstance defaults; leftmost secondary base
# wins over a later one.


class Storage:
    def __init__(self):
        self.items = []

    def add(self, x):
        self.items.append(x)
        return self

    def count(self):
        return len(self.items)

    def kind(self):
        return 'storage'

    def __repr__(self):
        return 'Storage(' + str(self.count()) + ')'


class ReadOnlyMixin:
    def kind(self):
        return 'readonly'      # overrides Storage.kind (Mixin is leftmost)

    def is_readonly(self):
        return True


class ReadOnlyStorage(ReadOnlyMixin, Storage):
    pass


class LabeledStorage(ReadOnlyMixin, Storage):
    def kind(self):
        return 'labeled'       # own method beats both bases


def inherits_methods_from_both():
    """Methods come from the primary base (is_readonly, via Smalltalk
    inheritance) and the secondary base (add/count, via merge);
    construction uses the secondary base's __init__."""
    s = ReadOnlyStorage()
    s.add(1)
    s.add(2)
    return s.count() == 2 and s.is_readonly() is True


def leftmost_base_wins():
    """kind() is defined in both bases; the leftmost (primary
    ReadOnlyMixin) wins."""
    return ReadOnlyStorage().kind() == 'readonly'


def own_method_beats_bases():
    """A method defined on the class itself beats both bases."""
    return LabeledStorage().kind() == 'labeled'


def secondary_base_repr_beats_object_default():
    """Storage.__repr__ (a secondary base) overrides object's default
    __repr__ — the universal roots don't block secondary methods."""
    s = ReadOnlyStorage()
    s.add(1)
    return repr(s) == 'Storage(1)'


# --- storage-base selection: a (mixin, built-in-subclass) base list
#     subclasses the built-in-backed base, not the storage-less mixin.

class TagMixin:
    def tag(self):
        return 'tagged'


class MyDict(dict):
    pass


class MixedDict(TagMixin, MyDict):
    pass


# --- C3 linearization + cooperative super (Phase 0/1 of real MI) ---

class C3A:
    pass

class C3B(C3A):
    pass

class C3C(C3A):
    pass

class C3D(C3B, C3C):
    pass


def c3_diamond_order():
    # D's MRO must be [D, B, C, A, ...] -- C3 puts BOTH branches of the
    # diamond before the shared ancestor (a plain superclass-chain walk
    # would report [D, B, A, ...] and lose C entirely).
    names = [c.__name__ for c in C3D.__mro__]
    return names[:4]


def c3_bases_are_true_bases():
    return [c.__name__ for c in C3D.__bases__]


def c3_secondary_isinstance():
    # C3C is a secondary base: not on the Smalltalk chain.
    d = C3D()
    return (isinstance(d, C3C), issubclass(C3D, C3C), isinstance(d, C3A))


class CoopBase:
    def __init__(self):
        self.log = getattr(self, "log", [])
        self.log.append("base")

class CoopMixin:
    def __init__(self):
        self.log = getattr(self, "log", [])
        self.log.append("mixin")
        super().__init__()          # must reach CoopBase THROUGH D's MRO

class CoopD(CoopMixin, CoopBase):
    def __init__(self):
        self.log = []
        self.log.append("d")
        super().__init__()          # -> CoopMixin.__init__ -> CoopBase.__init__


def cooperative_super_chain():
    return CoopD().log


def inconsistent_mro_raises():
    # CPython: TypeError at class creation (X before Y in one base's MRO,
    # Y before X in the other's -- no consistent linearization exists).
    class X: pass
    class Y: pass
    class XY(X, Y): pass
    class YX(Y, X): pass
    try:
        bad = type("Bad", (XY, YX), {})
        return "no-error"
    except TypeError:
        return "type-error"
