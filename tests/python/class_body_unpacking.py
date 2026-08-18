# Names a CLASS BODY binds by UNPACKING.
#
# A class body is not a function body: it has no Smalltalk temps to bind, so
# every name it binds is stored on the class -- in an accessor pair for a name
# assigned unconditionally, in the per-class dynamic-attr holder otherwise.
# Three places have to agree about which names those are: the parser (which
# registers writes), the STORE emitters, and the READ emitter.  For a plain
# ``for i in ...:'' they did.  For anything that unpacks, they did not:
#
#   * ``for t, ss in d.items():'' stored both names on the class and read them
#     back as MODULE globals.  The store side unpacked correctly all along, so
#     this surfaced as a NameError from a later statement rather than as
#     anything wrong at the loop -- and only for a tuple target, because
#     ClassDefAst's name collector tested ``isKindOf: NameAst'' and stopped.
#   * ``with cm() as (u, v):'' did not COMPILE.  The tuple-unpack leaf store
#     knew the module home but not the class-body one, so it emitted a bare
#     ``u := ...'' -- an undefined symbol, which takes the whole enclosing
#     module down rather than failing at the statement.
#   * ``if flag: p, q = 5, 6'' was SILENTLY DROPPED.  The if-branch emitter
#     handled simple NAME = value and ``anything else is dropped'', so the
#     binding never happened and a later line raised NameError naming a
#     variable the reader can see being assigned two lines up.
#   * ``x = 1; del x; x = 2'' died with a doesNotUnderstand on the setter.  A
#     class-body ``del'' REMOVES the accessor pair (nilling it would leave
#     hasattr answering true), so a later unconditional assignment emitted as a
#     direct accessor send has nothing to send to.
#
# Found by porting CPython's pydoc, whose Helper class body is written this way:
#
#     for topic, symbols_ in _symbols_inverse.items():
#         for symbol in symbols_:
#             topics = symbols.get(symbol, topic)
#             ...
#     del topic, symbols_, symbol, topics
#     topics = { ... }
#
# which needs three of the four.

import contextlib

r = {}


# --- a loop target that unpacks -------------------------------------------------------

class ForTuple:
    seen = []
    for t, ss in {'A': (1, 2)}.items():
        for s in ss:
            seen.append((t, s))


r['for_tuple_target'] = repr(ForTuple.seen)


class ForTupleAfter:
    for a, b in [(1, 2), (3, 4)]:
        pass
    last = (a, b)


r['for_tuple_binds_after_loop'] = repr(ForTupleAfter.last)


class ForStar:
    got = []
    for head, *tail in [(1, 2, 3)]:
        got.append((head, tail))


r['for_star_target'] = repr(ForStar.got)


class ForNested:
    acc = []
    for (m, (n, o)) in [(1, (2, 3))]:
        acc.append((m, n, o))


r['for_nested_target'] = repr(ForNested.acc)


# --- a with-as target that unpacks ------------------------------------------------------

@contextlib.contextmanager
def pair():
    yield (1, 2)


class WithTuple:
    with pair() as (u, v):
        total = u + v


r['with_tuple_as'] = repr(WithTuple.total)


# --- an assignment inside a class-body if -----------------------------------------------

class IfTuple:
    if True:
        p, q = 5, 6
        both = p + q


r['if_branch_tuple_assign'] = repr(IfTuple.both)


class IfSubscript:
    d = {}
    if True:
        d['k'] = 'v'


r['if_branch_subscript_assign'] = repr(sorted(IfSubscript.d.items()))


# --- del, then re-assign ----------------------------------------------------------------

class DelThenAssign:
    x = 1
    del x
    x = 2


r['del_then_reassign'] = repr(DelThenAssign.x)


class DelStaysDeleted:
    y = 1
    del y


r['del_stays_deleted'] = repr(hasattr(DelStaysDeleted, 'y'))


# --- the pydoc.Helper shape, whole ------------------------------------------------------

class PydocShape:
    _inverse = {'STRINGS': ("'", '"'), 'COMPLEX': ('j',)}
    symbols = {'%': 'OPERATORS'}
    for topic, symbols_ in _inverse.items():
        for symbol in symbols_:
            topics = symbols.get(symbol, topic)
            if topic not in topics:
                topics = topics + ' ' + topic
            symbols[symbol] = topics
    del topic, symbols_, symbol, topics
    topics = {'TYPES': 'types'}


r['pydoc_helper_shape'] = repr(sorted(PydocShape.symbols.items()))
r['pydoc_helper_topics'] = repr(PydocShape.topics)


# --- controls: shapes that always worked ------------------------------------------------

class Controls:
    x, y = 7, 8
    n = 0
    for i in (1, 2, 3):
        n = n + i


r['toplevel_tuple_assign'] = repr((Controls.x, Controls.y))
r['simple_for_target'] = repr((Controls.n, Controls.i))


EXPECTED = {
    'del_stays_deleted': 'False',
    'del_then_reassign': '2',
    'for_nested_target': '[(1, 2, 3)]',
    'for_star_target': '[(1, [2, 3])]',
    'for_tuple_binds_after_loop': '(3, 4)',
    'for_tuple_target': "[('A', 1), ('A', 2)]",
    'if_branch_subscript_assign': "[('k', 'v')]",
    'if_branch_tuple_assign': '11',
    'pydoc_helper_shape': '''[('"', 'STRINGS'), ('%', 'OPERATORS'), ("'", 'STRINGS'), ('j', 'COMPLEX')]''',
    'pydoc_helper_topics': "{'TYPES': 'types'}",
    'simple_for_target': '(6, 3)',
    'toplevel_tuple_assign': '(7, 8)',
    'with_tuple_as': '3',
}

GRAIL_ONLY = {}


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-30s %s %s' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
