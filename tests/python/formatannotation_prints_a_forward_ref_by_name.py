"""Fixture: inspect.formatannotation prints a ForwardRef as the name it refers to.

CPython 3.14's inspect.formatannotation renders an annotationlib.ForwardRef
-- what an annotation naming something undefined becomes in the FORWARDREF
format -- as its __forward_arg__, and takes quote_annotation_strings=False to
print a string annotation bare.  So a dataclass's docstring, built from
str(inspect.signature(cls)), reads ``C(x:undef)'' (test_dataclasses
TestDocString test_docstring_undefined_name and
test_docstring_with_unsolvable_forward_ref_in_init).  Grail printed the
ForwardRef's repr, ``C(x:ForwardRef('undef', is_class=True, owner=...))'',
and had no quote_annotation_strings.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import annotationlib
import inspect
from dataclasses import dataclass

r = {}


def outcome(call):
    try:
        return call()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


@dataclass
class Undefined:
    x: undef  # noqa: F821


@dataclass
class Unsolvable:
    x: 'X'
    num: int

    def __init__(self, x: X, num: int):  # noqa: F821
        pass


def no_spaces(text):
    return text.replace(' ', '')


r['a_forward_ref_prints_its_name'] = outcome(lambda: inspect.formatannotation(annotationlib.ForwardRef('Thing')))
r['a_dataclass_docstring_names_an_undefined_annotation'] = outcome(lambda: no_spaces(Undefined.__doc__))
r['an_unsolvable_init_annotation_prints_its_name'] = outcome(lambda: no_spaces(Unsolvable.__doc__))
r['a_string_is_quoted_unless_asked_not_to'] = outcome(lambda: [
    inspect.formatannotation('s'), inspect.formatannotation('s', quote_annotation_strings=False)])
r['other_annotations_print_as_before'] = outcome(lambda: [
    inspect.formatannotation(int), inspect.formatannotation(list[int]), inspect.formatannotation(3)])

EXPECTED = {
    'a_forward_ref_prints_its_name': 'Thing',
    'a_dataclass_docstring_names_an_undefined_annotation': 'Undefined(x:undef)',
    'an_unsolvable_init_annotation_prints_its_name': 'Unsolvable(x:X,num:int)',
    'a_string_is_quoted_unless_asked_not_to': ["'s'", 's'],
    'other_annotations_print_as_before': ['int', 'list[int]', '3'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-52s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
