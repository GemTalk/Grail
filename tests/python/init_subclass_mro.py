"""PEP 487 along the MRO, and the dynamic builder that skipped it entirely.

``__init_subclass__`` is a COOPERATIVE chain: the hook the class creation
enters is the first one after the new class in its MRO, and every hook ends
with ``super().__init_subclass__(**kwargs)`` to reach the next.  Both halves
resolve along the MRO of the class being created -- CPython's
``super(Owner, cls)`` uses ``cls.__mro__``, not Owner's own bases.

A diamond is where an MRO differs from a left-to-right walk of the bases:
``class A(Left, Middle, Right)`` with Left and Right both deriving from Base
puts Base AFTER Middle, so a base walk reaches Base through Left first and
never asks Middle.  The chain here is written so the ORDER is observable --
each hook appends to a list -- because an entry point that is right by
accident and a chain that is right by accident look identical from the outside
if you only check that the hooks ran.

Also pinned: the three shapes that reach a class attribute from inside a hook
or a classmethod, and what ``type(name, bases, ns)`` does with the protocol.
"""

import types

r = {}

# --- the cooperative chain, in MRO order ------------------------------------
#
# LOG records WHICH hook ran and in what order -- appended BEFORE the
# super() delegation, so it reads as the CALL order rather than the unwind.  The class attributes the
# hooks build are CPython's own assertion and are kept, but they are a weaker
# statement than they look: ``cls.calls += [x]`` MUTATES the list the class
# inherited, so a later subclass can write back into an ancestor's value, and
# an entry point that is wrong can still leave a plausible-looking list.

LOG = []


class Base:
    def __init_subclass__(cls, **kwargs):
        LOG.append('Base')
        super().__init_subclass__(**kwargs)
        cls.calls = []


class Left(Base):
    pass


class Middle:
    def __init_subclass__(cls, middle, **kwargs):
        LOG.append('Middle')
        super().__init_subclass__(**kwargs)
        cls.calls += [middle]


class Right(Base):
    def __init_subclass__(cls, right="right", **kwargs):
        LOG.append('Right')
        super().__init_subclass__(**kwargs)
        cls.calls += [right]


del LOG[:]


class A(Left, Middle, Right, middle="middle"):
    pass


r['diamond_mro'] = [c.__name__ for c in A.__mro__]
r['diamond_chain_order'] = list(LOG)
r['diamond_calls'] = list(A.calls)
r['diamond_left_untouched'] = list(Left.calls)
r['diamond_right_untouched'] = list(Right.calls)


# The two-base case, where the entry is a base's ancestor and the continuation
# has to cross to a sibling branch that shares no ancestor with it.
del LOG[:]


class Two(Left, Middle, middle="m"):
    pass


r['two_base_chain_order'] = list(LOG)


# A hook on a SECONDARY base whose own branch has no other hook: the entry must
# reach it although it is not in the primary base's chain at all.
class Only:
    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        cls.only = True


class Plain:
    pass


class Secondary(Plain, Only):
    pass


r['secondary_base_hook'] = Secondary.only


# --- storing a class attribute from inside a hook ---------------------------
#
# The receiver of an __init_subclass__ (and of a classmethod) is a CLASS, so an
# attribute store from one cannot take the instance fast path.

class Counter:
    count = 0

    @classmethod
    def bump(cls):
        cls.count += 1
        return cls.count


r['classmethod_augmented'] = [Counter.bump(), Counter.bump()]


class AugBase:
    reg = ()

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        cls.reg += ('x',)


class AugSub(AugBase):
    pass


r['hook_augmented'] = AugSub.reg


class Inst:
    def __init__(self):
        self.n = 0

    def inc(self):
        self.n += 1
        return self.n


r['instance_augmented'] = Inst().inc()


# An augmented store must go through a property setter rather than past it.
class Prop:
    def __init__(self):
        self._v = 0
        self.seen = []

    @property
    def v(self):
        return self._v

    @v.setter
    def v(self, value):
        self.seen.append(value)
        self._v = value


_p = Prop()
_p.v += 5
r['property_setter_saw'] = _p.seen


# --- what type(name, bases, ns) runs ----------------------------------------


class HookBase:
    def __init_subclass__(cls, **kwargs):
        cls.seen = sorted(kwargs.items())


r['type_runs_init_subclass'] = type('T1', (HookBase,), {}).seen
r['type_forwards_keywords'] = type('T2', (HookBase,), {}, b=2, a=1).seen


class Named:
    def __set_name__(self, owner, name):
        self.owner_name = owner.__name__
        self.name = name


_T3 = type('T3', (), {'d': Named()})
r['type_runs_set_name'] = [_T3.d.name, _T3.d.owner_name]


class Stmt:
    d = Named()


r['statement_runs_set_name'] = [Stmt.d.name, Stmt.d.owner_name]


def outcome(fn):
    try:
        return 'ok -> ' + repr(fn())
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


class NoKw:
    def __init_subclass__(cls):
        pass


r['type_keyword_refused_by_hook'] = outcome(
    lambda: type('T4', (NoKw,), {}, x=1))


# --- types.new_class forwards its class keywords ----------------------------


class MyMeta(type):
    pass


r['new_class_refuses_bad_keyword'] = outcome(
    lambda: types.new_class(
        "MyClass", (object,), dict(metaclass=MyMeta, otherarg=1)))
# prepare_class never calls the metaclass, so the SAME arguments are fine here.
# The asymmetry is the point: test_subclassinit asserts both halves.
r['prepare_class_allows_it'] = outcome(
    lambda: types.prepare_class(
        "MyClass", (object,), dict(metaclass=MyMeta, otherarg=1))[2])
r['new_class_plain'] = outcome(
    lambda: types.new_class("Plain2", (HookBase,), {}).seen)
r['new_class_with_body'] = outcome(
    lambda: types.new_class(
        "Bodied", (), {}, lambda ns: ns.update(k=9)).k)


# --- controls ---------------------------------------------------------------
#
# The ordinary single-base chain, which the MRO walk must leave exactly alone.

class SingleA:
    def __init_subclass__(cls, **kwargs):
        LOG.append('SingleA')
        super().__init_subclass__(**kwargs)


class SingleB(SingleA):
    def __init_subclass__(cls, **kwargs):
        LOG.append('SingleB')
        super().__init_subclass__(**kwargs)


del LOG[:]


class SingleC(SingleB):
    pass


r['single_chain_order'] = list(LOG)


del LOG[:]


class SingleD(SingleA):
    pass


r['single_chain_one_hook'] = list(LOG)


# A class's own hook never runs for itself.
class SelfHook:
    ran = False

    def __init_subclass__(cls, **kwargs):
        cls.ran = True


r['own_hook_not_run_for_itself'] = SelfHook.ran

# An unacceptable keyword still reaches object's terminator and is refused.
r['stray_keyword_still_refused'] = outcome(
    lambda: type('T5', (), {}, nosuch=1))


EXPECTED = {
    'diamond_mro': ['A', 'Left', 'Middle', 'Right', 'Base', 'object'],
    'diamond_chain_order': ['Middle', 'Right', 'Base'],
    'diamond_calls': ['right', 'middle'],
    'diamond_left_untouched': [],
    'diamond_right_untouched': [],
    'two_base_chain_order': ['Base', 'Middle'],
    'secondary_base_hook': True,
    'classmethod_augmented': [1, 2],
    'hook_augmented': ('x',),
    'instance_augmented': 1,
    'property_setter_saw': [5],
    'type_runs_init_subclass': [],
    'type_forwards_keywords': [('a', 1), ('b', 2)],
    'type_runs_set_name': ['d', 'T3'],
    'statement_runs_set_name': ['d', 'Stmt'],
    'type_keyword_refused_by_hook':
        "TypeError: NoKw.__init_subclass__() got an unexpected keyword argument 'x'",
    'new_class_refuses_bad_keyword':
        "TypeError: MyClass.__init_subclass__() takes no keyword arguments",
    'prepare_class_allows_it': "ok -> {'otherarg': 1}",
    'new_class_plain': 'ok -> []',
    'new_class_with_body': 'ok -> 9',
    'single_chain_order': ['SingleB', 'SingleA'],
    'single_chain_one_hook': ['SingleA'],
    'own_hook_not_run_for_itself': False,
    'stray_keyword_still_refused':
        "TypeError: T5.__init_subclass__() takes no keyword arguments",
}

_disagreeing = sorted(k for k, v in EXPECTED.items() if r.get(k) != v)

SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(_disagreeing), _disagreeing,
    sorted(r) == sorted(EXPECTED))

if __name__ == '__main__':
    for key in sorted(EXPECTED):
        got = r.get(key)
        want = EXPECTED[key]
        print('%-34s %-5s got=%r want=%r' % (
            key, 'OK' if got == want else 'FAIL', got, want))
    print(SUMMARY)
