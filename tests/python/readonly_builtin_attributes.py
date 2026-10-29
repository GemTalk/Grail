"""Fixture: a builtin's read-only attributes refuse a store and a delete, in CPython's words.

CPython's READONLY members -- a complex's real and imag, a slice's start,
stop and step, a property's fget, fset and fdel, a classmethod's and a
staticmethod's __func__ and __wrapped__ -- refuse both with ``readonly
attribute`` (Python/structmember.c:159-163).  A getter with no setter --
int's and float's real and imag, int's numerator and denominator,
memoryview's attributes, __isabstractmethod__ -- refuses both with
``attribute 'x' of 'T' objects is not writable``, naming the type that
declares it (Objects/descrobject.c:248-258).  Grail keeps several of those
values in attributes of the same names, so a store REWROTE them: after
``c = 1j; c.imag = 5``, c was 5j (test_descr test_properties).  Every check
here holds under CPython 3.14, which is what makes it evidence.  A slice
still copies, through its __reduce__ (Objects/sliceobject.c:563-567), and
types.DynamicClassAttribute -- which shares property's implementation in
Grail and is a plain class in CPython -- keeps ordinary attributes.
"""

import copy
import types

r = {}


def f():
    pass


class I(int):
    pass


class F(float):
    pass


class P(property):
    pass


def refusals(obj, name):
    answers = []
    for operation in (lambda: setattr(obj, name, 42), lambda: delattr(obj, name)):
        try:
            operation()
            answers.append('accepted')
        except AttributeError as exc:
            answers.append(str(exc))
    return answers


def unwritable(name, owner):
    message = "attribute '%s' of '%s' objects is not writable" % (name, owner)
    return [message, message]


READONLY = ['readonly attribute', 'readonly attribute']

c = 1j
s = slice(1, 2, 3)
p = property(f)
cm = classmethod(f)
sm = staticmethod(f)
m = memoryview(b'ab')

r['readonly_members'] = [refusals(c, 'real'), refusals(c, 'imag'), refusals(s, 'start'),
                         refusals(s, 'stop'), refusals(s, 'step'), refusals(p, 'fget'),
                         refusals(p, 'fset'), refusals(p, 'fdel'), refusals(P(f), 'fget'),
                         refusals(cm, '__func__'), refusals(cm, '__wrapped__'),
                         refusals(sm, '__func__'), refusals(sm, '__wrapped__'),
                         refusals(range(3), 'start')]
r['getters_without_a_setter'] = [refusals(1, 'real'), refusals(1, 'imag'), refusals(1, 'numerator'),
                                 refusals(1, 'denominator'), refusals(True, 'real'),
                                 refusals(I(1), 'real'), refusals(1.5, 'real'), refusals(1.5, 'imag'),
                                 refusals(F(1.5), 'imag'), refusals(m, 'obj'), refusals(m, 'nbytes'),
                                 refusals(m, 'format'), refusals(m, 'shape'),
                                 refusals(p, '__isabstractmethod__'),
                                 refusals(cm, '__isabstractmethod__'),
                                 refusals(sm, '__isabstractmethod__')]
r['values_unchanged'] = [c == 1j, (s.start, s.stop, s.step) == (1, 2, 3), p.fget is f,
                         cm.__func__ is f, sm.__func__ is f, m.obj == b'ab']


def still_writable():
    answers = []
    p2 = property(f)
    p2.__doc__ = 'doc'
    answers.append(p2.__doc__)
    sub = P(f)
    sub.note = 'note'
    answers.append(sub.note)
    s2 = slice(5)
    answers.append(s2.indices(10))
    answers.append(copy.deepcopy(slice(1, 2, 3)) == slice(1, 2, 3))
    answers.append(slice(1, 2, 3).__reduce__() == (slice, (1, 2, 3)))
    dynamic = types.DynamicClassAttribute(f)
    dynamic.__isabstractmethod__ = True
    dynamic.fget = None
    answers.append((dynamic.__isabstractmethod__, dynamic.fget))
    return answers


r['still_writable'] = still_writable()

EXPECTED = {
    'readonly_members': [READONLY] * 14,
    'getters_without_a_setter': [unwritable('real', 'int'), unwritable('imag', 'int'),
                                 unwritable('numerator', 'int'), unwritable('denominator', 'int'),
                                 unwritable('real', 'int'), unwritable('real', 'int'),
                                 unwritable('real', 'float'), unwritable('imag', 'float'),
                                 unwritable('imag', 'float'), unwritable('obj', 'memoryview'),
                                 unwritable('nbytes', 'memoryview'), unwritable('format', 'memoryview'),
                                 unwritable('shape', 'memoryview'),
                                 unwritable('__isabstractmethod__', 'property'),
                                 unwritable('__isabstractmethod__', 'classmethod'),
                                 unwritable('__isabstractmethod__', 'staticmethod')],
    'values_unchanged': [True] * 6,
    'still_writable': ['doc', 'note', (0, 5, 1), True, True, (True, None)],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        ok = r[key] == EXPECTED[key]
        print('%-26s %s' % (key, 'OK' if ok else 'FAIL'))
        if not ok:
            for got, want in zip(r[key], EXPECTED[key]):
                if got != want:
                    print('    got %r, want %r' % (got, want))
    print(SUMMARY)
