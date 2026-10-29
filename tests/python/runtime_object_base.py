"""Fixture: a class whose base is ``object`` known only at run time is an ordinary Python class.

``for base in (int, object): class C(base)`` builds C over a base the class
statement cannot see when it is compiled.  For ``object`` that is the same
class as ``class C(object)``.  Grail rooted it at the kernel Object rather
than at PythonInstance, where ``class C(object)`` and ``type('C', (object,),
{})`` are rooted, so the many checks for a Python instance missed it: ``1 <
C(2)`` never tried C's reflected __gt__, and an instance had no __dict__
(test_descr test_classic_comparisons).  Every check here holds under CPython
3.14, which is what makes it evidence.
"""

r = {}


def outcome(compute):
    try:
        return compute()
    except Exception as exc:
        return (type(exc).__name__, str(exc))


def build(base):
    class C(base):
        def __init__(self, value):
            self.value = value

        def __gt__(self, other):
            return self.value > other

        def __lt__(self, other):
            return self.value < other

        def __radd__(self, other):
            return ('radd', other)
    return C


def build_slotted(base):
    class S(base):
        __slots__ = ('value',)
    return S


def build_plain(base):
    class D(base):
        pass
    return D


def with_attribute(instance):
    instance.y = 2
    return instance.__dict__


def stored_slot(instance):
    instance.value = 3
    return instance.value


RUNTIME_OBJECT = object

r['reflected_operators'] = [outcome(lambda: 1 < build(RUNTIME_OBJECT)(2)),
                            outcome(lambda: 3 > build(RUNTIME_OBJECT)(2)),
                            outcome(lambda: 1 + build(RUNTIME_OBJECT)(2))]
r['instance_dict'] = [outcome(lambda: with_attribute(build_plain(RUNTIME_OBJECT)())),
                      outcome(lambda: build_plain(RUNTIME_OBJECT)().__dict__)]
r['slots'] = [outcome(lambda: stored_slot(build_slotted(RUNTIME_OBJECT)())),
              outcome(lambda: setattr(build_slotted(RUNTIME_OBJECT)(), 'other', 1))]
r['the_class_itself'] = [[k.__name__ for k in build_plain(RUNTIME_OBJECT).__mro__],
                         build_plain(RUNTIME_OBJECT).__bases__ == (object,),
                         isinstance(build_plain(RUNTIME_OBJECT)(), object),
                         type(build_plain(RUNTIME_OBJECT)) is type]
r['same_as_a_static_base'] = [outcome(lambda: 1 < build(int)(2)),
                              [k.__name__ for k in type('T', (object,), {}).__mro__]]

EXPECTED = {
    'reflected_operators': [True, True, ('radd', 1)],
    'instance_dict': [{'y': 2}, {}],
    'slots': [3, ('AttributeError',
                  "'S' object has no attribute 'other' and no __dict__ for setting new attributes")],
    'the_class_itself': [['D', 'object'], True, True, True],
    'same_as_a_static_base': [True, ['T', 'object']],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        ok = r[key] == EXPECTED[key]
        print('%-24s %s' % (key, 'OK' if ok else 'FAIL'))
        if not ok:
            print('    got  %r' % (r[key],))
            print('    want %r' % (EXPECTED[key],))
    print(SUMMARY)
