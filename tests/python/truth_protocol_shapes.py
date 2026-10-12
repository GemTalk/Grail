"""Fixture: every shape a truth test (``if x:`` / ``bool(x)``) can take (#1438).

Grail used to probe the protocol by SENDING __bool__ and then __len__ and
catching the miss, and a miss runs Grail's doesNotUnderstand handler, which
is slow.  It now asks the class first and sends only a method that exists.
The handler could still supply a __bool__ or __len__ that the class chain
does not show -- the varargs spelling of a def with defaults, a classmethod,
a dunder stored as a class attribute (a callable, or the ``None`` blocker),
a metaclass method for a class receiver -- so each of those is pinned here,
next to the plain shapes the fast path now decides.

Everything here is verified against real CPython by running the file
directly.
"""

r = {}


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = type(exc).__name__


class Plain:
    pass


class WithBool:
    def __init__(self, v):
        self.v = v

    def __bool__(self):
        return self.v


class WithLen:
    def __init__(self, n):
        self.n = n

    def __len__(self):
        return self.n


class BoolBeatsLen(WithLen):
    def __bool__(self):
        return True


class DefaultedBool:
    def __bool__(self, flag=False):
        return flag


class DefaultedLen:
    def __len__(self, n=0):
        return n


class ClassAttrBool:
    __bool__ = lambda self: False


class Blocked(WithLen):
    __bool__ = None


class LenBlocked:
    __len__ = None


class Late:
    pass


class BadBool:
    def __bool__(self):
        return 1


class NegativeLen:
    def __len__(self):
        return -1


class RaisingBool:
    def __bool__(self):
        raise AttributeError('inside __bool__')


class GetattrEverything:
    def __getattr__(self, name):
        return lambda: False


class Meta(type):
    def __bool__(cls):
        return False


class FalsyClass(metaclass=Meta):
    pass


class EmptyStr(str):
    pass


class LenStr(str):
    def __len__(self):
        return 0


class FalseList(list):
    def __bool__(self):
        return False


class SubOfLen(WithLen):
    pass


record('plain_instance', lambda: bool(Plain()))
record('if_plain_instance', lambda: 'yes' if Plain() else 'no')
record('bool_method', lambda: (bool(WithBool(True)), bool(WithBool(False))))
record('len_method', lambda: (bool(WithLen(0)), bool(WithLen(3))))
record('bool_beats_len', lambda: bool(BoolBeatsLen(0)))
record('inherited_len', lambda: bool(SubOfLen(0)))
record('defaulted_bool', lambda: bool(DefaultedBool()))
record('defaulted_len', lambda: bool(DefaultedLen()))
record('class_attribute_bool', lambda: bool(ClassAttrBool()))
record('bool_none_blocks', lambda: bool(Blocked(3)))
record('len_none_blocks', lambda: bool(LenBlocked()))


def _late():
    before = bool(Late())
    Late.__bool__ = lambda self: False
    after = bool(Late())
    del Late.__bool__
    return (before, after, bool(Late()))


record('setattr_after_creation', _late)


def _instance_attr():
    p = Plain()
    p.__bool__ = lambda: False
    p.__len__ = lambda: 0
    return bool(p)


record('instance_attribute_is_ignored', _instance_attr)
record('bool_returning_int', lambda: bool(BadBool()))
record('negative_len', lambda: bool(NegativeLen()))
record('error_inside_bool_propagates', lambda: bool(RaisingBool()))
record('getattr_does_not_supply_dunders', lambda: bool(GetattrEverything()))
record('metaclass_bool_on_a_class', lambda: (bool(FalsyClass), bool(Plain)))
record('str_subclass', lambda: (bool(EmptyStr('')), bool(EmptyStr('x'))))
record('str_subclass_len', lambda: bool(LenStr('abc')))
record('list_subclass_bool', lambda: bool(FalseList([1])))
record('builtins', lambda: (bool(''), bool('a'), bool([]), bool([0]),
                            bool(()), bool({}), bool({1: 2}), bool(set()),
                            bool(0), bool(2), bool(0.0), bool(0.5), bool(None),
                            bool(b''), bool(b'x'), bool(range(0)),
                            bool(range(2))))
record('functions_and_methods', lambda: (bool(len), bool(Plain), bool(_late),
                                         bool(WithLen(0).__len__)))
record('while_on_a_shrinking_len', lambda: (
    lambda w: [w.__setattr__('n', w.n - 1) for _ in iter(lambda: bool(w), False)]
    and w.n)(WithLen(3)))


EXPECTED = {
    'plain_instance': True,
    'if_plain_instance': 'yes',
    'bool_method': (True, False),
    'len_method': (False, True),
    'bool_beats_len': True,
    'inherited_len': False,
    'defaulted_bool': False,
    'defaulted_len': False,
    'class_attribute_bool': False,
    'bool_none_blocks': 'TypeError',
    'len_none_blocks': 'TypeError',
    'setattr_after_creation': (True, False, True),
    'instance_attribute_is_ignored': True,
    'bool_returning_int': 'TypeError',
    'negative_len': 'ValueError',
    'error_inside_bool_propagates': 'AttributeError',
    'getattr_does_not_supply_dunders': True,
    'metaclass_bool_on_a_class': (False, True),
    'str_subclass': (False, True),
    'str_subclass_len': False,
    'list_subclass_bool': False,
    'builtins': (False, True, False, True, False, False, True, False, False,
                 True, False, True, False, False, True, False, True),
    'functions_and_methods': (True, True, True, True),
    'while_on_a_shrinking_len': 0,
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        actual = r[key]
        print('%-5s %-36s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-36s is not in EXPECTED' % ('FAIL', extra))
