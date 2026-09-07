"""A captured bound method must keep meaning the function it was captured from.

CPython's bound method holds the FUNCTION, so ``f = obj.m'' survives anything
that later happens to the NAME.  Grail's BoundMethod holds a receiver and a
SELECTOR and re-sends, so whatever the selector resolves to at call time is
what the capture runs.

``del D.m'' is where the two came apart: CPython's capture still runs D's
function, while Grail's re-send fell through to the INHERITED method -- a
caller that had asked for D's got Base's, silently and with no error.

The fix reuses the mechanism builtins rebinding already had: the original
survives under a ``___grailOrig_'' selector and the selector is pinned, so a
capture handed out beforehand redirects to it.  Most of the checks below are
CONTROLS -- the delete must still be a real delete, and nothing that already
agreed with CPython may move.
"""


class Base:
    def m(self):
        return 'Base.m'


def a_capture_survives_deleting_the_class_method():
    class D(Base):
        def m(self):
            return 'D.m'
    d = D()
    captured = d.m
    del D.m
    return captured() == 'D.m'


def deleting_the_class_method_really_deletes_it():
    class D(Base):
        def m(self):
            return 'D.m'
    d = D()
    del D.m
    return d.m() == 'Base.m'


def deleting_it_twice_raises():
    class D(Base):
        def m(self):
            return 'D.m'
    del D.m
    try:
        del D.m
    except AttributeError:
        return True
    return False


def a_capture_is_unaffected_by_a_later_class_rebinding():
    class D(Base):
        def m(self):
            return 'D.m'
    captured = D().m
    D.m = lambda self: 'rebound'
    return captured() == 'D.m'


def a_capture_is_unaffected_by_a_later_instance_shadow():
    class D(Base):
        def m(self):
            return 'D.m'
    d = D()
    captured = d.m
    d.m = lambda: 'instance'
    return captured() == 'D.m'


def an_unbound_capture_is_unaffected_by_a_later_rebinding():
    class D(Base):
        def m(self):
            return 'D.m'
    captured = D.m
    D.m = lambda self: 'rebound'
    return captured(D()) == 'D.m'


def a_plain_capture_still_works():
    class D(Base):
        def m(self):
            return 'D.m'
    return D().m() == 'D.m'


def a_capture_with_arguments_survives_the_delete():
    class D(Base):
        def add(self, a, b=2):
            return a + b
    d = D()
    captured = d.add
    del D.add
    return captured(1) == 3 and captured(1, 5) == 6 and captured(a=1, b=9) == 10


CHECKS = [
    a_capture_survives_deleting_the_class_method,
    deleting_the_class_method_really_deletes_it,
    deleting_it_twice_raises,
    a_capture_is_unaffected_by_a_later_class_rebinding,
    a_capture_is_unaffected_by_a_later_instance_shadow,
    an_unbound_capture_is_unaffected_by_a_later_rebinding,
    a_plain_capture_still_works,
    a_capture_with_arguments_survives_the_delete,
]

RESULTS = {}
for _fn in CHECKS:
    try:
        RESULTS[_fn.__name__] = _fn() is True
    except Exception as _exc:
        RESULTS[_fn.__name__] = type(_exc).__name__ + ': ' + str(_exc)


if __name__ == '__main__':
    for _fn in CHECKS:
        _got = RESULTS[_fn.__name__]
        print('%-4s %s' % ('OK' if _got is True else 'FAIL', _fn.__name__))
