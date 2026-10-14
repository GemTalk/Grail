"""warnings.warn_explicit binds its required arguments by keyword too.

pytest's assertion rewriter warns about an always-true assert -- ``assert
(x, 'message')'' -- with

    warnings.warn_explicit(PytestAssertRewriteWarning(...), category=None,
                           filename=self.module_path, lineno=assert_.lineno)

and Grail's warn_explicit took its four required arguments by position only,
so the call raised ``TypeError: warn_explicit() missing required arguments''
and the test module failed to collect (pyyaml's legacy tests).

Every expectation was measured against CPython 3.14.
"""

import warnings

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


def _shown(*args, **kwargs):
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter('always')
        warnings.warn_explicit(*args, **kwargs)
    return [(type(w.message).__name__, str(w.message), w.category.__name__,
             w.filename, w.lineno) for w in caught]


def _refused(*args, **kwargs):
    try:
        warnings.warn_explicit(*args, **kwargs)
    except TypeError as exc:
        return str(exc)
    return 'accepted'


check('pytests_call_shape',
      _shown(UserWarning('always true'), category=None,
             filename='mod.py', lineno=7),
      [('UserWarning', 'always true', 'UserWarning', 'mod.py', 7)])
check('every_required_argument_by_keyword',
      _shown(message='m', category=DeprecationWarning, filename='f.py', lineno=3),
      [('DeprecationWarning', 'm', 'DeprecationWarning', 'f.py', 3)])
check('positional_still_works',
      _shown('p', RuntimeWarning, 'g.py', 9),
      [('RuntimeWarning', 'p', 'RuntimeWarning', 'g.py', 9)])
check('a_missing_lineno_names_itself',
      _refused('m', UserWarning, 'f.py'),
      "warn_explicit() missing required argument 'lineno' (pos 4)")
check('a_missing_filename_names_itself',
      _refused('m', UserWarning, lineno=1),
      "warn_explicit() missing required argument 'filename' (pos 3)")

SUMMARY = '%d checks, %d disagreeing' % (len(RESULTS), sum(1 for v in RESULTS.values() if v is not True))

if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
