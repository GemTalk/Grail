"""``sys.modules`` keys are genuine ``str`` -- and why "genuine" is the word.

Grail's sys.modules used to be a GemStone SymbolDictionary, so every key was a
Symbol.  A Symbol answers True to ``isinstance(k, str)``, which is exactly what
made it dangerous: ordinary defensive code checks that, decides it is holding a
string, and proceeds.  Then it calls a str method that COPIES --

    sys.modules[mod.replace(target, 'chardet')] = sys.modules[mod]

which is ``requests/packages.py``, run at ``import requests`` -- and a Symbol is
an INVARIANT object, so the copy died with a Smalltalk error that ``except
BaseException`` cannot catch and that takes the process with it.

So ``isinstance(k, str)`` is not the check that would have caught this, and a
fixture that used it would have passed against the bug.  The checks below ask
for ``type(k) is str`` instead, and CONTROL_* proves that predicate can tell the
two apart: a ``str`` SUBCLASS is the portable stand-in for a Symbol -- passes
isinstance, fails ``type(k) is str`` -- and the control asserts the predicate
answers False for a mapping keyed by one.  Without that control a check reading
"all keys are str" against an empty or already-correct mapping proves nothing.

Everything here is CPython behaviour; measured against CPython 3.14.
"""

import sys

RESULTS = {}


def check(name, fn, expected=True):
    try:
        RESULTS[name] = (fn() == expected)
    except BaseException as exc:            # noqa: BLE001 - report, don't die
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


# --------------------------------------------------------------- the predicate

def all_keys_exactly_str(mapping):
    """True when EVERY key is a str and not merely str-ish (a subclass)."""
    return all(type(k) is str for k in mapping)


class _StrSubclass(str):
    """Stands in for the old Symbol key: str-ish enough to fool isinstance."""


_DECOY = {_StrSubclass('decoy'): 1}


# ------------------------------------------------------- the negative controls
#
# The instrument first: prove the predicate can SEE a key that is not exactly a
# str, and prove that the check the bug slipped past (isinstance) cannot.

check('CONTROL_predicate_rejects_str_subclass',
      lambda: all_keys_exactly_str(_DECOY), False)

check('CONTROL_isinstance_would_have_passed',
      lambda: all(isinstance(k, str) for k in _DECOY), True)


# ------------------------------------------------------------------- the keys

check('keys_are_exactly_str', lambda: all_keys_exactly_str(sys.modules))

check('keys_view_is_exactly_str',
      lambda: all_keys_exactly_str(sys.modules.keys()))

check('item_keys_are_exactly_str',
      lambda: all(type(k) is str for k, _ in sys.modules.items()))

check('list_of_modules_is_exactly_str',
      lambda: all(type(k) is str for k in list(sys.modules)))

check('keys_are_unique', lambda: len(set(sys.modules)) == len(sys.modules))


# ------------------------------------------------- str methods that COPY work
#
# This is the actual failure: replace() builds a new string, and building one
# from a Symbol raised an uncatchable error.

def _replace_every_key():
    out = [mod.replace('s', 'S') for mod in list(sys.modules)]
    return len(out) == len(list(sys.modules)) and all(type(x) is str for x in out)


check('every_key_survives_replace', _replace_every_key)


def _requests_packages_loop():
    """The shape of requests/packages.py, over a throwaway copy of the table."""
    target = 'chardet'
    seen = 0
    for mod in list(sys.modules):
        if mod == target or mod.startswith(target + '.'):
            seen += 1
        mod.replace(target, 'charset_normalizer')
    return seen >= 0


check('requests_packages_loop_shape', _requests_packages_loop)

check('keys_support_the_rest_of_str',
      lambda: all(type(k.upper()) is str
                  and k.split('.')[0] == k.partition('.')[0]
                  and k.startswith(k[:1])
                  and (k + '!')[:-1] == k
                  for k in sys.modules))


# ------------------------------------------------ membership, get, set, delete

check('module_is_reachable_by_its_name',
      lambda: 'sys' in sys.modules and sys.modules.get('sys') is sys)

check('get_misses_answer_none',
      lambda: sys.modules.get('no_such_module_anywhere') is None)

check('mapping_is_a_dict', lambda: isinstance(sys.modules, dict))

check('mapping_type_name_is_dict',
      lambda: type(sys.modules).__name__ == 'dict')


_PROBE = 'grail_sys_modules_probe'
_SENTINEL = ['a value that is not a module']

sys.modules[_PROBE] = _SENTINEL

check('assigned_entry_reads_back', lambda: sys.modules[_PROBE] is _SENTINEL)
check('assigned_entry_is_a_member', lambda: _PROBE in sys.modules)
check('assigned_key_is_exactly_str',
      lambda: [type(k) for k in sys.modules if k == _PROBE] == [str])

del sys.modules[_PROBE]

check('deleted_entry_is_gone', lambda: _PROBE not in sys.modules)
check('deleted_entry_get_is_none', lambda: sys.modules.get(_PROBE) is None)
check('deleted_key_left_no_ghost',
      lambda: len([k for k in sys.modules if k == _PROBE]) == 0)



def _raises_keyerror(name):
    try:
        sys.modules[name]
    except KeyError:
        return True
    return False


check('deleted_entry_raises_keyerror', lambda: _raises_keyerror(_PROBE))

check('setdefault_and_pop_round_trip',
      lambda: (sys.modules.setdefault(_PROBE, _SENTINEL) is _SENTINEL
               and sys.modules.pop(_PROBE) is _SENTINEL
               and _PROBE not in sys.modules))


# --------------------------------------------------------- iteration integrity

check('iteration_visits_every_entry',
      lambda: len([k for k in sys.modules]) == len(sys.modules))

check('iteration_agrees_with_keys',
      lambda: [k for k in sys.modules] == list(sys.modules.keys()))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
