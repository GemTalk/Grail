"""A comprehension's for-target is a full assignment target, and dir() takes
no argument.

Grail's comprehension codegen read ``target id'' unconditionally, so anything
other than a plain name or a tuple of names died with an uncatchable
``SubscriptAst does not understand #id'' -- and inside a TUPLE target such an
element was quietly DROPPED instead, so the store never happened at all.
Python allows any assignment target there, exactly as in a ``for`` statement:

    [d for d['k'] in [7]]        # stores through __setitem__
    [b.v for b.v in [5]]         # stores through __setattr__
    [1 for (l[0], l) in [[1, 2]]]

Separately, ``dir()`` with no argument answers the names in the current
scope.  Grail had only the one-argument form, so a bare dir() raised
TypeError; it is now the compile-time rewrite locals() already uses, since
Python defines it as exactly that.

Every expectation below was checked against CPython 3.14.
"""

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except Exception as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


# --------------------------------------------- targets are full lvalues

def subscript_target():
    d = {}
    r = [d for d['k'] in [7]]
    return (d, len(r))


check('subscript_target_stores', subscript_target, ({'k': 7}, 1))


class Box:
    pass


def attribute_target():
    b = Box()
    r = [b.v for b.v in [5]]
    return (b.v, r)


check('attribute_target_stores', attribute_target, (5, [5]))


def list_target():
    return [(a, b) for [a, b] in [(1, 2), (3, 4)]]


check('list_target_unpacks', list_target, [(1, 2), (3, 4)])


def tuple_containing_subscript():
    l = [None, None]
    r = [l[0] for (l[0], l[1]) in [(1, 2)]]
    return (l, r)


check('subscript_inside_tuple_target', tuple_containing_subscript,
      ([1, 2], [1]))


def comprehension_as_subscript_base():
    """The target is a SUBSCRIPT whose base is itself a comprehension --
    test_listcomps' test_nested_free_var_in_iter."""
    return [c for c in [1] for [0, 1][[k for k in [1] if c][0]] in [2]]


check('comprehension_inside_subscript_target',
      comprehension_as_subscript_base, [1])


def subscript_target_in_generator():
    d = {}
    return (list(v for d['seen'] in [1] for v in [d['seen']]), d)


check('subscript_target_in_genexp', subscript_target_in_generator,
      ([1], {'seen': 1}))


def subscript_target_in_dictcomp():
    d = {}
    r = {k: k for d['n'] in [3] for k in [d['n']]}
    return (r, d)


check('subscript_target_in_dictcomp', subscript_target_in_dictcomp,
      ({3: 3}, {'n': 3}))


def unbound_target_element_raises():
    """``l`` is bound by the comprehension, so it is a COMPREHENSION-scope
    name -- and ``l[0]`` reads it before the tuple's second element assigns
    it.  CPython raises UnboundLocalError; Grail used to drop the ``l[0]``
    store silently and produce [1] instead (test_listcomps'
    test_unbound_local_inside_comprehension)."""
    l = [None]
    try:
        return [1 for (l[0], l) in [[1, 2]]]
    except UnboundLocalError:
        return 'UnboundLocalError'


check('subscript_element_reads_unbound_target',
      unbound_target_element_raises, 'UnboundLocalError')


# Plain-name targets, unchanged.
check('plain_name_target', lambda: [i * i for i in range(4)], [0, 1, 4, 9])
check('tuple_name_target',
      lambda: [a + b for a, b in [(1, 2), (3, 4)]], [3, 7])
check('nested_generators',
      lambda: [(i, j) for i in range(3) for j in range(i)],
      [(1, 0), (2, 0), (2, 1)])


# ------------------------------------------------------------ bare dir()

def dir_no_args():
    a = 1
    return dir()


check('bare_dir_lists_locals', dir_no_args, ['a'])


def dir_no_args_sorted():
    zz = 1
    aa = 2
    return dir()


check('bare_dir_is_sorted', dir_no_args_sorted, ['aa', 'zz'])
check('dir_with_argument_still_works', lambda: 'sort' in dir([]), True)
