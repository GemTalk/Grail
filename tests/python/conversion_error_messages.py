"""A built-in that rejects its argument says so in CPython's words.

The TypeError a conversion or protocol builtin raises names the argument's
Python type, and Grail named the Smalltalk class behind it: ``float(object())``
said ``'Object'``, a function ``'BoundMethod'`` and a module the module's own
name.  Some messages also had the wrong wording:

* ``int(x)``: Python 2's "must be a string or a number", with no type;
* ``bytes(x)`` / ``bytearray(x)``: "'X' object is not iterable", where CPython
  says "cannot convert 'X' object to bytes";
* ``next(x)``: "not iterable" instead of "not an iterator";
* ``reversed(f)``: "has no len()", because a function's subscript refusal looked
  like a real ``__getitem__``;
* ``ord(x)``: "expected a character, but string of length 0" for a non-string.

Self-running: ``python3 conversion_error_messages.py`` prints one line per check
against what CPython 3.14 answers.
"""

import json
import math
import operator


class Plain:
    pass


def plain_function():
    pass


ARGUMENTS = (("object", object()), ("instance", Plain()), ("function", plain_function), ("module", json))

OPERATIONS = (
    ("float", float), ("int", int), ("bytes", bytes), ("bytearray", bytearray), ("next", next),
    ("len", len), ("math_floor", math.floor), ("math_ceil", math.ceil), ("math_trunc", math.trunc),
    ("math_sqrt", math.sqrt), ("hex", hex), ("chr", chr), ("operator_index", operator.index), ("ord", ord),
)


def _message(action, argument):
    try:
        action(argument)
        return "ok"
    except Exception as e:
        return "%s: %s" % (type(e).__name__, e)


r = {name: tuple(_message(action, argument) for _, argument in ARGUMENTS) for name, action in OPERATIONS}
r["reversed_function"] = _message(reversed, plain_function)
r["reversed_object"] = _message(reversed, object())
r["still_converts"] = (float("1.5"), int("12"), bytes([65]), bytearray(b"a"), next(iter([7])), len([1, 2]),
                       math.floor(2.5), ord("A"), ord(b"A"), list(reversed([1, 2])))

EXPECTED = {
    'bytearray': (
        "TypeError: cannot convert 'object' object to bytearray",
        "TypeError: cannot convert 'Plain' object to bytearray",
        "TypeError: cannot convert 'function' object to bytearray",
        "TypeError: cannot convert 'module' object to bytearray",
    ),
    'bytes': (
        "TypeError: cannot convert 'object' object to bytes",
        "TypeError: cannot convert 'Plain' object to bytes",
        "TypeError: cannot convert 'function' object to bytes",
        "TypeError: cannot convert 'module' object to bytes",
    ),
    'chr': (
        "TypeError: 'object' object cannot be interpreted as an integer",
        "TypeError: 'Plain' object cannot be interpreted as an integer",
        "TypeError: 'function' object cannot be interpreted as an integer",
        "TypeError: 'module' object cannot be interpreted as an integer",
    ),
    'float': (
        "TypeError: float() argument must be a string or a real number, not 'object'",
        "TypeError: float() argument must be a string or a real number, not 'Plain'",
        "TypeError: float() argument must be a string or a real number, not 'function'",
        "TypeError: float() argument must be a string or a real number, not 'module'",
    ),
    'hex': (
        "TypeError: 'object' object cannot be interpreted as an integer",
        "TypeError: 'Plain' object cannot be interpreted as an integer",
        "TypeError: 'function' object cannot be interpreted as an integer",
        "TypeError: 'module' object cannot be interpreted as an integer",
    ),
    'int': (
        "TypeError: int() argument must be a string, a bytes-like object or a real number, not 'object'",
        "TypeError: int() argument must be a string, a bytes-like object or a real number, not 'Plain'",
        "TypeError: int() argument must be a string, a bytes-like object or a real number, not 'function'",
        "TypeError: int() argument must be a string, a bytes-like object or a real number, not 'module'",
    ),
    'len': (
        "TypeError: object of type 'object' has no len()",
        "TypeError: object of type 'Plain' has no len()",
        "TypeError: object of type 'function' has no len()",
        "TypeError: object of type 'module' has no len()",
    ),
    'math_ceil': (
        'TypeError: must be real number, not object',
        'TypeError: must be real number, not Plain',
        'TypeError: must be real number, not function',
        'TypeError: must be real number, not module',
    ),
    'math_floor': (
        'TypeError: must be real number, not object',
        'TypeError: must be real number, not Plain',
        'TypeError: must be real number, not function',
        'TypeError: must be real number, not module',
    ),
    'math_sqrt': (
        'TypeError: must be real number, not object',
        'TypeError: must be real number, not Plain',
        'TypeError: must be real number, not function',
        'TypeError: must be real number, not module',
    ),
    'math_trunc': (
        "TypeError: type object doesn't define __trunc__ method",
        "TypeError: type Plain doesn't define __trunc__ method",
        "TypeError: type function doesn't define __trunc__ method",
        "TypeError: type module doesn't define __trunc__ method",
    ),
    'next': (
        "TypeError: 'object' object is not an iterator",
        "TypeError: 'Plain' object is not an iterator",
        "TypeError: 'function' object is not an iterator",
        "TypeError: 'module' object is not an iterator",
    ),
    'operator_index': (
        "TypeError: 'object' object cannot be interpreted as an integer",
        "TypeError: 'Plain' object cannot be interpreted as an integer",
        "TypeError: 'function' object cannot be interpreted as an integer",
        "TypeError: 'module' object cannot be interpreted as an integer",
    ),
    'ord': (
        'TypeError: ord() expected string of length 1, but object found',
        'TypeError: ord() expected string of length 1, but Plain found',
        'TypeError: ord() expected string of length 1, but function found',
        'TypeError: ord() expected string of length 1, but module found',
    ),
    'reversed_function':
        "TypeError: 'function' object is not reversible",
    'reversed_object':
        "TypeError: 'object' object is not reversible",
    'still_converts': (
        1.5,
        12,
        b'A',
        bytearray(b'a'),
        7,
        2,
        2,
        65,
        65,
        [2, 1],
    ),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-18s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    print(SUMMARY)
