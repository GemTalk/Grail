"""Fixture: super()'s explicit first argument reads a local before a module global of that name.

``super(D, d)`` reads D by the ordinary rules, so a class D local to the
function is that class, whatever the module binds under the same name.
Grail compiled a first argument the module knows as a read of the module's
attribute -- and a ``global D`` in any other function is enough for the
module to know it -- so ``super(D, D)`` read the module's unbound D, None,
and raised ``super() argument 1 must be a type, not NoneType`` (test_descr
test_classmethods, beside test_pickle_slots' ``global D``).  The method
super() answers also had no __self__: the object, or for a classmethod
reached through an instance, its class.  Every check
here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(compute):
    try:
        return compute()
    except Exception as exc:
        return (type(exc).__name__, str(exc))


class Base:
    @classmethod
    def who(cls):
        return cls.__name__

    def name(self):
        return 'base'


class Holder:
    def local_class(self):
        class D(Base):
            pass
        return [super(D, D).who(), super(D, D()).name(), super(D, D).who.__self__ is D]

    def local_parameter(self, D, obj):
        return super(D, obj).name()

    def declares_the_global(self):
        global D
        D = 'module D'


def in_a_function():
    class D(Base):
        def name(self):
            return 'D'
    return super(D, D()).name()


class ModuleLevel(Base):
    def name(self):
        return super(ModuleLevel, self).name()


r['a_local_class'] = outcome(lambda: Holder().local_class())
r['a_function'] = outcome(in_a_function)
r['a_module_level_class'] = outcome(lambda: ModuleLevel().name())
r['the_module_global_is_untouched'] = outcome(lambda: (Holder().declares_the_global(), D)[1])


class Sub(Base):
    pass


def bound_self():
    sub = Sub()
    return [super(Sub, Sub).who.__self__ is Sub, super(Sub, sub).who.__self__ is Sub,
            super(Sub, sub).name.__self__ is sub]


r['a_parameter'] = outcome(lambda: Holder().local_parameter(Sub, Sub()))
r['what_the_method_is_bound_to'] = outcome(bound_self)

EXPECTED = {
    'a_local_class': ['D', 'base', True],
    'a_parameter': 'base',
    'a_function': 'base',
    'a_module_level_class': 'base',
    'the_module_global_is_untouched': 'module D',
    'what_the_method_is_bound_to': [True, True, True],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        ok = r[key] == EXPECTED[key]
        print('%-32s %s' % (key, 'OK' if ok else 'FAIL'))
        if not ok:
            print('    got  %r' % (r[key],))
            print('    want %r' % (EXPECTED[key],))
    print(SUMMARY)
