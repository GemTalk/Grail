"""random's argument handling and subclassing agree with CPython.

* ``choices(data, k=...)`` and ``itertools.repeat(x, times)`` take ``times`` as
  CPython's Py_ssize_t (Modules/itertoolsmodule.c): an ``__index__`` object
  works, a float is "'float' object cannot be interpreted as an integer", a
  count past 2**63 is OverflowError.  Grail's repeat said "an integer is
  required" for both.
* ``Random.getrandbits(k)`` converts k as a uint64_t (Modules/_randommodule.c):
  through ``__index__``, a negative one "Cannot convert negative int", one past
  2**64 "Python int too large for C uint64_t".  ``randbytes(n)`` is
  ``getrandbits(n * 8)``, so ``randbytes(1 << 1000)`` was an uncatchable
  Smalltalk error that ended the process.
* ``os.urandom(n)`` takes a Py_ssize_t: ``SystemRandom().randbytes(1 << 1000)``
  ended the process too.
* ``class S(Mixin, random.Random)`` extends random.Random's state, CPython's
  solid base, so random.Random's methods run on it.

Self-running: ``python3 random_conformance.py`` prints one line per check
against what CPython 3.14 answers.
"""

import itertools
import os
import random


class MyIndex:
    def __init__(self, value):
        self.value = value

    def __index__(self):
        return self.value


class RandomMixin:
    def random(self):
        return random.Random.random(self)


class GetrandbitsMixin:
    def getrandbits(self, n):
        return random.Random.getrandbits(self, n)


class MixedRandom(RandomMixin, random.Random):
    pass


class MixedGetrandbits(GetrandbitsMixin, random.Random):
    pass


def _outcome(action):
    try:
        return "ok -> %r" % (action(),)
    except Exception as e:
        return "%s: %s" % (type(e).__name__, e)


DATA = ['red', 'green', 'blue', 'yellow']
mt = random.Random(1234567)
system = random.SystemRandom()

r = {
    "repeat_times_is_an_index": (_outcome(lambda: list(itertools.repeat('x', MyIndex(2)))),
                                 _outcome(lambda: list(itertools.repeat('x', 2.5))),
                                 _outcome(lambda: list(itertools.repeat('x', -3))),
                                 _outcome(lambda: list(itertools.repeat('x', 1 << 63))),
                                 _outcome(lambda: list(itertools.repeat('x', None)))),
    "repeat_without_times_is_endless": list(itertools.islice(itertools.repeat('x'), 3)),
    "choices_k_is_an_index": (_outcome(lambda: len(mt.choices(DATA, k=MyIndex(5)))),
                              _outcome(lambda: mt.choices(DATA, k=2.5)),
                              _outcome(lambda: len(system.choices(DATA, k=MyIndex(3))))),
    "getrandbits_converts_a_uint64": (_outcome(lambda: mt.getrandbits(MyIndex(10)) < 1024),
                                      _outcome(lambda: mt.getrandbits(-1)),
                                      _outcome(lambda: mt.getrandbits(1 << 64)),
                                      _outcome(lambda: mt.getrandbits(2.0))),
    "getrandbits_is_repeatable": (random.Random(1234567).getrandbits(100),
                                  random.Random(1234567).getrandbits(MyIndex(100))),
    "randbytes_inherits_the_conversion": (_outcome(lambda: mt.randbytes(-1)),
                                          _outcome(lambda: mt.randbytes(1 << 1000)),
                                          _outcome(lambda: mt.randbytes(-1 << 1000)),
                                          _outcome(lambda: mt.randbytes(1.0)),
                                          len(mt.randbytes(7)), mt.randbytes(0)),
    "urandom_takes_a_ssize_t": (_outcome(lambda: os.urandom(1 << 1000)),
                                _outcome(lambda: os.urandom(-1 << 1000)),
                                _outcome(lambda: os.urandom(-1)),
                                len(os.urandom(5))),
    "systemrandom_randbytes": (_outcome(lambda: system.randbytes(1 << 1000)),
                               _outcome(lambda: system.randbytes(-1)),
                               len(system.randbytes(4))),
    "a_mixin_before_random_random": (MixedRandom(5).randrange(42) < 42,
                                     MixedGetrandbits(5).randrange(42) < 42,
                                     isinstance(MixedRandom(5).random(), float),
                                     MixedRandom(7).getstate() == random.Random(7).getstate()),
}

EXPECTED = {
    'a_mixin_before_random_random': (True, True, True, True),
    'choices_k_is_an_index': ('ok -> 5', "TypeError: 'float' object cannot be interpreted as an integer", 'ok -> 3'),
    'getrandbits_converts_a_uint64': ('ok -> True', 'ValueError: Cannot convert negative int',
                                      'OverflowError: Python int too large for C uint64_t',
                                      "TypeError: 'float' object cannot be interpreted as an integer"),
    'getrandbits_is_repeatable': (97904845777343510404718956115, 97904845777343510404718956115),
    'randbytes_inherits_the_conversion': ('ValueError: Cannot convert negative int',
                                          'OverflowError: Python int too large for C uint64_t',
                                          'ValueError: Cannot convert negative int',
                                          "TypeError: 'float' object cannot be interpreted as an integer",
                                          7, b''),
    'repeat_times_is_an_index': ("ok -> ['x', 'x']", "TypeError: 'float' object cannot be interpreted as an integer",
                                 'ok -> []', 'OverflowError: Python int too large to convert to C ssize_t',
                                 "TypeError: 'NoneType' object cannot be interpreted as an integer"),
    'repeat_without_times_is_endless': ['x', 'x', 'x'],
    'systemrandom_randbytes': ('OverflowError: Python int too large to convert to C ssize_t',
                               'ValueError: negative argument not allowed', 4),
    'urandom_takes_a_ssize_t': ('OverflowError: Python int too large to convert to C ssize_t',
                                'OverflowError: Python int too large to convert to C ssize_t',
                                'ValueError: negative argument not allowed', 5),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-36s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    print(SUMMARY)
