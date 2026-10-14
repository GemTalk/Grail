"""datetime.timezone binds offset and name by keyword too.

CPython's signature is timezone(offset, name=<unset>), both ordinary
parameters, so annotated-types' test module builds its cases with
``timezone(offset=timedelta(hours=1))''.  Grail's timezone dispatched on
the positional count alone and refused any keyword ("PyTimezone() takes no
keyword arguments", naming the implementation class), so the module failed
to collect.

Every expectation was measured against CPython 3.14.
"""

from datetime import timedelta, timezone

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


def _made(*args, **kwargs):
    try:
        return repr(timezone(*args, **kwargs))
    except Exception as exc:
        return '%s: %s' % (type(exc).__name__, exc)


HOUR = timedelta(hours=1)

check('offset_by_keyword', _made(offset=HOUR),
      'datetime.timezone(datetime.timedelta(seconds=3600))')
check('offset_and_name_by_keyword', _made(offset=HOUR, name='X'),
      "datetime.timezone(datetime.timedelta(seconds=3600), 'X')")
check('name_by_keyword', _made(HOUR, name='X'),
      "datetime.timezone(datetime.timedelta(seconds=3600), 'X')")
check('a_zero_offset_by_keyword_is_utc',
      timezone(offset=timedelta(0)) is timezone.utc, True)
check('positional_unchanged', [_made(HOUR), _made(HOUR, 'Y')],
      ['datetime.timezone(datetime.timedelta(seconds=3600))',
       "datetime.timezone(datetime.timedelta(seconds=3600), 'Y')"])
check('refusals', [_made(), _made(name='X'), _made(HOUR, offset=HOUR),
                   _made(HOUR, bogus=1), _made(HOUR, 'a', name='b')],
      ["TypeError: timezone() missing required argument 'offset' (pos 1)",
       "TypeError: timezone() missing required argument 'offset' (pos 1)",
       "TypeError: argument for timezone() given by name ('offset') and position (1)",
       "TypeError: timezone() got an unexpected keyword argument 'bogus'",
       "TypeError: timezone() takes at most 2 arguments (3 given)"])

SUMMARY = '%d checks, %d disagreeing' % (len(RESULTS), sum(1 for v in RESULTS.values() if v is not True))

if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
