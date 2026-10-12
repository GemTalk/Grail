# Regression fixture for #1454: a method inherited through a NON-FIRST base
# must resolve in C3 MRO order.
#
# Grail inherits the first (primary) base through Smalltalk single inheritance
# and copies the other bases' methods onto the class -- but only to fill gaps,
# so when the primary chain reached ANY class defining the name, a secondary
# base the MRO puts earlier lost.  pytest's collectors:
#
#     class PyCollector(Mixin, Collector): def collect(self) ...
#     class Module(File, PyCollector)     # File -> FSCollector -> Collector
#
# MRO: Module, File, FSCollector, PyCollector, Mixin, Collector, ... -- so
# Module().collect() is PyCollector's, and Grail answered Collector's abstract
# one, collecting nothing.  The same held for @classmethods.
#
# Expected values are what CPython 3.14 answers.

from enum import Enum, StrEnum

RESULTS = {}


class Node:
    pass


class Collector(Node):
    def collect(self):
        return 'Collector'

    class CollectError(Exception):
        pass


class FSCollector(Collector):
    pass


class File(FSCollector):
    pass


class Mixin:
    pass


class PyCollector(Mixin, Collector):
    def collect(self):
        return 'PyCollector'


class Module(File, PyCollector):
    pass


class ModuleSuper(File, PyCollector):
    def collect(self):
        return 'ModuleSuper>' + super().collect()


RESULTS['pytest_shape'] = Module().collect() == 'PyCollector'
RESULTS['pytest_shape_super'] = ModuleSuper().collect() == 'ModuleSuper>PyCollector'
RESULTS['pytest_shape_mro'] = [c.__name__ for c in Module.__mro__] == [
    'Module', 'File', 'FSCollector', 'PyCollector', 'Mixin', 'Collector',
    'Node', 'object']


class Base:
    def m(self):
        return 'Base'

    def n(self):
        return 'Base.n'

    @classmethod
    def cm(cls):
        return 'Base.cm'


class X(Base):
    def m(self):
        return 'X'


class Y(Base):
    def m(self):
        return 'Y'

    def n(self, flag=False):
        return 'Y.n' + ('!' if flag else '')

    @classmethod
    def cm(cls):
        return 'Y.cm'


class P(Base):
    pass


class Z(X, Y):
    pass


class Q(P, Y):
    pass


class OwnWins(P, Y):
    def m(self):
        return 'OwnWins'


RESULTS['primary_override_still_wins'] = Z().m() == 'X'
RESULTS['secondary_beats_shared_ancestor'] = Q().m() == 'Y'
RESULTS['secondary_classmethod'] = Q.cm() == 'Y.cm'
RESULTS['secondary_other_arity'] = Q().n() == 'Y.n' and Q().n(flag=True) == 'Y.n!'
RESULTS['own_method_wins'] = OwnWins().m() == 'OwnWins'


class Coop(Base):
    def m(self):
        return 'Coop>' + super().m()


class Leaf(P, Coop):
    def m(self):
        return 'Leaf>' + super().m()


RESULTS['cooperative_super'] = Leaf().m() == 'Leaf>Coop>Base'


# A nested class reached through a non-first base (the issue's second part).
class Diamond(Mixin, Collector):
    pass


RESULTS['nested_class_via_later_base'] = (
    Diamond.CollectError is Collector.CollectError
    and Diamond().CollectError is Collector.CollectError)


# Built-in bases keep their behaviour: an Enum mixin before StrEnum must not
# take str's equality away from the members (test_enum's test_strenum).
class EnumMixin(Enum):
    def hello(self):
        return 'hello'


class HelloEnum(EnumMixin, StrEnum):
    eight = '8'


RESULTS['strenum_mixin_equality'] = (
    HelloEnum.eight == '8' and HelloEnum.eight.hello() == 'hello')

if __name__ == '__main__':
    for _name, _ok in RESULTS.items():
        print('%-4s %s' % ('OK' if _ok is True else 'FAIL', _name))
