# __import__() and open(): arguments that were not checked, and keywords that
# were not read.
#
# Four of these produced a WRONG ANSWER or an uncatchable Smalltalk error
# rather than the exception CPython raises:
#
#   __import__(1, 2, 3, 4)     fell through to importlib's own scan and died
#                              with ``a SmallInteger does not understand
#                              #indexOf:startingAt:'' -- uncatchable, out of a
#                              builtin, where CPython raises TypeError
#   __import__(name='sys')     reported the argument MISSING, having been
#                              supplied by name
#   __import__('sys',          not detected as given twice
#              name='sys')
#   open('a\0b')               opened the TRUNCATED path and reported
#                              FileNotFoundError for a name the caller never
#                              asked for -- so a caller catching that to
#                              CREATE the file would create the wrong one
#
# And one latent bug the keyword work exposed: importlib read its keyword
# arguments with bare __getitem__, which raises KeyError for a key that is not
# there.  So supplying ANY keyword without supplying all of them failed on the
# first one missing -- ``__import__('sys', fromlist=['path'])'' raised
# ``KeyError: 'globals'''.  It survived because callers in the corpus pass
# either no keywords at all or the whole set.
#
# The empty-name rule has a case either way, which is why both are here:
# ``__import__('')'' is a bad argument (ValueError), while ``__import__('', g,
# l, ('foo',), 1)'' is the spelling of ``from . import foo'' and must fail as
# an ImportError about the missing parent -- after an ImportWarning, because
# CPython falls back to __name__ and says so (bpo-37409).
#
# test_builtin's test_import and test_open.

import warnings

r = {}


def outcome(fn):
    try:
        return 'ok -> %r' % (fn(),)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def kind(fn):
    """Exception TYPE only, where the message is not the point."""
    try:
        fn()
        return 'no exception'
    except Exception as e:
        return type(e).__name__


# --- __import__ argument checking --------------------------------------------

r['import_positional'] = __import__('sys').__name__
r['import_by_name'] = __import__(name='sys').__name__
r['import_name_and_level'] = __import__(name='time', level=0).__name__
r['import_partial_keywords'] = __import__('sys', fromlist=['path']).__name__
r['import_non_string'] = outcome(lambda: __import__(1, 2, 3, 4))
r['import_empty_name'] = outcome(lambda: __import__(''))
r['import_name_twice'] = kind(lambda: __import__('sys', name='sys'))
r['import_missing_module'] = kind(lambda: __import__('spamspam'))
# TYPE only: the message embeds the name, and Grail does not escape the NUL
# inside it where CPython reprs it.  That is the message builder's business,
# not this one's.
r['import_nul_in_name'] = kind(lambda: __import__('string\x00'))


# --- the relative-import fallback, and its warning ---------------------------

def _relative_from_main():
    g = {'__package__': None, '__spec__': None, '__name__': '__main__'}
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter('always')
        try:
            __import__('', g, locals={}, fromlist=('foo',), level=1)
            result = 'no exception'
        except ImportError:
            result = 'ImportError'
        except Exception as e:
            result = type(e).__name__
    return (result, [w.category.__name__ for w in caught])


r['relative_without_package'] = _relative_from_main()


# --- open() with an embedded NUL ---------------------------------------------

r['open_nul_str'] = outcome(lambda: open('a\x00b'))
r['open_nul_bytes'] = outcome(lambda: open(b'a\x00b'))
# The control: an ordinary missing file is still FileNotFoundError, so the new
# check refuses only what cannot be a path rather than everything that fails.
r['open_missing_file'] = kind(lambda: open('definitely-not-here-12345'))


EXPECTED = {
    'import_by_name': 'sys',
    'import_empty_name': 'ValueError: Empty module name',
    'import_missing_module': 'ModuleNotFoundError',
    'import_name_and_level': 'time',
    'import_name_twice': 'TypeError',
    'import_non_string': 'TypeError: module name must be a string',
    'import_nul_in_name': 'ModuleNotFoundError',
    'import_partial_keywords': 'sys',
    'import_positional': 'sys',
    'open_missing_file': 'FileNotFoundError',
    'open_nul_bytes': 'ValueError: embedded null byte',
    'open_nul_str': 'ValueError: embedded null byte',
    'relative_without_package': ('ImportError', ['ImportWarning']),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-30s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
