"""A module with more than 255 globals.

Grail keeps a module's globals in GemStone dynamic instVars, which cap at 255
per object, so the 256th global stopped the program with an uncatchable
ImproperOperation: a module of 300 plain assignments could not be imported.
CPython has no such limit.  Globals past the ceiling now go to an unbounded
holder, and every read, store, delete and listing finds them there.

This module crosses the ceiling in its own body, then binds a name of every
kind past it, and later stores more from functions (a runtime store, after the
body).

Every EXPECTED value was produced by running this file under CPython 3.14.8
(``--emit``), not written by hand.
"""

import sys

for _i in range(300):
    globals()['g%d' % _i] = _i

# Past the ceiling now: every kind of binding the compiler emits.
after_assign = 10
after_assign += 5
after_a, after_b = 'a', 'b'
for after_loop in range(3):
    pass
import json as after_json
from os import sep as after_sep


def after_def():
    return 'first'


def after_def():
    return 'second'


class AfterClass:
    attr = 'class attr'


after_annotated: int = 7
if (after_walrus := 8):
    pass
exec('after_exec = 9', globals())

g10 += 1000
del g20
_THIS = sys.modules[__name__]


def _names():
    return [k for k in globals() if k[:1] == 'g' and k[1:].isdigit()]


def _runtime():
    global after_runtime, g299
    after_runtime = 'stored from a function'
    g299 = -1
    setattr(_THIS, 'after_setattr', 'via setattr')
    out = [after_runtime, g299, getattr(_THIS, 'after_setattr'),
           after_setattr]
    del globals()['after_setattr']
    try:
        after_setattr
    except NameError as e:
        out.append(str(e))
    return out


def _results():
    names = _names()
    return {
        'count': len(names),
        'order': names == ['g%d' % i for i in range(300) if i != 20],
        'first_and_last': (g0, g255, g256, g298),
        'aug_assign': (after_assign, g10),
        'deleted': ('g20' in globals(), hasattr(_THIS, 'g20')),
        'unpack_and_loop': (after_a, after_b, after_loop),
        'imports': (after_json.dumps([1]), after_sep == __import__('os').sep),
        'rebound_def': after_def(),
        'class': (AfterClass.__name__, AfterClass().attr),
        'annotated': (after_annotated,
                      _THIS.__annotations__.get('after_annotated') is int),
        'walrus_and_exec': (after_walrus, after_exec),
        'module_attrs': (getattr(_THIS, 'g257'), _THIS.after_assign,
                         'after_def' in dir(_THIS), vars(_THIS)['g256']),
        'runtime': _runtime(),
        'runtime_listed': ('after_runtime' in globals(),
                           'after_setattr' in globals()),
    }


EXPECTED = {
    'count': 299,
    'order': True,
    'first_and_last': (0, 255, 256, 298),
    'aug_assign': (15, 1010),
    'deleted': (False, False),
    'unpack_and_loop': ('a', 'b', 2),
    'imports': ('[1]', True),
    'rebound_def': 'second',
    'class': ('AfterClass', 'class attr'),
    'annotated': (7, True),
    'walrus_and_exec': (8, 9),
    'module_attrs': (257, 15, True, 256),
    'runtime': ['stored from a function', -1, 'via setattr', 'via setattr',
                "name 'after_setattr' is not defined"],
    'runtime_listed': (True, False),
}

RESULTS = {k: (v == EXPECTED.get(k)) or 'got: %r' % (v,)
           for k, v in _results().items()}


if __name__ == '__main__':
    if sys.argv[1:] == ['--emit']:
        for k, v in _results().items():
            print('    %r: %r,' % (k, v))
    else:
        for _name in sorted(RESULTS):
            _v = RESULTS[_name]
            print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
                  '' if _v is True else _v)
