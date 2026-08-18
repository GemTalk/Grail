"""Fixtures for NON-STRING keys in ``__dict__'' and ``globals()''.

Driven by PythonTests>>NamespaceNonStringKeyTestCase.  Each check answers True
when Grail agrees with CPython.

THE RULE.  An instance dict and a module dict are ordinary dicts in CPython, so
they take any hashable key -- ``inst.__dict__[0] = 1'' and ``globals()[0] = 1''
are both legal.  Such a key is simply unreachable through attribute SYNTAX,
because ``obj.x'' can only spell a string.  The mirror rule is that a non-string
ATTRIBUTE NAME is rejected: ``setattr(obj, 0, 1)'' raises
``TypeError: attribute name must be string, not 'int'''.

WHAT WAS WRONG.  Grail had the two rules the wrong way round -- it refused the
legal dict key and accepted the illegal attribute name.  The refusal is what this
fixture covers.

WHY IT WAS REFUSED, AND WHY THAT IS NOT A DICTIONARY SWAP.  A namespace dict is
not a dictionary at all in Grail: ``obj.__dict__'' is a LIVE VIEW
(PyInstanceDict, or PyModuleDict for a module) over GemStone dynamic instance
variables, and ``dynamicInstVarAt:put:'' is a primitive whose key must be a
Symbol.  Non-string keys now live in a real dict parked in one reserved Symbol
slot, which the view merges on read.  That is the same split CPython makes --
strings reachable as attributes, everything else dict-only -- expressed in the
storage Grail has.

HOW IT SURFACED.  test_traceback's suggestion tests.  CPython's traceback.py
sifts a ``__dir__'' result with ``isinstance(x, str)'' before offering a "Did you
mean", and two of its cases plant a non-string key first -- so the module body
could not even execute.

Run this file under CPython (``python3 tests/python/namespace_non_string_keys.py'')
to see what it produces.
"""


class CustomStr(str):
    pass


class Holder:
    bluch = 1


def _fresh():
    return Holder()


# --- an instance dict takes a non-string key ----------------------------

def an_int_key_can_be_stored():
    h = _fresh()
    h.__dict__[0] = 'zero'
    return h.__dict__[0] == 'zero'


def an_int_key_reports_present():
    h = _fresh()
    h.__dict__[0] = 'zero'
    return 0 in h.__dict__


def an_int_key_counts_towards_len():
    h = _fresh()
    h.__dict__['a'] = 1
    h.__dict__[0] = 2
    return len(h.__dict__) == 2


def an_int_key_appears_in_keys_as_an_int():
    """Not as the STRING '0'.  Stringifying it is the trap: it would then pass an
    ``isinstance(k, str)'' filter and read as a name."""
    h = _fresh()
    h.__dict__[0] = 1
    return sorted(type(k).__name__ for k in h.__dict__.keys()) == ['int']


def an_int_key_appears_in_items_as_an_int():
    h = _fresh()
    h.__dict__[0] = 1
    return [(type(k).__name__, v) for k, v in h.__dict__.items()] == [('int', 1)]


def an_int_key_can_be_popped():
    h = _fresh()
    h.__dict__[0] = 1
    return (h.__dict__.pop(0), len(h.__dict__)) == (1, 0)


def a_mixed_dict_keeps_both_kinds():
    h = _fresh()
    h.__dict__['name'] = 'v'
    h.__dict__[0] = 'z'
    return (len(h.__dict__) == 2
            and h.__dict__['name'] == 'v'
            and h.__dict__[0] == 'z')


def clearing_removes_a_non_string_key_too():
    h = _fresh()
    h.__dict__['name'] = 'v'
    h.__dict__[0] = 'z'
    h.__dict__.clear()
    return len(h.__dict__) == 0


def get_and_setdefault_reach_a_non_string_key():
    h = _fresh()
    h.__dict__[0] = 'z'
    return (h.__dict__.get(0) == 'z'
            and h.__dict__.get(1, 'dflt') == 'dflt'
            and h.__dict__.setdefault(0, 'other') == 'z'
            and h.__dict__.setdefault(2, 'new') == 'new')


# --- it stays invisible to attribute access -----------------------------

def a_non_string_key_is_not_an_attribute():
    """It cannot be, in CPython either: ``obj.x'' can only spell a string, so a
    non-string key is dict-only by construction rather than by omission."""
    h = _fresh()
    h.__dict__[0] = 1
    return getattr(h, 'bluch') == 1


def dir_still_reports_the_string_attributes():
    h = _fresh()
    h.__dict__[0] = 1
    h.__dict__['own'] = 2
    names = [x for x in h.__dir__() if isinstance(x, str)]
    return 'bluch' in names and 'own' in names


def dunder_dir_reports_the_key_itself_not_a_lookalike_string():
    """The check that ties this to the traceback tests: 0 must be in __dir__ and
    '0' must not, or CPython's ``isinstance(x, str)'' filter keeps it as a name."""
    h = _fresh()
    h.__dict__[0] = 1
    d = h.__dir__()
    return 0 in d and '0' not in d


# --- module globals ------------------------------------------------------

def globals_takes_a_non_string_key():
    g = globals()
    g[0] = 'zero'
    try:
        return g[0] == 'zero' and 0 in g and len([k for k in g if k == 0]) == 1
    finally:
        del g[0]


def deleting_a_non_string_global_works():
    g = globals()
    g[1] = 'one'
    del g[1]
    return 1 not in g


# --- a str SUBCLASS is a string, and stays an attribute -----------------

def a_str_subclass_key_is_reachable_as_an_attribute():
    """CPython treats a str subclass as a string everywhere, so it must land in
    the attribute store rather than the non-string side."""
    h = _fresh()
    h.__dict__[CustomStr('sk')] = 7
    return h.sk == 7


if __name__ == '__main__':
    checks = [
        an_int_key_can_be_stored,
        an_int_key_reports_present,
        an_int_key_counts_towards_len,
        an_int_key_appears_in_keys_as_an_int,
        an_int_key_appears_in_items_as_an_int,
        an_int_key_can_be_popped,
        a_mixed_dict_keeps_both_kinds,
        clearing_removes_a_non_string_key_too,
        get_and_setdefault_reach_a_non_string_key,
        a_non_string_key_is_not_an_attribute,
        dir_still_reports_the_string_attributes,
        dunder_dir_reports_the_key_itself_not_a_lookalike_string,
        globals_takes_a_non_string_key,
        deleting_a_non_string_global_works,
        a_str_subclass_key_is_reachable_as_an_attribute,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
