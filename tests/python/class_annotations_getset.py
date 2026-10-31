"""Fixture: a class's ``__annotations__`` and ``__annotate__`` behave as type's
getsets do in CPython 3.14 (Objects/typeobject.c).

  * the computed dict is cached in ``__annotations_cache__``, which a
    ``del Cls.__annotations__`` removes -- Grail had no delete at all, so it
    raised AttributeError whatever the class held;
  * an assignment goes to that cache, not to an ``__annotations__`` entry,
    and takes the annotate functions with it;
  * a class body's own ``__annotate__`` -- assigned or defined -- is what
    ``Cls.__annotations__`` calls; Grail called the generated one past it;
  * ``Cls.__annotate__ = None`` keeps the cache, a new callable drops it;
  * a metaclass that defines ``__annotations__`` itself is what answers for
    its classes, as a data descriptor there outranks type's getset.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import annotationlib

r = {}


def outcome(thunk):
    try:
        return thunk()
    except (AttributeError, TypeError, ValueError) as e:
        return '%s: %s' % (type(e).__name__, e)


def delete(cls):
    def run():
        del cls.__annotations__
    return outcome(run)


made = type('Made', (), {})
before = '__annotations_cache__' in made.__dict__
computed = made.__annotations__
r['lazy_cache'] = [before, computed, made.__dict__['__annotations_cache__'] is computed]
r['lazy_delete'] = [delete(made), '__annotations_cache__' in made.__dict__, delete(made)]


class Annotated:
    a: int = 3
    b: str = 4


r['annotated'] = [Annotated.__annotations__, '__annotations_cache__' in Annotated.__dict__]
r['annotated_delete'] = [delete(Annotated), '__annotations_cache__' in Annotated.__dict__,
                         Annotated.__annotate__, Annotated.__annotations__]

target = type('Target', (), {})
target.__annotations__ = {'a': int}
r['assigned'] = ['__annotations_cache__' in target.__dict__, '__annotations__' in target.__dict__,
                 target.__annotations__]


class Explicit:
    __annotations__ = {'kept': int}


Explicit.__annotations__ = {'replaced': str}
r['assigned_over_explicit'] = [Explicit.__annotations__, '__annotations_cache__' in Explicit.__dict__]
r['explicit_delete'] = [delete(Explicit), delete(Explicit)]


class Reassigned:
    x: int


cached = Reassigned.__annotations__
Reassigned.__annotate__ = None
r['annotate_none_keeps_cache'] = Reassigned.__annotations__ is cached
Reassigned.__annotate__ = lambda format: {'y': format}
r['annotate_callable_drops_cache'] = Reassigned.__annotations__
Reassigned.__annotations__ = {'z': 3}
r['assigning_annotations_drops_annotate'] = Reassigned.__annotate__


class BodyAssigned:
    __annotate__ = lambda format: {'what': int}


r['body_assigned_annotate'] = [BodyAssigned.__annotations__,
                               type(BodyAssigned.__annotate__).__name__]


class BodyDefined:
    a: int

    def __annotate__(format):
        return {'a': str}


r['body_defined_annotate'] = [BodyDefined.__annotate__(1), annotationlib.get_annotations(BodyDefined),
                              BodyDefined.__annotations__]


class PropertyMeta(type):
    @property
    def __annotations__(cls):
        return 'from the metaclass'


class Governed(metaclass=PropertyMeta):
    x: int


r['metaclass_property'] = Governed.__annotations__


class Holder:
    """A metaclass that is no type, as test_descriptor_still_works has it; it
    reads ``held`` with a default, as that test does, so whether __init__ ran
    is not what is checked here."""

    def __init__(self, name=None, bases=None, namespace=None):
        pass

    @property
    def __annotations__(self):
        held = getattr(self, 'held', None)
        return held if isinstance(held, dict) else {}

    @__annotations__.setter
    def __annotations__(self, value):
        if not isinstance(value, dict):
            raise ValueError('a dict, please')
        self.held = value

    @__annotations__.deleter
    def __annotations__(self):
        if getattr(self, 'held', None) is None:
            raise AttributeError('__annotations__')
        self.held = None


class Held(metaclass=Holder):
    pass


steps = [Held.__annotations__]
Held.__annotations__ = {'a': 'int'}
steps.append(Held.__annotations__)


def store_non_dict():
    Held.__annotations__ = 123


steps.extend([outcome(store_non_dict), delete(Held), delete(Held), Held.__annotations__])
r['non_type_metaclass_property'] = steps


def store_on_builtin():
    float.__annotations__ = {}


r['builtin'] = [outcome(lambda: float.__annotations__), outcome(store_on_builtin), delete(float)]

EXPECTED = {
    'lazy_cache': [False, {}, True],
    'lazy_delete': [None, False, 'AttributeError: __annotations__'],
    'annotated': [{'a': int, 'b': str}, True],
    'annotated_delete': [None, False, None, {}],
    'assigned': [True, False, {'a': int}],
    'assigned_over_explicit': [{'replaced': str}, False],
    'explicit_delete': [None, 'AttributeError: __annotations__'],
    'annotate_none_keeps_cache': True,
    'annotate_callable_drops_cache': {'y': 1},
    'assigning_annotations_drops_annotate': None,
    'body_assigned_annotate': [{'what': int}, 'function'],
    'body_defined_annotate': [{'a': str}, {'a': str}, {'a': str}],
    'metaclass_property': 'from the metaclass',
    'non_type_metaclass_property': [{}, {'a': 'int'}, 'ValueError: a dict, please', None,
                                    'AttributeError: __annotations__', {}],
    'builtin': ["AttributeError: type object 'float' has no attribute '__annotations__'",
                "TypeError: cannot set '__annotations__' attribute of immutable type 'float'",
                "TypeError: cannot set '__annotations__' attribute of immutable type 'float'"],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        ok = r.get(key, '<missing>') == EXPECTED[key]
        print('%-37s %s' % (key, 'OK' if ok else 'FAIL'))
        if not ok:
            print('    got  %r' % (r.get(key, '<missing>'),))
            print('    want %r' % (EXPECTED[key],))
    print(SUMMARY)
