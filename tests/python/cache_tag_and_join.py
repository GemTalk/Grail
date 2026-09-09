"""`sys.implementation.cache_tag`, and the `join` bug it exposed.

`cache_tag` names the bytecode-cache files an implementation would write
-- `__pycache__/x.<tag>.pyc`.  PEP 421 lets it be None when caching does
not apply, and Grail's was None, which is defensible on its face: nothing
here writes a .pyc.

It was the wrong answer anyway, because the tag is used for PATH
ARITHMETIC far more than for reading files.  `importlib.util
.cache_from_source` RAISES on a None tag, so every caller that merely
wants to KNOW the path got an exception instead of a string -- including
CPython's own test_reprlib, whose `_check_path_limitations` computes the
cached path's LENGTH to decide whether to skip on Windows.  It never
opens it.  Five LongReprTest cases died in that helper, none of them
about caching.

THE TAG IS DERIVED from `name` and `version` rather than written out, so
the two cannot drift: CPython's shape is `<name>-<major><minor>`, giving
`cpython-314` there and `grail-314` here.

AND IT EXPOSED A REAL PATH BUG.  With a tag in place, `cache_from_source
('x.py')` answered `/__pycache__/x.grail-314.pyc` -- with a LEADING
SLASH, because the first component is the empty dirname of a bare
filename and `os.path.join('', 'a')` answered `/a`.  That turns a
RELATIVE path into an ABSOLUTE one, which is the kind of thing that goes
unnoticed until something writes to the wrong place.

`os.path.join` and `posixpath.join` were wrong in OPPOSITE directions:
the Smalltalk one added a separator after an empty accumulator, the
vendored Python one skipped empty components entirely (`if not p:
continue`, which CPython does not have) and so dropped the trailing
separator that says "directory".

Every expectation was checked against CPython 3.14 first.
"""

import importlib.util
import os
import posixpath
import sys

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


def _outcome(fn):
    try:
        return ('ok', fn())
    except BaseException as exc:
        return (type(exc).__name__, str(exc)[:60])


# ------------------------------------------------------- the tag itself

def _the_tag_exists():
    return sys.implementation.cache_tag is not None


def _the_tag_is_derived():
    """`<name>-<major><minor>`, so it cannot drift from the values it is
    built out of."""
    impl = sys.implementation
    expected = '%s-%d%d' % (impl.name, impl.version[0], impl.version[1])
    return sys.implementation.cache_tag == expected


def _the_tag_names_this_implementation():
    """Not CPython's.  A .pyc claiming to be CPython's would be a file no
    CPython could load and no Grail would write."""
    return sys.implementation.cache_tag.startswith(sys.implementation.name)


check('the_tag_exists', _the_tag_exists(), True)
check('the_tag_is_derived', _the_tag_is_derived(), True)
check('the_tag_names_this_implementation',
      _the_tag_names_this_implementation(), True)


# ------------------------------------------- what the tag is used FOR

def _cache_from_source_answers_a_path():
    tag = sys.implementation.cache_tag
    return (importlib.util.cache_from_source('x.py'),
            importlib.util.cache_from_source('a/b/c.py')) == (
        os.path.join('__pycache__', 'x.%s.pyc' % tag),
        os.path.join('a', 'b', '__pycache__', 'c.%s.pyc' % tag))


def _it_does_not_start_with_a_separator():
    """A bare filename has an EMPTY dirname, and the result must stay
    relative -- this is what the join bug got wrong."""
    return not importlib.util.cache_from_source('x.py').startswith('/')


def _the_length_delta_is_positive():
    """What test_reprlib's _check_path_limitations actually wants: how
    much longer the cached path is than the source path."""
    delta = len(importlib.util.cache_from_source('x.py')) - len('x.py')
    return delta > 0


check('cache_from_source_answers_a_path',
      _cache_from_source_answers_a_path(), True)
check('it_does_not_start_with_a_separator',
      _it_does_not_start_with_a_separator(), True)
check('the_length_delta_is_positive', _the_length_delta_is_positive(), True)


# --------------------------------------------------- join, both of them

_JOIN_CASES = [
    ('',), ('', 'a'), ('a', ''), ('a', '', 'b'), ('', '', ''),
    ('a', 'b'), ('/a', 'b'), ('a/', 'b'), ('a', '/b'), ('a/', ''),
    ('', '/a'), ('a', 'b', ''),
]

_EXPECTED = [
    '', 'a', 'a/', 'a/b', '',
    'a/b', '/a/b', 'a/b', '/b', 'a/',
    '/a', 'a/b/',
]


def _os_path_join():
    return [os.path.join(*args) for args in _JOIN_CASES]


def _posixpath_join():
    return [posixpath.join(*args) for args in _JOIN_CASES]


def _the_two_agree():
    """They are separate implementations in Grail, which is how they came
    to be wrong in opposite directions."""
    return _os_path_join() == _posixpath_join()


check('os_path_join', _os_path_join(), _EXPECTED)
check('posixpath_join', _posixpath_join(), _EXPECTED)
check('the_two_agree', _the_two_agree(), True)


# ------------------------------- the two shapes each got wrong, named

def _an_empty_first_component_stays_relative():
    """The Smalltalk one added a separator after an empty accumulator."""
    return (os.path.join('', 'a'), os.path.join('', '', ''))


def _an_empty_last_component_keeps_the_separator():
    """The vendored Python one skipped empties, dropping the trailing
    separator that is how a caller says ``directory''."""
    return (posixpath.join('a', ''), posixpath.join('a', 'b', ''))


check('an_empty_first_component_stays_relative',
      _an_empty_first_component_stays_relative(), ('a', ''))
check('an_empty_last_component_keeps_the_separator',
      _an_empty_last_component_keeps_the_separator(), ('a/', 'a/b/'))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
