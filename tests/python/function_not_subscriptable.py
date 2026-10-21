"""No function or method subscripts, and ``weakref.ref`` is a class.

Every Grail function -- a builtin, a ``def``, a bound method -- answered a
subscript with itself, a PEP 585 pass-through written while ``type`` was itself
a function.  So ``len[int]`` succeeded, ``hasattr(len, '__getitem__')`` was True
and duck-typed code could take a function for a sequence.  In CPython each is a
TypeError, and ``hasattr`` says False.

The one name CPython subscripts that Grail still made a function was
``weakref.ref``; it is ``weakref.ReferenceType`` now, as in CPython, which also
makes ``isinstance(r, weakref.ref)`` work -- blinker makes that test for every
receiver of a Flask signal, and it raised TypeError.

Self-running: ``python3 function_not_subscriptable.py`` prints one line per
check against what CPython 3.14 answers.
"""

import weakref


def plain_function():
    pass


class Owner:
    def method(self):
        pass


class Referent:
    pass


def _outcome(action):
    try:
        return "ok -> %r" % (action(),)
    except Exception as e:
        return "%s: %s" % (type(e).__name__, e)


def _receivers_for(receivers):
    # blinker.base.Signal.receivers_for, the shape that found it.
    found = []
    for receiver in receivers:
        if isinstance(receiver, weakref.ref):
            strong = receiver()
            if strong is None:
                continue
            receiver = strong
        found.append(type(receiver).__name__)
    return found


_referent = Referent()
_fired = []


class _KeyedRef(weakref.ref):
    pass


r = {
    "builtin_subscript": _outcome(lambda: len[int]),
    "def_subscript": _outcome(lambda: plain_function[int]),
    "method_subscript": _outcome(lambda: Owner().method[int]),
    "builtin_has_getitem": hasattr(len, "__getitem__"),
    "def_has_getitem": hasattr(plain_function, "__getitem__"),
    "method_has_getitem": hasattr(Owner().method, "__getitem__"),
    "generic_aliases_still_subscript": _outcome(
        lambda: [alias is not None for alias in (list[int], dict[str, int], type[int], weakref.ref[int])]),
    "ref_is_reference_type": weakref.ref is weakref.ReferenceType,
    "ref_is_a_class": isinstance(weakref.ref, type),
    "isinstance_ref": isinstance(weakref.ref(_referent), weakref.ref),
    "ref_dereferences": weakref.ref(_referent)() is _referent,
    "ref_with_none_callback": weakref.ref(_referent, None)() is _referent,
    "ref_with_callback": weakref.ref(_referent, _fired.append)() is _referent,
    "ref_subclass": _outcome(lambda: type(_KeyedRef(_referent)).__name__),
    "receivers_for": _receivers_for([weakref.ref(_referent), plain_function]),
}

EXPECTED = {
    'builtin_has_getitem': False,
    'builtin_subscript': "TypeError: 'builtin_function_or_method' object is not subscriptable",
    'def_has_getitem': False,
    'def_subscript': "TypeError: 'function' object is not subscriptable",
    'generic_aliases_still_subscript': 'ok -> [True, True, True, True]',
    'isinstance_ref': True,
    'method_has_getitem': False,
    'method_subscript': "TypeError: 'method' object is not subscriptable",
    'receivers_for': ['Referent', 'function'],
    'ref_dereferences': True,
    'ref_is_a_class': True,
    'ref_is_reference_type': True,
    'ref_subclass': "ok -> '_KeyedRef'",
    'ref_with_callback': True,
    'ref_with_none_callback': True,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-32s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    print(SUMMARY)
