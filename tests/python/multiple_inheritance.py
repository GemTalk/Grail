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
