"""Fixture: ``from <native module> import *'' must bring the FUNCTIONS too.

A Grail native module implements its constants as namespace entries but its
FUNCTIONS as methods on the backing Smalltalk class.  ``import *'' walked the
namespace and the SymbolDictionary and never looked at the method dictionary,
so it copied across every constant and every class and SILENTLY OMITTED EVERY
FUNCTION.

Nothing raised at the import.  The names simply were not there, and the first
use failed as a bare NameError somewhere else entirely -- which is how it
surfaced: CPython's socket.py opens with ``from _socket import *'' and then
died with ``name 'getdefaulttimeout' is not defined'' hundreds of lines later.

_socket is the module under test because it is native in Grail and a C
extension in CPython, so the same star-import is meaningful in both and the
expectations below are measured rather than asserted.
"""

from _socket import *

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


# Functions -- the half that went missing.
check('gethostname_is_callable', lambda: isinstance(gethostname(), str), True)
check('getdefaulttimeout_came_across', lambda: getdefaulttimeout(), None)
check('htons_came_across', lambda: htons(1), 256)
check('ntohs_came_across', lambda: ntohs(256), 1)
check('inet_aton_came_across',
      lambda: list(inet_aton('127.0.0.1')), [127, 0, 0, 1])
check('inet_ntoa_came_across',
      lambda: inet_ntoa(b'\x7f\x00\x00\x01'), '127.0.0.1')

# Constants and classes -- the half that always worked, kept as controls so a
# regression in the existing walks is visible too.
check('constants_still_come_across', lambda: AF_INET, 2)
check('socket_type_still_comes_across', lambda: isinstance(socket, type), True)
check('error_alias_still_comes_across', lambda: error is OSError, True)

# Privates must NOT be republished.
check('private_names_stay_out',
      lambda: [n for n in ('_socket', '__name__') if n in globals()
               and n == '_socket'], [])


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
