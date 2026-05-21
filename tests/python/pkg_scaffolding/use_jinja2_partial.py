# Jinja2 is dropped into stdlib but `import jinja2` itself still
# fails: the lexer compiles a handful of regex literals at import
# time, and one of them trips Grail's pure-Python `re._parser` with
# an IndexError (the lookback in _parse_sub indexes past empty
# SubPattern data).  Until the regex engine handles that pattern,
# we exercise the surrounding plumbing: the new stdlib stubs
# (errno / fnmatch / threading / operator / urllib.parse) and the
# parser features (`async for` comprehensions, `yield from`) that
# made it possible to even reach lexer.py.


import errno
import fnmatch
import operator
import threading
from urllib.parse import quote_from_bytes, quote_plus


def errno_exists():
    return errno.EEXIST == 17


def fnmatch_glob():
    return fnmatch.filter(['a.py', 'b.txt', 'c.py'], '*.py')


def operator_arithmetic():
    return (
        operator.add(2, 3),
        operator.mul(4, 5),
        operator.truediv(10, 4),
    )


def operator_itemgetter_two_step():
    # Two-step form because Grail's CallAst doesn't dispatch __call__
    # on a user-class instance when the call site is `g(args)`.
    # Construct first, then explicitly send __call__ via a name.
    g = operator.itemgetter(1)
    return g.__call__(['a', 'b', 'c'])


def threading_lock_context():
    lock = threading.Lock()
    with lock:
        return lock.locked()


def urllib_quote_round_trip():
    return quote_from_bytes(b'<hello world>', safe='')


def urllib_quote_plus():
    return quote_plus('hello world')
