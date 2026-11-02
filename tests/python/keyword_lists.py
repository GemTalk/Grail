"""Fixture: keyword's lists are CPython's.

kwlist holds the hard keywords only, sorted, and softkwlist the soft ones --
match, case, type and _ are names everywhere a keyword is not expected, so
``match = 42'' is an assignment and keyword.iskeyword('match') is False
(Lib/keyword.py, generated from the grammar).  iskeyword reads a frozenset
built when the module loads, so changing kwlist afterwards does not change
it.  Grail's stub put match and case in kwlist and had no issoftkeyword.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import keyword

r = {}

namespace = {}
exec('match = 42\ncase = 1\ntype = 2', namespace)
saved = list(keyword.kwlist)
keyword.kwlist.append('spam')
mutated = keyword.iskeyword('spam')
keyword.kwlist[:] = saved

r['hard_keywords'] = [len(keyword.kwlist), keyword.kwlist == sorted(keyword.kwlist),
                      'match' in keyword.kwlist, 'yield' in keyword.kwlist]
r['soft_keywords'] = sorted(keyword.softkwlist)
r['iskeyword'] = [keyword.iskeyword(word) for word in ('if', 'match', 'case', 'True', 'print')]
r['issoftkeyword'] = [keyword.issoftkeyword(word) for word in ('match', '_', 'if')]
r['soft_keywords_are_names'] = [namespace['match'], namespace['case'], namespace['type']]
r['the_list_is_not_the_predicate'] = mutated

EXPECTED = {
    'hard_keywords': [35, True, False, True],
    'soft_keywords': ['_', 'case', 'match', 'type'],
    'iskeyword': [True, False, False, True, False],
    'issoftkeyword': [True, True, False],
    'soft_keywords_are_names': [42, 1, 2],
    'the_list_is_not_the_predicate': False,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-30s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
