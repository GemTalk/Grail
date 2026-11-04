"""Fixture: None's methods keep their receiver in inspect.signature, as CPython's do.

A builtin bound to None keeps its receiver in CPython's inspect.signature:
_signature_fromstr strips the first parameter only when ``__self__ is not
None'' (Lib/inspect.py:2285-2292), so ``None.__bool__'' is (self, /) where a
method of any other object would be ().  Grail's builtins carry no text
signature of their own, inspect reads CPython's from a generated table, and
that table held only the types builtins names -- NoneType is not one -- so
every method of None answered ().  rlcompleter completes from the
signature: ``None.__bool__()'' where CPython offers ``None.__bool__(''
(test_rlcompleter test_attr_matches).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import inspect
import rlcompleter

r = {}


def signature_of(callable_object):
    try:
        return str(inspect.signature(callable_object))
    except (TypeError, ValueError) as error:
        return type(error).__name__


r['nones_methods'] = [signature_of(getattr(None, name))
                      for name in ('__bool__', '__eq__', '__repr__', '__format__', '__sizeof__', '__hash__')]
r['the_inherited_ones_too'] = [signature_of(getattr(None, name))
                               for name in ('__init__', '__lt__', '__reduce_ex__', '__dir__')]
r['a_class_method_drops_its_type'] = [signature_of(None.__init_subclass__),
                                      signature_of(None.__subclasshook__)]
r['ellipsis_and_not_implemented_drop_theirs'] = [signature_of(Ellipsis.__repr__), signature_of(NotImplemented.__reduce__)]
r['rlcompleter_leaves_the_parenthesis_open'] = rlcompleter.Completer({}).attr_matches('None.__boo')
r['another_objects_bound_method_still_drops_self'] = signature_of((1).__bool__)

EXPECTED = {
    'nones_methods': ['(self, /)', '(self, value, /)', '(self, /)', '(self, format_spec, /)',
                      '(self, /)', '(self, /)'],
    'the_inherited_ones_too': ['(self, /, *args, **kwargs)', '(self, value, /)', '(self, protocol, /)',
                               '(self, /)'],
    'a_class_method_drops_its_type': ['()', '(object, /)'],
    'ellipsis_and_not_implemented_drop_theirs': ['()', '()'],
    'rlcompleter_leaves_the_parenthesis_open': ['None.__bool__('],
    'another_objects_bound_method_still_drops_self': '()',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-46s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
