"""Fixtures for ``random'': CPython's random.py over a native _random.

Driven by PythonTests>>RandomTestCase.  Each check answers True when the
behaviour matches CPython.

Grail's ``random'' used to be a hand-written Smalltalk module over GemStone's
own generator.  It had the module-level functions and nothing else:

    random.Random(42)         AttributeError: module 'random' has no attribute 'Random'
    random.SystemRandom()     the same
    random.getstate()         NotImplementedError

and a seed reproduced GemStone's sequence, not CPython's.  Now ``random'' is
CPython's random.py, vendored, and ``_random'' is MT19937 transcribed from
Modules/_randommodule.c -- so the same seed gives the same numbers as CPython,
which is what the SEQUENCE checks below pin, value for value.

test_statistics' NormalDist.samples(n, seed=...) is the case that found it.

Run this file under CPython (``python3 tests/python/random_cpython_sequences.py'')
to see what it produces -- that is where the expectations come from.
"""

import random


def an_int_seed_reproduces_cpythons_sequence():
    random.seed(12345)
    return [random.random() for _ in range(3)] == [
        0.41661987254534116, 0.010169169457068361, 0.8252065092537432]


def getrandbits_and_the_integer_helpers_follow_the_same_stream():
    random.seed(12345)
    return (random.getrandbits(100) == 1030771796917419777846831192455
            and random.randrange(1000) == 845
            and random.randint(1, 6) == 3)


def a_str_seed_is_hashed_as_cpython_hashes_it():
    return random.Random('happiness and joy').random() == 0.13602599348907074


def a_bytes_seed_is_hashed_as_cpython_hashes_it():
    return random.Random(b'bytes seed').random() == 0.7731514366044835


def a_seed_wider_than_one_word_uses_every_word():
    return random.Random(2 ** 70 + 3).getrandbits(32) == 701776502


def a_negative_seed_is_its_absolute_value():
    return random.Random(-7).random() == random.Random(7).random()


def seed_zero_is_cpythons():
    return random.Random(0).random() == 0.8444218515250481


def choice_sample_and_uniform_follow_cpython():
    r = random.Random(12345)
    return (r.choice('abcdefg') == 'd'
            and r.sample(range(100), 3) == [93, 1, 38]
            and r.uniform(1, 2) == 1.855138341847149)


def shuffle_follows_cpython():
    r = random.Random(12345)
    x = [1, 2, 3, 4, 5, 6]
    r.shuffle(x)
    return x == [6, 5, 2, 3, 1, 4]


def gauss_and_normalvariate_follow_cpython():
    r = random.Random(12345)
    return (r.gauss(0, 1) == -0.12380079558885389
            and r.normalvariate(0, 1) == 0.7954555184238031)


def getstate_and_setstate_round_trip():
    r = random.Random(99)
    r.random()
    state = r.getstate()
    first = [r.random() for _ in range(5)]
    r.setstate(state)
    return [r.random() for _ in range(5)] == first


def a_generator_is_independent_of_the_module():
    a = random.Random(5)
    b = random.Random(5)
    random.random()
    return a.random() == b.random()


def random_is_in_the_unit_interval():
    r = random.Random()
    return all(0.0 <= r.random() < 1.0 for _ in range(1000))


def system_random_draws_and_refuses_state():
    s = random.SystemRandom()
    x = s.random()
    try:
        s.getstate()
    except NotImplementedError:
        return 0.0 <= x < 1.0 and 0 <= s.randrange(10) < 10
    return False


def a_subclass_can_supply_its_own_random():
    class Fixed(random.Random):
        def random(self):
            return 0.5
    r = Fixed(1)
    return r.random() == 0.5 and r.randrange(10) in range(10)


def getrandbits_refuses_a_negative_count():
    try:
        random.getrandbits(-1)
    except ValueError:
        return random.getrandbits(0) == 0
    return False


def setstate_validates_the_state():
    r = random.Random(1)
    version, internal, gauss = r.getstate()
    try:
        r.setstate((version, internal[:-1], gauss))
    except ValueError:
        return True
    return False


def the_module_functions_follow_cpython():
    """random.randrange & co. are bound to native transcriptions on _inst --
    the same code, so the same numbers as the Python methods."""
    random.seed(777)
    drawn = [random.randrange(100), random.randrange(5, 50),
             random.randrange(0, 100, 7), random.randrange(100, 0, -3),
             random.randint(-5, 5), random.choice('abcdefghij'),
             random.uniform(1, 3)]
    x = list(range(10))
    random.shuffle(x)
    return (drawn == [29, 33, 49, 31, 4, 'e', 2.6627374937555737]
            and x == [9, 1, 2, 3, 6, 4, 5, 7, 0, 8])


def the_module_functions_raise_as_cpython_does():
    calls = [lambda: random.randrange(0), lambda: random.randrange(5, 5),
             lambda: random.randrange(0, 10, 0), lambda: random.randrange(10, 0, 2),
             lambda: random.randrange(1.5), lambda: random.randrange(10, None, 2),
             lambda: random.randint(5, 1), lambda: random.choice([])]
    raised = []
    for call in calls:
        try:
            call()
        except Exception as e:
            raised.append((type(e).__name__, str(e)))
    return raised == [
        ('ValueError', 'empty range for randrange()'),
        ('ValueError', 'empty range in randrange(5, 5)'),
        ('ValueError', 'zero step for randrange()'),
        ('ValueError', 'empty range in randrange(10, 0, 2)'),
        ('TypeError', "'float' object cannot be interpreted as an integer"),
        ('TypeError', 'Missing a non-None stop argument'),
        ('ValueError', 'empty range in randint(5, 1)'),
        ('IndexError', 'Cannot choose from an empty sequence')]


CHECKS = (
    an_int_seed_reproduces_cpythons_sequence,
    getrandbits_and_the_integer_helpers_follow_the_same_stream,
    a_str_seed_is_hashed_as_cpython_hashes_it,
    a_bytes_seed_is_hashed_as_cpython_hashes_it,
    a_seed_wider_than_one_word_uses_every_word,
    a_negative_seed_is_its_absolute_value,
    seed_zero_is_cpythons,
    choice_sample_and_uniform_follow_cpython,
    shuffle_follows_cpython,
    gauss_and_normalvariate_follow_cpython,
    getstate_and_setstate_round_trip,
    a_generator_is_independent_of_the_module,
    random_is_in_the_unit_interval,
    system_random_draws_and_refuses_state,
    a_subclass_can_supply_its_own_random,
    getrandbits_refuses_a_negative_count,
    setstate_validates_the_state,
    the_module_functions_follow_cpython,
    the_module_functions_raise_as_cpython_does,
)


if __name__ == '__main__':
    for check in CHECKS:
        print('%-4s %s' % ('OK' if check() is True else 'FAIL', check.__name__))
