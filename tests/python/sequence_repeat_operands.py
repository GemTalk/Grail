"""Repeating a sequence by something that is not an int raises CPython's
TypeError, and the operand's ``__rmul__`` still answers first.

``[1] * 'x'`` recursed until RecursionError: list's ``__mul__`` declined the
str and asked str's ``__rmul__``, whose built-in repeat sent str's ``__mul__``
the list, which declined and asked list's ``__rmul__``, and so on.  Any two
built-in sequences did it, and so did a sequence with a complex.  CPython never
asks a built-in sequence's repeat as a reflected multiply; once both operands
decline it raises ``can't multiply sequence by non-int of type 'str'``.

bytes and bytearray raised their own ``can't multiply sequence by non-int``
without the type, and without asking the operand's ``__rmul__`` at all.

Self-running: ``python3 sequence_repeat_operands.py`` prints one line per check
against what CPython 3.14 answers.
"""


class Reflects:
    def __rmul__(self, other):
        return "Reflects.__rmul__"


class Index:
    def __index__(self):
        return 2


def _outcome(action):
    try:
        return "ok -> %r" % (action(),)
    except Exception as e:
        return "%s: %s" % (type(e).__name__, e)


def _augmented(value, operand):
    value *= operand
    return value


r = {
    "list_by_a_str": _outcome(lambda: [1] * "x"),
    "tuple_by_a_str": _outcome(lambda: (1,) * "x"),
    "str_by_a_list": _outcome(lambda: "ab" * [2]),
    "str_by_a_tuple": _outcome(lambda: "ab" * (2,)),
    "list_by_a_tuple": _outcome(lambda: [1] * (2,)),
    "a_complex_and_a_str": (_outcome(lambda: 1j * "x"), _outcome(lambda: "x" * 1j)),
    "bytes_by_a_str": _outcome(lambda: b"ab" * "x"),
    "a_str_by_bytes": _outcome(lambda: "x" * b"ab"),
    "a_float_and_bytes": (_outcome(lambda: 1.5 * b"ab"), _outcome(lambda: b"ab" * 1.5)),
    "bytearray_by_a_float": _outcome(lambda: bytearray(b"ab") * 1.5),
    "augmented": (_outcome(lambda: _augmented([1], "x")), _outcome(lambda: _augmented(bytearray(b"ab"), "x"))),
    "augmented_by_a_reflecting_operand": (_augmented([1], Reflects()), _augmented(bytearray(b"ab"), Reflects())),
    "the_reflected_dunder_answers": ([1] * Reflects(), "ab" * Reflects(), b"ab" * Reflects(),
                                     bytearray(b"ab") * Reflects()),
    "an_int_still_repeats": ([1] * 2, 2 * "ab", b"ab" * 2, 2 * (1,), bytearray(b"a") * 2),
    "an_index_still_repeats": ([1] * Index(), "ab" * Index(), b"ab" * Index()),
}

EXPECTED = {
    'a_complex_and_a_str': (
        "TypeError: can't multiply sequence by non-int of type 'complex'",
        "TypeError: can't multiply sequence by non-int of type 'complex'",
    ),
    'a_float_and_bytes': (
        "TypeError: can't multiply sequence by non-int of type 'float'",
        "TypeError: can't multiply sequence by non-int of type 'float'",
    ),
    'a_str_by_bytes': "TypeError: can't multiply sequence by non-int of type 'bytes'",
    'an_index_still_repeats': ([1, 1], 'abab', b'abab'),
    'an_int_still_repeats': ([1, 1], 'abab', b'abab', (1, 1), bytearray(b'aa')),
    'augmented': (
        "TypeError: can't multiply sequence by non-int of type 'str'",
        "TypeError: can't multiply sequence by non-int of type 'str'",
    ),
    'augmented_by_a_reflecting_operand': ('Reflects.__rmul__', 'Reflects.__rmul__'),
    'bytearray_by_a_float': "TypeError: can't multiply sequence by non-int of type 'float'",
    'bytes_by_a_str': "TypeError: can't multiply sequence by non-int of type 'str'",
    'list_by_a_str': "TypeError: can't multiply sequence by non-int of type 'str'",
    'list_by_a_tuple': "TypeError: can't multiply sequence by non-int of type 'tuple'",
    'str_by_a_list': "TypeError: can't multiply sequence by non-int of type 'list'",
    'str_by_a_tuple': "TypeError: can't multiply sequence by non-int of type 'tuple'",
    'the_reflected_dunder_answers': ('Reflects.__rmul__', 'Reflects.__rmul__', 'Reflects.__rmul__',
                                     'Reflects.__rmul__'),
    'tuple_by_a_str': "TypeError: can't multiply sequence by non-int of type 'str'",
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-28s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    print(SUMMARY)
