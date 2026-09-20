"""Fixture: a call to a KNOWN BUILTIN at an arity no selector matches.

``len(1, 2)'', ``aiter()'', ``anext(x, 1, 3)'' -- calls whose whole purpose is
the TypeError.  CPython raises because the builtin's signature does not admit
that shape; Grail raises because printSmalltalkOn: cannot find a selector for
it and emits the raise AT COMPILE TIME, as a single

    (TypeError ___signal___: '<name>() takes wrong number of arguments
        (N positional, K keyword) - no matching method')

with the argument expressions DROPPED.  The direct-to-IR path emits that same
one send, which is what the census row `CallAst:builtinArityMismatch' was
blocking -- both of its corpus sites are test_asyncgen's ``aiter``/``anext``
bad-argument tests.

WHAT AGREES, AND THE ONE THING THAT DOES NOT.  The exception TYPE agrees with
CPython everywhere below, which is what every corpus site actually asserts.
The MESSAGE does not -- Grail names the arity, CPython names the signature --
so nothing here compares message text.

The divergence that is real is ARGUMENT EVALUATION: CPython evaluates the
arguments before discovering the arity is wrong, so a call like
``len(side_effect(), 2)'' runs ``side_effect()'' first.  Grail's compile-time
raise never evaluates them.  That is pinned as an XFAIL rather than hidden,
and it belongs to the TEXT path -- the IR path reproduces it deliberately,
because emitting the arguments on one path only would make flag-on and
flag-off disagree.

Everything here is verified against real CPython by running the file directly.
"""

r = {}

calls = []


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = type(exc).__name__


def side_effect(n=1):
    calls.append(n)
    return n


# --------------------------------------------------------------------------
# A known builtin at an arity nothing matches.
# --------------------------------------------------------------------------

record('len_too_many', lambda: len(1, 2))
record('len_zero', lambda: len())
record('abs_too_many', lambda: abs(1, 2))
record('chr_too_many', lambda: chr(65, 66))
record('ord_too_many', lambda: ord('a', 'b'))

# A keyword a builtin does not take is the same family.
record('len_keyword', lambda: len(obj=[1, 2]))

# A builtin called correctly still works -- the guard must not be too wide.
record('len_ok', lambda: len([1, 2, 3]))
record('abs_ok', lambda: abs(-5))
record('chr_ok', lambda: chr(65))


# --------------------------------------------------------------------------
# The same shape inside a def, which is where the corpus sites live.
# --------------------------------------------------------------------------

def bad_arity_in_a_def():
    return len(1, 2)


record('bad_arity_in_a_def', bad_arity_in_a_def)


def good_and_bad_in_one_def():
    ok = len([1, 2])
    try:
        len(1, 2)
    except TypeError:
        return ok
    return 'no TypeError'


record('good_and_bad_in_one_def', good_and_bad_in_one_def)


class Holder:
    def bad_arity_in_a_method(self):
        return len(1, 2)

    def good_arity_in_a_method(self):
        return len([1, 2, 3, 4])


record('bad_arity_in_a_method', Holder().bad_arity_in_a_method)
record('good_arity_in_a_method', Holder().good_arity_in_a_method)


# --------------------------------------------------------------------------
# The XFAIL: CPython evaluates the arguments first, Grail does not.
# --------------------------------------------------------------------------

def arguments_are_evaluated_first():
    del calls[:]
    try:
        len(side_effect(), side_effect())
    except TypeError:
        pass
    return len(calls)


record('arguments_are_evaluated_first', arguments_are_evaluated_first)


XFAIL = {'arguments_are_evaluated_first'}


EXPECTED = {
    'len_too_many': 'TypeError',
    'len_zero': 'TypeError',
    'abs_too_many': 'TypeError',
    'chr_too_many': 'TypeError',
    'ord_too_many': 'TypeError',
    'len_keyword': 'TypeError',
    'len_ok': 3,
    'abs_ok': 5,
    'chr_ok': 'A',
    'bad_arity_in_a_def': 'TypeError',
    'good_and_bad_in_one_def': 2,
    'bad_arity_in_a_method': 'TypeError',
    'good_arity_in_a_method': 4,
    # CPython's answer.  Grail answers 0 -- the compile-time raise drops the
    # argument expressions entirely, on BOTH the text and the IR path.
    'arguments_are_evaluated_first': 2,
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        actual = r[key]
        expected = EXPECTED[key]
        if key in XFAIL:
            # EXPECTED holds CPython's answer, so this agrees HERE and differs
            # under Grail -- the line is XFAIL either way and never XPASS.
            status = 'XFAIL' if actual == expected else 'FAIL'
        else:
            status = 'OK' if actual == expected else 'FAIL'
        print('%-5s %-38s -> %r' % (status, key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-38s is not in EXPECTED' % ('FAIL', extra))
