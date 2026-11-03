"""Fixture: assertWarns' context keeps its records as ``warnings''.

CPython's _AssertWarnsContext (Lib/unittest/case.py:296-306) holds the
catch_warnings it entered as ``warnings_manager'' and the list it records
into as ``warnings'', and tests read them off the context --
test_fstring's test_fstring_backslash_before_double_bracket_warns_once
asserts ``len(w.warnings) == 1''.  Grail's kept both under private names,
so the read raised AttributeError.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import unittest
import warnings

r = {}


class Probe(unittest.TestCase):
    def runTest(self):
        pass


probe = Probe()
with probe.assertWarns(UserWarning) as context:
    warnings.warn('first', UserWarning)
    warnings.warn('second', RuntimeWarning)

r['the_context_keeps_every_record'] = [
    (str(each.message), each.category.__name__) for each in context.warnings]
r['the_context_keeps_its_manager'] = type(context.warnings_manager).__name__
r['the_matched_warning_is_still_the_first'] = str(context.warning)

EXPECTED = {
    'the_context_keeps_every_record': [('first', 'UserWarning'), ('second', 'RuntimeWarning')],
    'the_context_keeps_its_manager': 'catch_warnings',
    'the_matched_warning_is_still_the_first': 'first',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-40s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
