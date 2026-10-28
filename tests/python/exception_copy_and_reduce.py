"""Fixture: an exception reduces, copies and pickles with its arguments, as CPython's does.

CPython's BaseException.__reduce__ answers ``(type, args)``, with the instance
__dict__ as state when there is one; OSError folds its filename back into the
arguments, and ImportError carries name, path and name_from as state.  Grail's
answered object's NotImplemented, so ``copy.copy`` and ``copy.deepcopy`` rebuilt
every exception WITHOUT its arguments -- ``args == ()`` and an empty str -- and
pickling an ImportError lost its name_from (test_exceptions ImportErrorTests
test_copy_pickle).  SyntaxError also lacked print_file_and_line, a member
CPython's always has (testAttributes).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import copy
import pickle


class Custom(Exception):
    pass


def tagged(exc):
    exc.extra = 7
    return exc


def outcome(exc):
    return (type(exc).__name__, exc.args, str(exc), getattr(exc, 'extra', None))


originals = [tagged(ValueError('a', 'b')), tagged(KeyError('k')), tagged(OSError(2, 'x', 'f')),
             tagged(Custom('c')), tagged(StopIteration(5)),
             tagged(UnicodeDecodeError('utf-8', b'\xff', 0, 1, 'bad'))]

r = {}
r['reduce'] = [ValueError('a').__reduce__(), KeyError('k').__reduce__(),
               OSError(2, 'x').__reduce__(), tagged(ValueError('a')).__reduce__()[2]]
r['copy'] = [outcome(copy.copy(each)) for each in originals]
r['deepcopy'] = [outcome(copy.deepcopy(each)) for each in originals]
r['pickle'] = [outcome(pickle.loads(pickle.dumps(each))) for each in originals]
imp = ImportError('test', name='n', path='p', name_from='nf')
r['import_error'] = [imp.__reduce__()[1:],
                     [(each.args, each.name, each.path, each.name_from)
                      for each in (copy.copy(imp), pickle.loads(pickle.dumps(imp)))]]
r['print_file_and_line'] = [SyntaxError('m').print_file_and_line,
                            SyntaxError('m', ('f', 1, 2, 't')).print_file_and_line]

EXPECTED = {
    'reduce': [(ValueError, ('a',)), (KeyError, ('k',)), (FileNotFoundError, (2, 'x')), {'extra': 7}],
    'copy': [('ValueError', ('a', 'b'), "('a', 'b')", 7), ('KeyError', ('k',), "'k'", 7),
             ('FileNotFoundError', (2, 'x'), "[Errno 2] x: 'f'", 7), ('Custom', ('c',), 'c', 7),
             ('StopIteration', (5,), '5', 7),
             ('UnicodeDecodeError', ('utf-8', b'\xff', 0, 1, 'bad'),
              "'utf-8' codec can't decode byte 0xff in position 0: bad", 7)],
    'import_error': [(('test',), {'name': 'n', 'path': 'p', 'name_from': 'nf'}),
                     [(('test',), 'n', 'p', 'nf'), (('test',), 'n', 'p', 'nf')]],
    'print_file_and_line': [None, None],
}
EXPECTED['deepcopy'] = EXPECTED['copy']
EXPECTED['pickle'] = EXPECTED['copy']

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-20s %-5s -> %r' % (key, 'OK' if actual == EXPECTED[key] else 'FAIL', actual))
    print(SUMMARY)
