"""Fixture: what exec() binds dies with the namespace it was bound in.

CPython frees an exec() namespace like any other dict: once nothing refers to
it, its values are released, and a generator among them is finalized -- which
is what test_generators' test_generator_resurrect checks, resurrecting the
generator from its own except clause.

Grail compiles exec()'d source as a doit that reaches its globals through
SymbolAssociations it holds as literals, and session tables keyed by compiled
methods -- the doit scope and filename registries, the block-to-code table
and the def-site slot table -- held the doit and its blocks strongly.  So
everything an exec() bound stayed alive for the rest of the session: the
generator was never finalized, and a plain object never died.

The last two checks are the other half: a function that outlives its exec()
still has its globals, its name, its code and its frame's f_globals, so the
tables must not lose what is still alive.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import sys
import textwrap
import types
import weakref

from test import support

r = {}


def attempt(thunk):
    try:
        return thunk()
    except Exception as exception:
        return '%s: %s' % (type(exception).__name__, exception)


class Marker:
    pass


def a_generator_bound_by_exec_is_finalized_and_resurrected():
    resurrected = []
    exec(textwrap.dedent("""
        def gen():
            try:
                yield
            except:
                resurrected.append(g)

        g = gen()
        next(g)
    """), {"resurrected": resurrected})
    support.gc_collect()
    return [len(resurrected), [isinstance(g.gi_code, types.CodeType) for g in resurrected]]


def a_generator_bound_by_exec_runs_its_finally():
    closed = []
    exec(textwrap.dedent("""
        def gen():
            try:
                yield
            finally:
                closed.append('closed')

        g = gen()
        next(g)
    """), {"closed": closed})
    support.gc_collect()
    return closed


def an_object_bound_by_exec_dies_with_its_namespace():
    namespace = {"Marker": Marker}
    exec("x = Marker()", namespace)
    ref = weakref.ref(namespace["x"])
    del namespace
    support.gc_collect()
    return ref() is None


def a_function_and_its_global_die_with_their_namespace():
    namespace = {"Marker": Marker}
    exec("x = Marker()\ndef f():\n    return x\n", namespace)
    refs = [weakref.ref(namespace["x"]), weakref.ref(namespace["f"])]
    del namespace
    support.gc_collect()
    return [ref() is None for ref in refs]


def a_function_that_outlives_its_exec_keeps_its_globals():
    namespace = {"Marker": Marker}
    exec("x = Marker()\ndef f():\n    return x\n", namespace)
    f = namespace["f"]
    del namespace
    support.gc_collect()
    return [type(f()).__name__, f.__name__, f.__code__.co_name]


def a_frame_of_a_function_that_outlives_its_exec_knows_its_globals():
    namespace = {"sys": sys}
    exec("marker = 'exec globals'\ndef f():\n    return sys._getframe().f_globals['marker']\n",
         namespace)
    f = namespace["f"]
    del namespace
    support.gc_collect()
    return attempt(f)


for check in (
        a_generator_bound_by_exec_is_finalized_and_resurrected,
        a_generator_bound_by_exec_runs_its_finally,
        an_object_bound_by_exec_dies_with_its_namespace,
        a_function_and_its_global_die_with_their_namespace,
        a_function_that_outlives_its_exec_keeps_its_globals,
        a_frame_of_a_function_that_outlives_its_exec_knows_its_globals):
    r[check.__name__] = attempt(check)


EXPECTED = {
    'a_generator_bound_by_exec_is_finalized_and_resurrected': [1, [True]],
    'a_generator_bound_by_exec_runs_its_finally': ['closed'],
    'an_object_bound_by_exec_dies_with_its_namespace': True,
    'a_function_and_its_global_die_with_their_namespace': [True, True],
    'a_function_that_outlives_its_exec_keeps_its_globals': ['Marker', 'f', 'f'],
    'a_frame_of_a_function_that_outlives_its_exec_knows_its_globals': 'exec globals',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-62s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
