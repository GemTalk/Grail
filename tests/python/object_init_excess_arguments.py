"""Fixture: object.__init__ refuses the arguments it would have to drop.

CPython's object_init (Objects/typeobject.c:6832-6849) accepts excess
arguments only for a class that overrides __new__ but not __init__, where
__new__ consumed them.  A class with an __init__ of its own forwards them by
mistake -- ``object.__init__() takes exactly one argument (the instance to
initialize)`` -- and one with neither is named in the message.  Grail let a
def'd __init__ pass arguments to object silently, and named the class with the
message object_new uses for ``C(42)`` (test_descr test_object_new and
test_object_new_and_init_with_parameters).  Cooperative ``super().__init__``
through a multiple-inheritance MRO still reaches the next base.  Every check
here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


class Neither:
    pass


class OwnInit:
    def __init__(self, foo):
        self.foo = foo


class OwnNew:
    def __new__(cls, foo):
        return object.__new__(cls)


class OwnBoth:
    def __new__(cls, foo):
        return object.__new__(cls)

    def __init__(self, foo):
        self.foo = foo


class ForwardsToObject:
    def __init__(self, foo, kw=0, *args, **kwargs):
        object.__init__(self, *args, **kwargs)


class Base:
    def __init__(self, value):
        self.value = value


class Mixin:
    def __init__(self, *args, **kwargs):
        self.mixed = True
        super().__init__(*args, **kwargs)


class Combined(Mixin, Base):
    pass


def refusal(thunk):
    try:
        thunk()
    except TypeError as exc:
        return str(exc)
    return 'accepted'


r['neither'] = [refusal(lambda: object.__init__(Neither(), 5)),
                refusal(lambda: Neither(5)),
                refusal(lambda: object.__init__(Neither()))]
r['own_init'] = [refusal(lambda: object.__init__(OwnInit(3), 5)),
                 refusal(lambda: object.__init__(OwnInit(3)))]
r['own_new'] = [refusal(lambda: object.__init__(OwnNew(3), 5))]
r['own_both'] = [refusal(lambda: object.__init__(OwnBoth(3), 5))]
r['forwarding_init'] = [refusal(lambda: ForwardsToObject(1)),
                        refusal(lambda: ForwardsToObject(1, kw=2)),
                        refusal(lambda: ForwardsToObject(1, 2, 3)),
                        refusal(lambda: ForwardsToObject(1, 2, foo=3))]
combined = Combined(7)
r['cooperative_super'] = [combined.value, combined.mixed]

TOO_MANY = 'object.__init__() takes exactly one argument (the instance to initialize)'
EXPECTED = {
    'neither': ['Neither.__init__() takes exactly one argument (the instance to initialize)',
                'Neither() takes no arguments', 'accepted'],
    'own_init': [TOO_MANY, 'accepted'],
    'own_new': ['accepted'],
    'own_both': [TOO_MANY],
    'forwarding_init': ['accepted', 'accepted', TOO_MANY,
                        "ForwardsToObject.__init__() got multiple values for argument 'foo'"],
    'cooperative_super': [7, True],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        ok = r[key] == EXPECTED[key]
        print('%-18s %s' % (key, 'OK' if ok else 'FAIL'))
        if not ok:
            print('    got  %r' % (r[key],))
            print('    want %r' % (EXPECTED[key],))
    print(SUMMARY)
