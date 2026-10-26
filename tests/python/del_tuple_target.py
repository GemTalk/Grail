"""Fixture: a ``del'' target may be a tuple or a list, and nests.

``del a, (b, c), [d, (e, f)]'' deletes every name in it, left to right:
CPython's codegen visits a Del-context Tuple or List element by element
(codegen_tuple / codegen_list, Python/codegen.c).  Grail split only the
top-level, unparenthesized comma list, so a parenthesized or bracketed target
reached the emit whole and the module failed to compile with ``del for
TupleAst is not yet supported'' -- test_grammar's test_del_stmt, which is
why test_grammar could not be imported at all.

``ast.parse'' keeps the parsed shape, as CPython's tree does: one Tuple
target whose elements are Del-context names.

Every EXPECTED check holds under CPython 3.14, which is what makes it
evidence.
"""

import ast

r = {}


def _try(thunk):
    try:
        return ('ok', thunk())
    except BaseException as e:
        return (type(e).__name__, str(e))


m1, m2, m3 = 1, 2, 3
del (m1, [m2]), m3


def _module_names_gone():
    return [n in globals() for n in ('m1', 'm2', 'm3')]


def nested_locals():
    a, b, c, d, e, f = 'abcdef'
    del a, (b, c), [d, (e, f)]
    out = []
    try:
        a
        out.append('bound')
    except NameError as exc:
        out.append(type(exc).__name__)
    try:
        f
        out.append('bound')
    except NameError as exc:
        out.append(type(exc).__name__)
    return out


def read_after_delete():
    x, y = 1, 2
    del [x, y]
    return y


class Recorder:
    def __init__(self):
        self.log = []

    def __delitem__(self, key):
        self.log.append(('item', key))

    def __delattr__(self, name):
        self.log.append(('attr', name))


def left_to_right():
    rec = Recorder()
    del (rec[1], [rec.first, rec[2]])
    return rec.log


def empty_targets():
    del ()
    del []
    return 'nothing deleted'


class Body:
    a = 1
    b = 2
    keep = 3
    del (a, [b])


def _parsed_shape():
    target = ast.parse('del (a, b)').body[0].targets[0]
    return (type(target).__name__, type(target.ctx).__name__,
            [type(e.ctx).__name__ for e in target.elts])


r['module names in a nested target are deleted'] = _try(_module_names_gone)
r['function locals in a nested target are deleted'] = _try(nested_locals)
r['a read after a list delete raises'] = _try(read_after_delete)
r['subscripts and attributes delete left to right'] = _try(left_to_right)
r['an empty tuple or list deletes nothing'] = _try(empty_targets)
r['class body names in a tuple are deleted'] = _try(
    lambda: [hasattr(Body, n) for n in ('a', 'b', 'keep')])
r['ast.parse keeps the tuple'] = _try(_parsed_shape)


EXPECTED = {
    'module names in a nested target are deleted': ('ok', [False, False, False]),
    'function locals in a nested target are deleted': (
        'ok', ['UnboundLocalError', 'UnboundLocalError']),
    'a read after a list delete raises': (
        'UnboundLocalError',
        "cannot access local variable 'y' where it is not associated with a value"),
    'subscripts and attributes delete left to right': (
        'ok', [('item', 1), ('attr', 'first'), ('item', 2)]),
    'an empty tuple or list deletes nothing': ('ok', 'nothing deleted'),
    'class body names in a tuple are deleted': ('ok', [False, False, True]),
    'ast.parse keeps the tuple': ('ok', ('Tuple', 'Del', ['Del', 'Del'])),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-48s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    print(SUMMARY)
