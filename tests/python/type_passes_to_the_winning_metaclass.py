"""Fixture: type(name, bases, ns) passes the call to the winning metaclass.

type_new_get_bases (Objects/typeobject.c) computes the most derived
metaclass of the bases; when that is not ``type'' and has a __new__ of its
own, the call is that metaclass's: its __new__ builds the class, and
type_call then runs the class's metaclass __init__ with the same
arguments, class keywords included.  A metaclass with only an __init__
still has it run.

Grail built a class of the bases' metaclass without running either, so
``type('SouthPonies', (Model,), {})'' did not raise the RuntimeWarning the
metaclass's __new__ raises (test_types
ClassCreationTests.test_metaclass_new_error).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}
events = []


class ModelBase(type):
    def __new__(cls, name, bases, attrs, **kwds):
        events.append(('new', cls.__name__, name, sorted(attrs), kwds))
        if name == 'SouthPonies':
            raise RuntimeWarning('name=%r' % name)
        return super().__new__(cls, name, bases, attrs)

    def __init__(cls, name, bases, attrs, **kwds):
        events.append(('init', name, kwds))


class Model(metaclass=ModelBase):
    pass


class InitOnly(type):
    def __init__(cls, name, bases, attrs):
        events.append(('init only', name))


class Initialized(metaclass=InitOnly):
    pass


class Plain(type):
    pass


class Unconstructed(metaclass=Plain):
    pass


class Mixin:
    pass


def built(name, bases, namespace, **kwds):
    del events[:]
    try:
        cls = type(name, bases, namespace, **kwds)
    except RuntimeWarning as e:
        return ['RuntimeWarning: %s' % e] + events
    return [type(cls).__name__] + events


def a_literal_call():
    """``type(...)'' with three positionals and nothing else, the spelling
    test_metaclass_new_error uses: it compiles to its own fast path."""
    del events[:]
    try:
        type('SouthPonies', (Model,), {})
    except RuntimeWarning as e:
        return ['RuntimeWarning: %s' % e] + events
    return ['built'] + events


r['new_and_init_run'] = built('T', (Model,), {'x': 1})
r['class_keywords_reach_both'] = built('K', (Model,), {}, flag=True)
r['a_raising_new_raises'] = built('SouthPonies', (Model,), {})
r['an_init_only_metaclass_runs'] = built('J', (Initialized,), {})
r['a_metaclass_overriding_nothing'] = built('U', (Unconstructed,), {})
r['the_winner_from_a_later_base'] = built('L', (Mixin, Model), {})
r['a_literal_call_passes_too'] = a_literal_call()

del events[:]
ModelBase('D', (Model,), {})
r['a_direct_metaclass_call_runs_once'] = list(events)

EXPECTED = {
    'new_and_init_run': [
        'ModelBase', ('new', 'ModelBase', 'T', ['x'], {}), ('init', 'T', {})],
    'class_keywords_reach_both': [
        'ModelBase', ('new', 'ModelBase', 'K', [], {'flag': True}),
        ('init', 'K', {'flag': True})],
    'a_raising_new_raises': [
        "RuntimeWarning: name='SouthPonies'",
        ('new', 'ModelBase', 'SouthPonies', [], {})],
    'an_init_only_metaclass_runs': ['InitOnly', ('init only', 'J')],
    'a_metaclass_overriding_nothing': ['Plain'],
    'the_winner_from_a_later_base': [
        'ModelBase', ('new', 'ModelBase', 'L', [], {}), ('init', 'L', {})],
    'a_literal_call_passes_too': [
        "RuntimeWarning: name='SouthPonies'",
        ('new', 'ModelBase', 'SouthPonies', [], {})],
    'a_direct_metaclass_call_runs_once': [
        ('new', 'ModelBase', 'D', [], {}), ('init', 'D', {})],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-34s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
