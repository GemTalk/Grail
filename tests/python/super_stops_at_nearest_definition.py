# Regression fixture: super() stops at the NEAREST class in the MRO that
# defines the name, even when an ancestor further up stores a value for it.
#
# A decorated def (``@abc.abstractmethod def collect'') keeps its decorated
# value in the class's attribute holder, and Super >> ___pyAttrLoad___: looked
# in holders first, along the Smalltalk superclass chain, returning the first
# one it met.  So ``super().collect()'' from a subclass skipped the parent's
# own plain ``collect'' and called the grandparent's abstract one.  This is
# pytest's collector tree -- Collector.collect is abstract, PyCollector.collect
# is real, Class and Module call super().collect() -- and every test file
# failed to collect with ``NotImplementedError: abstract'' (the case #1454
# left unisolated).
#
# Expected values are what CPython 3.14 answers.

import abc
import functools

RESULTS = {}


def attempt(f):
    try:
        return f()
    except NotImplementedError as e:
        return 'NotImplementedError: %s' % e


class Node:
    pass


class Collector(Node, abc.ABC):
    @abc.abstractmethod
    def collect(self):
        raise NotImplementedError('abstract')


class FSCollector(Collector, abc.ABC):
    pass


class File(FSCollector, abc.ABC):
    pass


class PyobjMixin(Node):
    pass


class PyCollector(PyobjMixin, Collector, abc.ABC):
    def collect(self):
        return 'PyCollector'


class Class(PyCollector):
    def collect(self):
        return 'Class>' + super().collect()


class Module(File, PyCollector):
    def collect(self):
        return 'Module>' + super().collect()


RESULTS['single_inheritance'] = attempt(lambda: Class().collect()) == 'Class>PyCollector'
RESULTS['pytest_module_diamond'] = (
    attempt(lambda: Module().collect()) == 'Module>PyCollector')


# Without abc.ABC and without the mixin: the decorator alone was enough.
class Base:
    @abc.abstractmethod
    def run(self):
        return 'Base.run'


class Mid(Base):
    def run(self):
        return 'Mid.run'


class Leaf(Mid):
    def run(self):
        return 'Leaf>' + super().run()


RESULTS['plain_abstractmethod_base'] = Leaf().run() == 'Leaf>Mid.run'


# A value STORED on an ancestor at runtime is reached the same way.
class Stored:
    pass


Stored.greet = lambda self: 'Stored.greet'


class Override(Stored):
    def greet(self):
        return 'Override.greet'


class Caller(Override):
    def greet(self):
        return 'Caller>' + super().greet()


RESULTS['runtime_store_on_ancestor'] = Caller().greet() == 'Caller>Override.greet'


# What the holder probe is FOR, unchanged: when the nearest defining class's
# own def is decorated, super() answers the decorated value.
def tagged(f):
    @functools.wraps(f)
    def wrapper(self):
        return 'tagged(' + f(self) + ')'
    return wrapper


class Decorated:
    @tagged
    def name(self):
        return 'Decorated.name'


class Sub(Decorated):
    def name(self):
        return 'Sub>' + super().name()


class SubSub(Sub):
    def name(self):
        return 'SubSub>' + super().name()


RESULTS['decorated_parent_still_decorated'] = (
    Sub().name() == 'Sub>tagged(Decorated.name)')
RESULTS['decorated_grandparent_through_plain_parent'] = (
    SubSub().name() == 'SubSub>Sub>tagged(Decorated.name)')

if __name__ == '__main__':
    for _name, _ok in RESULTS.items():
        print('%-4s %s' % ('OK' if _ok is True else 'FAIL', _name))
