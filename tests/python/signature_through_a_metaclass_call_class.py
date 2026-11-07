"""Fixture: a class called through a metaclass __call__ that is a class has that class's signature.

CPython's inspect.signature of a class asks the metaclass for a __call__
first (Lib/inspect.py, _signature_from_callable), and a CLASS standing there
-- ``__call__ = dict'' -- is user-defined in its sense, since it is none of
the builtin slot or method kinds.  Nothing binds it, so the signature is that
class's own: dict has none, and signature() is ValueError, which is why a
dataclass built on such a base has the bare docstring 'C' (test_dataclasses
test_docstring_with_no_signature, gh-103449).  Grail's inspect read only
Python defs there, so the class reported ().

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import inspect
from dataclasses import dataclass

r = {}


def signature_of(callable_object):
    try:
        return str(inspect.signature(callable_object))
    except (TypeError, ValueError) as e:
        return '%s: %s' % (type(e).__name__, e)


class DictCalling(type):
    __call__ = dict


class OnDict(metaclass=DictCalling):
    pass


class Sub(OnDict):
    pass


class Maker:
    def __init__(self, a, b=2):
        pass


class MakerCalling(type):
    __call__ = Maker


class OnMaker(metaclass=MakerCalling):
    pass


class DefCalling(type):
    def __call__(cls, a, b=2):
        pass


class OnDef(metaclass=DefCalling):
    pass


@dataclass
class Documented(OnDict):
    pass


r['a_class_called_through_dict_has_no_signature'] = [signature_of(OnDict), signature_of(Sub)]
r['a_class_called_through_another_class_has_its_signature'] = signature_of(OnMaker)
r['a_def_call_still_drops_its_class'] = signature_of(OnDef)
r['a_dataclass_on_such_a_base_has_the_bare_docstring'] = Documented.__doc__

EXPECTED = {
    'a_class_called_through_dict_has_no_signature': [
        "ValueError: no signature found for builtin type <class 'dict'>"] * 2,
    'a_class_called_through_another_class_has_its_signature': '(a, b=2)',
    'a_def_call_still_drops_its_class': '(a, b=2)',
    'a_dataclass_on_such_a_base_has_the_bare_docstring': 'Documented',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-56s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
