"""Fixture: a metaclass's ``mro()'' hook.

``mro()'' is not an observer.  CPython calls it from inside ``type.__new__''
and the list it RETURNS becomes the class's ``__mro__'' -- which is why the
usual override ends in ``return super().mro()'', and why one that returns
something else genuinely changes attribute lookup and ``issubclass''.

Grail never called it.  It also derives the linearization on demand rather than
storing one, so honouring the hook means recording what it answered and having
the single derivation site (importlib >> ___mroOf___:) prefer that.

TWO SEPARATE GAPS had to close, and the second is easy to miss because the
first hides it.  ``super().mro()'' -- the way essentially every real override
delegates -- raised ``'super' object has no attribute 'mro'''.  Grail's ``type''
is not a Python class with a method dictionary: its behaviour lives on
Smalltalk's Behavior, which a CLASS answers directly, so ``A.mro()'' had always
worked while the super() spelling had not.

``called_for_every_class_in_the_chain'' is the one that says the hook is wired
into class creation rather than into one class statement: a subclass of a class
whose metaclass overrides mro() gets its own call, with its own class, and its
own linearization.

``custom_mro_takes_effect'' is the one that says the RETURN VALUE is honoured
rather than merely computed.  A hook that ran and had its answer discarded would
pass the logging checks and fail this.

test_super's test___class___mro is the upstream case, and it needs a third
thing besides those two: ``self.__dict__['f']()'' calls a ZERO-PARAMETER
function, which Python 3 allows off a class and Grail refused until recently.
``zero_param_from_dict'' pins that combination here.
"""


class Extra:
    marker = 'extra'


def hook_is_called():
    log = []

    class Meta(type):
        def mro(cls):
            log.append(cls.__name__)
            return super().mro()

    class A(metaclass=Meta):
        pass

    return [log, A.__mro__[0] is A]


def called_for_every_class_in_the_chain():
    log = []

    class Meta(type):
        def mro(cls):
            log.append(cls.__name__)
            return super().mro()

    class A(metaclass=Meta):
        pass

    class B(A):
        pass

    # Each class gets its OWN call and its OWN linearization -- B's must start
    # with B, not with A's recorded answer.
    return [log, [c.__name__ for c in B.__mro__][:2]]


def custom_mro_takes_effect():
    # The hook's RETURN VALUE is the linearization, so splicing a class into it
    # is visible to __mro__, to mro(), and to issubclass.
    class Meta(type):
        def mro(cls):
            base = super().mro()
            return base[:1] + [Extra] + base[1:]

    class A(metaclass=Meta):
        pass

    return [Extra in A.__mro__,
            [c.__name__ for c in A.mro()][:2],
            issubclass(A, Extra)]


def zero_param_from_dict():
    # test_super's shape: mro() reaches a zero-parameter function through the
    # class __dict__ and calls it with nothing, and that function reads
    # ``__class__'' -- which must already be the class under construction.
    seen = []

    class Meta(type):
        def mro(cls):
            cls.__dict__["f"]()
            return super().mro()

    class A(metaclass=Meta):
        def f():
            nonlocal seen
            seen.append(__class__)

    return [len(seen), seen[0] is A]


def a_metaclass_without_mro_is_untouched():
    # The guard.  Grail's ``mro'' lives on Behavior, so an unguarded probe would
    # find one for every metaclass alive and put a hook call on every
    # metaclass-governed class in the corpus.  Only an mro written in PYTHON
    # counts.
    log = []

    class Quiet(type):
        def __new__(mcls, name, bases, ns):
            log.append('new')
            return super().__new__(mcls, name, bases, ns)

    class A(metaclass=Quiet):
        pass

    return [log, A.__mro__[0] is A]


r = {
    'hook_is_called': hook_is_called(),
    'called_for_every_class_in_the_chain': called_for_every_class_in_the_chain(),
    'custom_mro_takes_effect': custom_mro_takes_effect(),
    'zero_param_from_dict': zero_param_from_dict(),
    'a_metaclass_without_mro_is_untouched': a_metaclass_without_mro_is_untouched(),
}


EXPECTED = {
    'hook_is_called': [['A'], True],
    'called_for_every_class_in_the_chain': [['A', 'B'], ['B', 'A']],
    'custom_mro_takes_effect': [True, ['A', 'Extra'], True],
    'zero_param_from_dict': [1, True],
    'a_metaclass_without_mro_is_untouched': [['new'], True],
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-38s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-38s is not in EXPECTED' % ('FAIL', extra))
