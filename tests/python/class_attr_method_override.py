# A class-body ASSIGNMENT that binds a callable must override an inherited
# method of the same name -- including for a self-send made from inside the
# BASE class, which is where Grail used to lose it.
#
# Grail compiles ``self.m()`` inside a class that defines ``m`` to a direct
# Smalltalk send, resolved virtually.  An assignment compiles NO method, so a
# subclass that writes ``m = Other.m'' left the base's compiled ``m'' as the
# nearest implementation and the base's own self-send ran THAT -- while
# ``sub.m()'' (an attribute load) correctly ran the assigned function.  Two
# spellings of the same call disagreed.
#
# unittest.TestCase.run() calls ``self.setUp()'' exactly that way, so
# test.test_set's TestSetSubclassWithSlots -- ``setUp = TestJointOps.setUp'' --
# never ran its setUp and every test in it died on a missing ``self.s''.

import unittest

r = {}


class Donor:
    def greet(self):
        return 'donor'

    def add(self, a, b):
        return ('donor', a, b)

    def flex(self, *args, **kw):
        return ('donor', args, sorted(kw))


class Base:
    def greet(self):
        return 'base'

    def add(self, a, b):
        return ('base', a, b)

    def flex(self, *args, **kw):
        return ('base', args, sorted(kw))

    def via_self(self):
        return self.greet()

    def via_self_2(self):
        return self.add(1, 2)

    def via_self_kw(self):
        return self.flex(1, k=2)


class Sub(Base):
    greet = Donor.greet
    add = Donor.add
    flex = Donor.flex


s = Sub()
# The attribute path always worked; the self-send is the regression.
r['attr_greet'] = s.greet()
r['self_greet'] = s.via_self()
r['attr_add'] = s.add(1, 2)
r['self_add'] = s.via_self_2()
r['attr_flex'] = s.flex(1, k=2)
r['self_flex'] = s.via_self_kw()

# The base itself is untouched -- the forwarder is installed per class.
b = Base()
r['base_greet'] = b.via_self()

# A grandchild that re-assigns wins over the parent's assignment...


class Regrandchild(Sub):
    def greet(self):
        return 'own def'


r['own_def_wins'] = Regrandchild().via_self()


# ...and one that assigns nothing inherits the parent's forwarder.


class Inheritor(Sub):
    pass


r['inherited_shadow'] = Inheritor().via_self()

# A NON-callable class attribute that happens to share a name with an
# inherited method must NOT be turned into a method -- reading it gives the
# value, and there is nothing to forward to.


class DataSub(Base):
    greet = 'just a string'


r['data_attr'] = DataSub().greet

# The real-world shape: unittest's run() reaching a borrowed setUp.


class Common:
    def setUp(self):
        self.word = 'simsalabim'
        self.s = self.thetype(self.word)

    def test_len(self):
        self.assertEqual(len(self.s), 6)


class SetWithSlots(set):
    __slots__ = ('x', 'y', '__dict__')


class TestBorrowed(unittest.TestCase):
    thetype = SetWithSlots
    setUp = Common.setUp
    test_len = Common.test_len


class TestBorrowedSub(TestBorrowed):
    # Inherits setUp/test_len as class attributes, overriding only the type --
    # exactly test_set's TestFrozenSetSubclassWithSlots.
    thetype = frozenset


def _run(cls):
    res = unittest.TestResult()
    cls('test_len').run(res)
    if res.errors:
        return 'error: %s' % (res.errors[0][1],)
    if res.failures:
        return 'failure: %s' % (res.failures[0][1],)
    return 'ok'


r['borrowed_setup'] = _run(TestBorrowed)
r['borrowed_setup_inherited'] = _run(TestBorrowedSub)

RESULTS = r
