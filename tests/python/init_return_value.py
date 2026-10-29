"""Fixture: an __init__ that returns anything but None is a TypeError.

CPython's slot_tp_init calls __init__ and refuses any result but None,
naming its type -- ``__init__() should return None, not 'int'``
(Objects/typeobject.c:10552-10566).  ``return self`` is refused too.  The
check is made where the class is called, so an __init__ called directly
returns its value unchecked.  Grail discarded the result on every path:
a class statement's own, inherited and assigned __init__, a class made by
type(), a metaclass's __init__, and an exception class raised by name
(test_descr test_init).  Every check here holds under CPython 3.14, which
is what makes it evidence.
"""

import dataclasses

r = {}


def outcome(make):
    try:
        made = make()
        return ('ok', type(made).__name__)
    except Exception as exc:
        return (type(exc).__name__, str(exc))


def refused(type_name):
    return ('TypeError', "__init__() should return None, not '%s'" % type_name)


class Own:
    def __init__(self):
        return 10


class ReturnsSelf:
    def __init__(self):
        return self


class Varargs:
    def __init__(self, *args, **kwargs):
        return 'no'


class Defaults:
    def __init__(self, a, b=2):
        return 1.5


class Generator:
    def __init__(self):
        yield 1


class InheritsOwn(Own):
    pass


class InheritsVarargs(Varargs):
    pass


class Assigned:
    pass


Assigned.__init__ = lambda self: (1, 2)

Built = type('Built', (), {'__init__': lambda self: [3]})


class IntSub(int):
    def __init__(self, value):
        return self


class ListSub(list):
    def __init__(self, items):
        super().__init__(items)
        return [1]


class ErrorSub(Exception):
    def __init__(self, *args):
        return 1


class Meta(type):
    def __init__(cls, *args):
        return 5


def raise_by_name():
    raise ErrorSub


def class_statement_with_meta():
    class Made(metaclass=Meta):
        pass
    return Made


r['own_init'] = [outcome(Own), outcome(ReturnsSelf), outcome(lambda: Varargs(1, k=2)),
                 outcome(lambda: Defaults(1)), outcome(Generator)]
r['inherited_init'] = [outcome(InheritsOwn), outcome(lambda: InheritsVarargs(1))]
r['assigned_and_built'] = [outcome(Assigned), outcome(Built)]
r['builtin_subclasses'] = [outcome(lambda: IntSub(3)), outcome(lambda: ListSub([3])),
                           outcome(lambda: ErrorSub('x')), outcome(raise_by_name)]
r['metaclass_init'] = [outcome(lambda: Meta('Direct', (), {})), outcome(class_statement_with_meta)]
r['direct_call_unchecked'] = [Own.__init__(Own.__new__(Own)), Meta.__init__(Meta, 'X', (), {})]


class NoReturn:
    def __init__(self):
        self.x = 1


class ExplicitNone:
    def __init__(self):
        return None


class SuperDict(dict):
    def __init__(self, *args, **kwargs):
        return super().__init__(*args, **kwargs)


class SuperList(list):
    def __init__(self, *args):
        return super().__init__(*args)


class SuperSet(set):
    def __init__(self, *args):
        return super().__init__(*args)


class SuperBytearray(bytearray):
    def __init__(self, *args):
        return super().__init__(*args)


class SuperProperty(property):
    def __init__(self, *args):
        return super().__init__(*args)


class SuperError(Exception):
    def __init__(self, *args):
        return super().__init__(*args)


class SuperObject:
    def __init__(self):
        return super().__init__()


class SuperMeta(type):
    def __init__(cls, *args):
        return super().__init__(*args)


@dataclasses.dataclass
class Data:
    a: int = 1


def class_statement_with_super_meta():
    class Made(metaclass=SuperMeta):
        pass
    return Made


LEGAL = [NoReturn, ExplicitNone, lambda: SuperDict(a=1), lambda: SuperDict([(1, 2)]),
         lambda: SuperList([1]), lambda: SuperSet([1]), lambda: SuperBytearray(b'xy'),
         lambda: SuperProperty(None), lambda: SuperError('x'), SuperObject,
         lambda: SuperMeta('Direct', (), {}), class_statement_with_super_meta, Data]
r['legal'] = [outcome(each)[0] for each in LEGAL]

EXPECTED = {
    'own_init': [refused('int'), refused('ReturnsSelf'), refused('str'), refused('float'),
                 refused('generator')],
    'inherited_init': [refused('int'), refused('str')],
    'assigned_and_built': [refused('tuple'), refused('list')],
    'builtin_subclasses': [refused('IntSub'), refused('list'), refused('int'), refused('int')],
    'metaclass_init': [refused('int'), refused('int')],
    'direct_call_unchecked': [10, 5],
    'legal': ['ok'] * len(LEGAL),
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
