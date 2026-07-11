# GRAIL: fixture for DunderNewTestCase -- descriptor-round scenarios
# that need real class definitions (a classdef cannot instantiate
# inside PythonTestCase>>eval:).  NOT a vendored CPython module; the
# name avoids the test_ discovery glob.


class D:
    def __new__(cls, v):
        self = super(D, cls).__new__(cls)
        self.y = v * 2
        return self


class Slotted:
    __slots__ = ("_x",)

    def __new__(cls, v):
        self = super(Slotted, cls).__new__(cls)
        self._x = v
        return self


class OpAttrs:
    def _add(a, b):
        return a.v + b.v

    def _factory(mono, fall):
        def forward(a, b):
            return mono(a, b)

        def reverse(b, a):
            return fall(a, b)

        return forward, reverse

    __add__, __radd__ = _factory(_add, _add)

    def __init__(self, v):
        self.v = v


class Rebinder:
    def m(__self, v):
        if v > 0:
            __self = None
        return __self is None


def sealed_subclass_result():
    # int subclassing WORKS now (AbstractPyInt routing); bool stays
    # sealed -- CPython itself forbids subclassing bool.
    try:
        class MyBool(bool):
            pass
        return "no-error"
    except TypeError:
        return "type-error"


NEW_RESULT = D(4).y
SLOT_RESULT = Slotted(5)._x
OP_RESULT = OpAttrs(3) + OpAttrs(4)
REBIND_RESULT = Rebinder().m(1)
SEALED_RESULT = sealed_subclass_result()


class GenericBox[T]:
    # PEP 695 type params on a CLASS (parsed and erased).
    def __init__(self, v):
        self.v = v


PEP695_CLASS_RESULT = GenericBox(7).v


class NestedOuter:
    class A:
        x = 5

    class B:
        y = 6

    a = A()
    b = B()


NESTED_RESULT = NestedOuter.a.x + NestedOuter.b.y


class ClosureHost:
    def m(self):
        class A:
            @staticmethod
            def s(x):
                return (self, x)
        return A.s(4)[1]


CLOSURE_RESULT = ClosureHost().m()


class MyInt(int):
    def label(self):
        return "v=" + str(int(self))


INT_SUB_RESULTS = [
    MyInt(7) + 1,
    1 + MyInt(7),
    type(MyInt(3) + MyInt(4)).__name__,
    isinstance(MyInt(7), int),
    issubclass(MyInt, int),
    MyInt("101", 2),
    [10, 20, 30][MyInt(1)],
    {MyInt(7): "x"}[7],
    MyInt(9).label(),
    hash(MyInt(5)) == hash(5),
]


class GetitemOnly:
    def __init__(self, seq):
        self.seq = list(seq)

    def __getitem__(self, i):
        return self.seq[i]


class IterNoNext:
    def __iter__(self):
        return self


class NotIterable:
    pass


def _legacy_iter_results():
    r = [list(GetitemOnly([3, 1, 2])), sorted(GetitemOnly([3, 1, 2]))]
    try:
        next(iter(IterNoNext()))
        r.append("no-error")
    except TypeError:
        r.append("type-error")
    try:
        iter(NotIterable())
        r.append("no-error")
    except TypeError:
        r.append("type-error")
    return r


LEGACY_ITER_RESULT = _legacy_iter_results()


# (The old _compile_fail_result fixture -- a class method referencing a
# method-local sibling -- now COMPILES thanks to closure cells; the
# catchable-compile-failure guard is probed directly from the SUnit
# test instead.)


def _protocol_fallback_results():
    import math

    class Bare:
        pass

    b = Bare()
    r = []
    for thunk in [lambda: b[0], lambda: b.__setitem__(0, 1),
                  lambda: iter(3), lambda: math.acos(),
                  lambda: math.exp("x")]:
        try:
            thunk()
            r.append("no-error")
        except TypeError:
            r.append("te")
    return r


PROTOCOL_FALLBACK_RESULT = _protocol_fallback_results()


def _closure_cell_results():
    class Local:
        def m(self):
            return Local

    data = [3, 1, 2]

    class Sorter:
        def go(self):
            return sorted(data)

    class CustomInt(int):
        @property
        def numerator(self):
            return self

        @property
        def denominator(self):
            return CustomInt(1)

        def __mul__(self, other):
            return CustomInt(int(self) * int(other))

    from fractions import Fraction as F
    f = F(CustomInt(13), CustomInt(5))
    return [Local().m().__name__, Sorter().go(), str(f),
            isinstance(CustomInt(2), __import__("numbers").Rational)]


CLOSURE_CELL_RESULT = _closure_cell_results()


def _phase2_results():
    # Regressions for the phase-2 scoreboard round: NoneType ordering,
    # kwargs constructors, extend/update protocols, negative/huge-step
    # slices, repr cycle+depth guards, memory guards, chained
    # tuple-unpack assignment.
    out = {}
    d = {'1': 1}
    ka, va = ta = d.popitem()
    out['chained'] = (ka == '1') and (va == 1) and (ta == (ka, va))
    try:
        [None, 1].sort()
        out['none_lt'] = 'no-raise'
    except TypeError:
        out['none_lt'] = 'TypeError'
    try:
        tuple(sequence=())
        out['tuple_kw'] = 'no-raise'
    except TypeError:
        out['tuple_kw'] = 'TypeError'
    try:
        list(sequence=[])
        out['list_kw'] = 'no-raise'
    except TypeError:
        out['list_kw'] = 'TypeError'
    a = [1]
    try:
        a.extend(None)
        out['extend_none'] = 'no-raise'
    except TypeError:
        out['extend_none'] = 'TypeError'

    class It:
        def __init__(self):
            self.n = 0

        def __iter__(self):
            return self

        def __next__(self):
            self.n += 1
            if self.n > 2:
                raise StopIteration
            return self.n

    a.extend(It())
    out['extend_iter'] = repr(a)
    b = [0, 1, 2, 3]
    b[::-1] = b
    out['neg_assign'] = repr(b)
    c = [0, 1, 2, 3, 4]
    del c[1::-2]
    out['neg_del'] = repr(c)
    e = [0, 1, 2, 3, 4]
    e[1::9223372036854775807] = [0]
    out['big_step_set'] = repr(e)
    f = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    del f[9::1 << 333]
    out['big_step_del'] = repr(f)

    class evil:
        def __init__(self, lst):
            self.lst = lst

        def __iter__(self):
            for x in list(self.lst):
                yield x
            self.lst.clear()

    g = [0, 1, 2, 3, 4]
    try:
        g[::-1] = evil(g)
        out['evil'] = 'no-raise'
    except ValueError:
        out['evil'] = 'ValueError'
    h = [0, 1]
    h.append(h)
    out['list_cycle'] = repr(h)
    dd = {}
    dd['k'] = dd
    out['dict_cycle'] = repr(dd)
    deep = []
    for _ in range(2000):
        deep = [deep]
    try:
        repr(deep)
        out['deep'] = 'no-raise'
    except RecursionError:
        out['deep'] = 'RecursionError'
    try:
        [0] * (2 ** 62)
        out['mul_mem'] = 'no-raise'
    except MemoryError:
        out['mul_mem'] = 'MemoryError'
    mm = [0]
    try:
        mm *= 2 ** 62
        out['imul_mem'] = 'no-raise'
    except MemoryError:
        out['imul_mem'] = 'MemoryError'
    out['iter_repr'] = repr(iter((1, 2))).startswith('<tuple_iterator')
    u = {}
    try:
        u.update(None)
        out['upd_none'] = 'no-raise'
    except TypeError:
        out['upd_none'] = 'TypeError'
    try:
        u.update(42)
        out['upd_int'] = 'no-raise'
    except TypeError:
        out['upd_int'] = 'TypeError'
    try:
        u.update([object()])
        out['upd_obj'] = 'no-raise'
    except TypeError:
        out['upd_obj'] = 'TypeError'
    u.update([('a', 1), ('b', 2)])

    class M:
        def keys(self):
            return ['x']

        def __getitem__(self, k):
            return 9

    u.update(M())
    out['upd'] = (u['a'] == 1) and (u['b'] == 2) and (u['x'] == 9)
    out['rev_dict'] = repr(sorted(list(reversed({'p': 1, 'q': 2}))))
    return out


PHASE2_RESULT = _phase2_results()


def _enum_functional_results():
    # Enum FUNCTIONAL API (Enum('Name', names, **kw)) -- the shape
    # test_enum uses at module scope.
    from enum import Enum, IntEnum, Flag
    r = {}
    Question = Enum('Question', 'who what when', module=__name__)
    r['names'] = repr([Question.who.name, Question.what.name, Question.when.name])
    r['values'] = repr([Question.who.value, Question.what.value, Question.when.value])
    r['lookup'] = Question(2) is Question.what
    r['getitem'] = Question['who'] is Question.who
    r['len'] = len(Question)
    Perm = IntEnum('Perm', 'R W X', start=8)
    r['start'] = repr([int(Perm.R), int(Perm.W), int(Perm.X)])
    Pair = Enum('Pair', (('A', 10), ('B', 20)))
    r['pairs'] = repr([Pair.A.value, Pair.B.value])
    Empty = Enum('Empty', type=int)
    r['empty'] = len(list(Empty))
    PFlag = Flag('PFlag', 'R W X')
    r['flag'] = PFlag.R.name
    return r


ENUM_FUNC_RESULT = _enum_functional_results()


def _phase2b_results():
    # Second phase-2 round: kernel-class-collision mangle (array),
    # collections helpers, context-manager protocol TypeError, and the
    # uncompilable-method stub fallback.
    out = {}
    import array
    a = array.array('i', [1, 2])
    out['array'] = (repr(a) == "array('i', [1, 2])") and (len(a) == 2) and (a[0] == 1)
    out['kernel_intact'] = repr((1, 2)) == '(1, 2)'
    from collections import Counter, _count_elements
    d = {}
    _count_elements(d, 'abracadabra')
    out['count_elements'] = (d['a'] == 5) and (d['b'] == 2)
    out['counter'] = Counter('aab')['a'] == 2
    def notacm():
        yield 1
    g = notacm()
    try:
        with g:
            pass
        out['with_gen'] = 'no-raise'
    except TypeError:
        out['with_gen'] = 'TypeError'

    class HasBadMethod:
        def good(self):
            return 42

        def bad(self):
            return (lambda: (yield))()  # generator lambda: known codegen gap

    inst = HasBadMethod()
    out['good_still_works'] = inst.good()
    try:
        inst.bad()
        out['bad_raises'] = 'no-raise'
    except NameError:
        out['bad_raises'] = 'NameError'
    return out


PHASE2B_RESULT = _phase2b_results()


def _class_body_if_results():
    # Class-body ``if`` statements execute at class-definition time
    # (CPython's C-vs-Python dual-module test pattern:
    # ``if c_functools: partial = c_functools.partial``).
    import functools
    c_mod = functools
    missing = None

    class Cond:
        if c_mod:
            module = c_mod
            partial = c_mod.partial
        if missing:
            ghost = 1
        else:
            fallback = 'py'

        def read(self):
            return (self.module is c_mod,
                    self.partial(int, "7")(),
                    self.fallback,
                    hasattr(self, 'ghost'))

    return Cond().read()


CLASS_BODY_IF_RESULT = _class_body_if_results()


def _unittest_surface_results():
    import unittest
    import warnings

    class T(unittest.TestCase):
        def test_it(self):
            self.assertIsSubclass(ValueError, Exception)
            self.assertNotIsSubclass(ValueError, TypeError)
            cm = warnings.catch_warnings(record=True)
            self.enterContext(cm)

    t = T('test_it')
    r = unittest.TestResult()
    t.run(r)
    return (r.testsRun, len(r.errors), len(r.failures))


UNITTEST_SURFACE_RESULT = _unittest_surface_results()
