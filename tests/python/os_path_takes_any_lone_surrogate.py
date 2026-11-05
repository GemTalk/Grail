"""Fixture: os.path takes a str holding any lone surrogate, as CPython's does.

CPython's posixpath works on the str, so a name holding a lone surrogate
joins, splits and normalises like any other, whatever the surrogate
(Lib/posixpath.py).  Grail's os.path carried such a name to posixpath as its
os.fsencode bytes, and surrogateescape maps only U+DC80..U+DCFF: a name like
test_filecmp's U+D834 U+DD1E raised UnicodeEncodeError from join, basename
and the rest, and from the predicates, which CPython answers False for a
path the filesystem cannot be handed (genericpath catches ValueError).
realpath, getsize and os.stat still raise it, as CPython's do: they hand the
path to the filesystem.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import filecmp
import os

r = {}

clef = chr(0xD834) + chr(0xDD1E)
escaped = chr(0xDCFF)
path = os.path


def attempt(thunk):
    try:
        return thunk()
    except Exception as exception:
        return type(exception).__name__


r['joins_splits_and_normalises'] = attempt(lambda: [
    path.join('.', clef + '.py'), path.join(escaped, clef), path.basename('a/' + clef),
    path.dirname(clef + '/b'), path.split('a/' + clef), path.splitext(clef + '.py'),
    path.normpath('a//./' + clef + '/../b'), path.isabs(clef)])
r['common_parts_and_roots'] = attempt(lambda: [
    path.commonprefix(['/a/' + clef, '/a/' + clef + 'x']), path.commonpath(['/a/' + clef, '/a/' + clef + '/x']),
    path.splitdrive(clef), path.splitroot('//' + clef), path.relpath('/a/' + clef, '/a')])
r['abspath_and_expanduser_keep_it'] = [attempt(lambda: path.abspath(clef).endswith('/' + clef)),
                                       attempt(lambda: path.expanduser('~/' + clef).endswith('/' + clef))]
r['the_predicates_answer_no'] = [attempt(lambda: predicate(clef)) for predicate in (
    path.exists, path.lexists, path.isdir, path.isfile, path.islink, path.ismount, path.isjunction)]
r['the_filesystem_calls_still_refuse_it'] = [attempt(lambda: path.realpath('/nonexistent/' + clef)),
                                             attempt(lambda: path.getsize(clef)), attempt(lambda: os.stat(clef))]
r['filecmp_counts_it_a_funny_file'] = attempt(lambda: filecmp.cmpfiles('.', '.', [clef + '.py']))

EXPECTED = {
    'joins_splits_and_normalises': [
        './' + clef + '.py', escaped + '/' + clef, clef, clef, ('a', clef), (clef, '.py'), 'a/b', False],
    'common_parts_and_roots': ['/a/' + clef, '/a/' + clef, ('', clef), ('', '//', clef), clef],
    'abspath_and_expanduser_keep_it': [True, True],
    'the_predicates_answer_no': [False] * 7,
    'the_filesystem_calls_still_refuse_it': ['UnicodeEncodeError'] * 3,
    'filecmp_counts_it_a_funny_file': ([], [], [clef + '.py']),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-38s -> %s' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, ascii(actual)))
    print(SUMMARY)
