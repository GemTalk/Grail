"""``warnings._deprecated`` -- the stdlib's own removal announcer.

Private by name, but stdlib modules call it, so an implementation that vendors
those modules has to provide it.  wave.py calls it from five methods
(Wave_read.getmark/getmarkers, Wave_write.setmark/getmark/getmarkers), which is
how Grail came to need it: without it every one of those tests errored with
``module has no attribute '_deprecated'``.

    _deprecated(name, message=<default>, *, remove)

``remove`` is a (major, minor) tuple and is KEYWORD-ONLY.  The two behaviours
worth pinning:

* Ordinarily it emits a DeprecationWarning whose text comes from formatting
  ``message`` with ``name`` and ``remove``, the latter rendered as "3.15".
* If the running interpreter is already PAST that version it raises
  RuntimeError instead.  That branch is a guard for the CPython release
  process -- it fires when someone forgets to delete the thing -- not something
  a caller can normally trigger, and it is easy to leave out.  A removal
  version far in the past makes it observable.

Every expectation below was checked against CPython 3.14.
"""

import sys
import warnings

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


def check_raises(name, fn, exc_type):
    try:
        fn()
        RESULTS[name] = 'did not raise'
    except BaseException as exc:
        RESULTS[name] = isinstance(exc, exc_type)


def warn_text(*args, **kwargs):
    """Return (category_name, message) of the single warning emitted.

    Promoting warnings to errors is the portable way to observe one here:
    Grail's catch_warnings(record=True) hands back the context manager rather
    than CPython's list of recorded warnings, and this fixture is about
    _deprecated, not about the recording protocol.
    """
    with warnings.catch_warnings():
        warnings.simplefilter('error')
        try:
            warnings._deprecated(*args, **kwargs)
        except Warning as exc:
            return (type(exc).__name__, str(exc))
        return ('<no warning>', '')


# A version comfortably ahead of any interpreter that runs this.
FUTURE = (99, 0)
# ...and one comfortably behind.
PAST = (2, 0)


# ------------------------------------------------- the ordinary path

check('emits_deprecation_warning',
      lambda: warn_text('spam.eggs', remove=FUTURE)[0],
      'DeprecationWarning')

# The default message names the thing in repr form and the version as M.m.
check('default_message_quotes_the_name',
      lambda: "'spam.eggs'" in warn_text('spam.eggs', remove=FUTURE)[1],
      True)
check('default_message_formats_remove_as_dotted',
      lambda: '99.0' in warn_text('spam.eggs', remove=FUTURE)[1],
      True)
# The tuple must not leak through unformatted.
check('default_message_has_no_raw_tuple',
      lambda: '(99, 0)' in warn_text('spam.eggs', remove=FUTURE)[1],
      False)
check('default_message_has_no_unfilled_field',
      lambda: '{' in warn_text('spam.eggs', remove=FUTURE)[1],
      False)

# A caller-supplied message is formatted with the same two fields.
check('custom_message_fills_name_and_remove',
      lambda: warn_text('thing', 'drop {name} by {remove}', remove=FUTURE)[1],
      'drop thing by 99.0')
check('custom_message_supports_repr_field',
      lambda: warn_text('thing', '{name!r} goes in {remove}', remove=FUTURE)[1],
      "'thing' goes in 99.0")
# A message using neither field is passed through untouched.
check('custom_message_without_fields',
      lambda: warn_text('thing', 'no fields here', remove=FUTURE)[1],
      'no fields here')


# ------------------------------------------------- the release-process guard

check_raises('past_removal_version_raises',
             lambda: warnings._deprecated('spam', remove=PAST),
             RuntimeError)
# ...and the message names both the thing and the version it outlived, so the
# release-process failure is self-explaining.


def _past_removal_message():
    try:
        warnings._deprecated('spam', remove=PAST)
    except RuntimeError as exc:
        return str(exc)
    return '<did not raise>'


check('past_removal_message_names_the_thing',
      lambda: "'spam'" in _past_removal_message(), True)
check('past_removal_message_names_the_version',
      lambda: '2.0' in _past_removal_message(), True)


# ------------------------------------------------- argument handling

check_raises('remove_is_keyword_only',
             lambda: warnings._deprecated('spam', 'msg', FUTURE),
             TypeError)
check_raises('remove_is_required',
             lambda: warnings._deprecated('spam'),
             TypeError)
check_raises('name_is_required',
             lambda: warnings._deprecated(),
             TypeError)


# ------------------------------------------------- as the stdlib uses it

def _wave_style_call():
    """Exactly the shape wave.py uses, at a version that has not arrived."""
    return warn_text('Wave_read.getmarkers', remove=(sys.version_info[0] + 1, 0))


check('wave_style_call_warns',
      lambda: _wave_style_call()[0], 'DeprecationWarning')
check('wave_style_call_names_the_method',
      lambda: 'Wave_read.getmarkers' in _wave_style_call()[1], True)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
