"""Fixtures for the ``hash(a) == hash(b)'' invariant on a str-like that is not
an exact ``str''.

Driven by PythonTests>>SymbolStrHashEqTestCase, which sets the subject to a real
GemStone ``Symbol''.  Under CPython there is no Symbol, so ``__main__'' below
sets the subject to a plain ``class Symbol(str)'' subclass instead -- the point
of running this file under CPython is to pin what CPython ANSWERS for a str-like
that compares equal to a str, which is exactly the contract a Symbol has to meet.
Every check answers True in both places once Grail is right.

THE RULE.  Python guarantees that ``a == b'' implies ``hash(a) == hash(b)''.
Dicts and sets bucket by hash and only then compare by ``__eq__'', so an object
that breaks the implication is not found by an equal key -- silently, with no
error anywhere.

WHAT WAS WRONG IN GRAIL.  A GemStone ``Symbol'' is a String subclass, so it
satisfies ``isinstance(sym, str)'' and compares equal to the str with the same
characters, in both directions.  But ``Symbol >> hash'' answers the IDENTITY
hash (Symbols are canonical, so identity is equality for the VM), and Grail's
``__hash__'' for strings was ``^ self hash'' -- so::

    hash(#abc)   ->  61570      the identity hash
    hash('abc')  ->  6723039    the content hash

Equal objects, different hashes.  A Symbol key and its str therefore landed in
different buckets and never met: ``d = {sym: 1}; d['abc']'' raised KeyError, and
``{sym} & {'abc'}'' was empty.

WHY THE BIG-DICT CHECKS ARE HERE.  The bucket is ``hash \\ tableSize'', so in a
one-entry dict the two hashes could collide by LUCK, ``__eq__'' then matched, and
the lookup SUCCEEDED.  Measured on a leaked Symbol before the fix: the same probe
answered 1 from a 1-entry dict and raised KeyError from a 65-entry one.  A
one-entry check alone would have passed against the bug.

HOW A SYMBOL REACHES PYTHON.  ``sys.modules'' used to be Symbol-keyed and was
fixed at the source (PySysModules.gs), and every ordinary Python door -- globals(),
dir(), ``__dict__'', ``__name__'', f_locals, inspect.signature -- was measured
clean.  What is left is the Smalltalk/Python boundary itself: ``gemstone.mySymbolList''
hands Python live SymbolDictionaries whose keys ARE Symbols, and ``gemstone[name]''
answers whatever the Smalltalk global holds.  That boundary is open-ended, so the
fix is on the VALUE (Symbol >> __hash__), not on a list of leak sites.

Run this file under CPython (``python3 tests/python/symbol_str_hash_eq.py'') to
see what it produces.
"""

SUBJECT = None
TEXT = None


def use(subject, text):
    """Point the checks at ``subject'', which must compare equal to ``text''."""
    global SUBJECT, TEXT
    SUBJECT = subject
    TEXT = text
    return True


def _pad(n):
    """A dict of n distinct plain-str keys, big enough that bucket luck runs out."""
    return {'pad%d' % i: i for i in range(n)}


def it_is_an_instance_of_str():
    return isinstance(SUBJECT, str)


def it_is_equal_to_the_str_from_its_own_side():
    return (SUBJECT == TEXT) is True


def it_is_equal_to_the_str_from_the_str_side():
    return (TEXT == SUBJECT) is True


def hash_agrees_with_the_equal_str():
    return hash(SUBJECT) == hash(TEXT)


def hash_is_stable_across_calls():
    return hash(SUBJECT) == hash(SUBJECT)


def a_dict_keyed_by_it_is_found_by_the_str():
    d = {SUBJECT: 1}
    return d[TEXT] == 1 and TEXT in d and d.get(TEXT) == 1


def a_dict_keyed_by_the_str_is_found_by_it():
    d = {TEXT: 1}
    return d[SUBJECT] == 1 and SUBJECT in d and d.get(SUBJECT) == 1


def the_two_spellings_are_one_dict_entry():
    return len({SUBJECT: 1, TEXT: 2}) == 1


def a_big_dict_keyed_by_it_is_found_by_the_str():
    d = _pad(64)
    d[SUBJECT] = 99
    return len(d) == 65 and d[TEXT] == 99


def a_big_dict_keyed_by_the_str_is_found_by_it():
    d = _pad(64)
    d[TEXT] = 99
    return len(d) == 65 and d[SUBJECT] == 99


def deleting_by_the_other_spelling_works():
    d = {SUBJECT: 1}
    del d[TEXT]
    return len(d) == 0


def set_membership_holds_from_the_str_side():
    return TEXT in {SUBJECT}


def set_membership_holds_from_its_own_side():
    return SUBJECT in {TEXT}


def set_intersection_is_not_empty():
    return len({SUBJECT} & {TEXT}) == 1


def the_two_spellings_are_one_set_element():
    return len({SUBJECT, TEXT}) == 1


def a_big_set_finds_it_by_the_str():
    s = set(_pad(64)) | {SUBJECT}
    return len(s) == 65 and TEXT in s


def str_of_it_is_a_genuine_str():
    return type(str(SUBJECT)) is str


def str_of_it_keeps_the_characters():
    return str(SUBJECT) == TEXT


def str_of_it_can_be_copied_by_replace():
    return str(SUBJECT).replace(TEXT[0], 'Z') == TEXT.replace(TEXT[0], 'Z')


def concatenation_yields_a_genuine_str():
    return type(SUBJECT + '') is str


def formatting_yields_a_genuine_str():
    return type('%s' % (SUBJECT,)) is str


def it_still_reads_as_the_same_characters():
    return (len(SUBJECT) == len(TEXT)
            and SUBJECT in ('x' + TEXT + 'x')
            and TEXT.startswith(SUBJECT)
            and SUBJECT.upper() == TEXT.upper())


CHECKS = [
    'it_is_an_instance_of_str',
    'it_is_equal_to_the_str_from_its_own_side',
    'it_is_equal_to_the_str_from_the_str_side',
    'hash_agrees_with_the_equal_str',
    'hash_is_stable_across_calls',
    'a_dict_keyed_by_it_is_found_by_the_str',
    'a_dict_keyed_by_the_str_is_found_by_it',
    'the_two_spellings_are_one_dict_entry',
    'a_big_dict_keyed_by_it_is_found_by_the_str',
    'a_big_dict_keyed_by_the_str_is_found_by_it',
    'deleting_by_the_other_spelling_works',
    'set_membership_holds_from_the_str_side',
    'set_membership_holds_from_its_own_side',
    'set_intersection_is_not_empty',
    'the_two_spellings_are_one_set_element',
    'a_big_set_finds_it_by_the_str',
    'str_of_it_is_a_genuine_str',
    'str_of_it_keeps_the_characters',
    'str_of_it_can_be_copied_by_replace',
    'concatenation_yields_a_genuine_str',
    'formatting_yields_a_genuine_str',
    'it_still_reads_as_the_same_characters',
]


if __name__ == '__main__':
    class Symbol(str):
        """CPython's stand-in for a GemStone Symbol: equal to a str, not a str."""

    use(Symbol('abc'), 'abc')
    for name in CHECKS:
        answer = globals()[name]()
        print('%-4s %s' % ('OK' if answer is True else 'FAIL', name))
