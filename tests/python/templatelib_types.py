"""Fixture: string.templatelib's types are the final types CPython builds.

CPython implements Template, Interpolation and the template iterator in C
(Objects/templateobject.c, Objects/interpolationobject.c), none of them with
Py_TPFLAGS_BASETYPE, so none can be subclassed; Template and Interpolation
are both generic (``__class_getitem__`` is Py_GenericAlias).  Grail defines
them in Python (src/python/stdlib/string/templatelib.py), where:

* all three could be subclassed (test_templatelib test_final_types,
  test_final);
* ``Interpolation[int]`` raised ``type 'Interpolation' is not subscriptable``
  (test_genericalias test_subscriptable, test_weakref);
* ``iter(template)`` answered a list_iterator, not a TemplateIter.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

from string.templatelib import Template, Interpolation

r = {}


def outcome(thunk):
    try:
        return thunk()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def subclass_of(base):
    class Sub(base):
        pass
    return Sub


TemplateIter = type(iter(t''))

# --- none of the three can be subclassed -------------------------------------
r['template_is_final'] = outcome(lambda: subclass_of(Template))
r['interpolation_is_final'] = outcome(lambda: subclass_of(Interpolation))
r['template_iter_is_final'] = outcome(lambda: subclass_of(TemplateIter))

# --- both are generic --------------------------------------------------------
r['interpolation_alias'] = outcome(lambda: [repr(Interpolation[int]), Interpolation[int].__origin__ is Interpolation,
                                            Interpolation[int].__args__])
r['template_alias'] = outcome(lambda: [repr(Template[str]), Template[str].__origin__ is Template])

# --- iter(template) is a TemplateIter ----------------------------------------
r['template_iter_type'] = outcome(lambda: [TemplateIter.__name__, TemplateIter.__qualname__,
                                           TemplateIter.__module__, repr(TemplateIter)])
r['template_iter_not_created_directly'] = outcome(lambda: TemplateIter())


def iteration():
    x = 1
    iterator = iter(t'abc {x} yz{x}')
    parts = [p if isinstance(p, str) else ('interpolation', p.value, p.expression) for p in iterator]
    return [iter(iterator) is iterator, parts, outcome(lambda: next(iterator))]


r['iteration'] = outcome(iteration)
r['empty_strings_are_skipped'] = outcome(lambda: [list(iter(t'')), len(list(iter(t'{1}{2}')))])
r['no_length_hint'] = outcome(lambda: hasattr(TemplateIter, '__length_hint__'))

# --- unchanged ---------------------------------------------------------------
r['instances_still_build'] = outcome(lambda: [Template('a', Interpolation(1, 'x'), 'b').values,
                                              Interpolation(2, 'y', 'r', '>4').conversion])


EXPECTED = {
    'template_is_final': "TypeError: type 'string.templatelib.Template' is not an acceptable base type",
    'interpolation_is_final': "TypeError: type 'string.templatelib.Interpolation' is not an acceptable base type",
    'template_iter_is_final': "TypeError: type 'string.templatelib.TemplateIter' is not an acceptable base type",
    'interpolation_alias': ['string.templatelib.Interpolation[int]', True, (int,)],
    'template_alias': ['string.templatelib.Template[str]', True],
    'template_iter_type': ['TemplateIter', 'TemplateIter', 'string.templatelib',
                           "<class 'string.templatelib.TemplateIter'>"],
    'template_iter_not_created_directly': "TypeError: cannot create 'string.templatelib.TemplateIter' instances",
    'iteration': [True, ['abc ', ('interpolation', 1, 'x'), ' yz', ('interpolation', 1, 'x')], 'StopIteration: '],
    'empty_strings_are_skipped': [[], 2],
    'no_length_hint': False,
    'instances_still_build': [(1,), 'r'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-36s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
