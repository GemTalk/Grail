"""warnings checks its arguments, and honours a replaced showwarning.

Three things CPython does that Grail did not:

  * ``warn_explicit`` validates lineno, the message/category pair and the
    registry, raising TypeError at the call rather than failing obscurely
    later in the display;
  * ``warn(..., skip_file_prefixes=X)`` requires a TUPLE OF STR -- a list, a
    bytes element or a bare string are each a TypeError.  Grail does not act
    on the argument (it selects which frames to skip when attributing a
    warning), but accepting a malformed one silently is worse than not
    supporting it;
  * ``showwarning`` is a documented hook, so a replacement is USED, and a
    replacement that is not callable is a TypeError at the point of use.

The validation had to go in a shared helper, not in the varargs entry alone:
a four-positional ``warn_explicit(a, b, c, d)'' takes the FIXED-ARITY selector,
so validating only the varargs form checked nothing the test actually calls.

Every expectation below was checked against CPython 3.14.
"""

import warnings

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


def raises(fn, *types):
    try:
        fn()
    except types:
        return 'raised'
    except BaseException as exc:
        return '%s: %s' % (type(exc).__name__, exc)
    return '<no raise>'


# ------------------------------------------------- warn_explicit checks

check('lineno_must_be_an_int',
      lambda: raises(lambda: warnings.warn_explicit(None, UserWarning, None, None),
                     TypeError),
      'raised')

# Either the message is a Warning instance or the category is a Warning
# subclass -- one of the two has to carry the category.
check('message_or_category_must_carry_the_category',
      lambda: raises(lambda: warnings.warn_explicit(None, None, None, 1),
                     TypeError),
      'raised')

check('registry_must_be_a_mapping',
      lambda: raises(lambda: warnings.warn_explicit(None, Warning, None, 1,
                                                    registry=42),
                     TypeError, AttributeError),
      'raised')


# A well-formed call still works.
def _well_formed():
    with warnings.catch_warnings(record=True) as w:
        warnings.resetwarnings()
        warnings.simplefilter('always')
        warnings.warn_explicit('fine', UserWarning, 'f.py', 7)
        return len(w)


check('a_well_formed_call_still_warns', _well_formed, 1)


# ------------------------------------------- skip_file_prefixes checks

check('a_list_is_rejected',
      lambda: raises(lambda: warnings.warn('m', skip_file_prefixes=[]),
                     TypeError),
      'raised')
check('a_bytes_element_is_rejected',
      lambda: raises(lambda: warnings.warn('m', skip_file_prefixes=(b'bytes',)),
                     TypeError),
      'raised')
check('a_bare_string_is_rejected',
      lambda: raises(lambda: warnings.warn('m', skip_file_prefixes='not a tuple'),
                     TypeError),
      'raised')


def _valid_prefixes():
    with warnings.catch_warnings(record=True) as w:
        warnings.resetwarnings()
        warnings.simplefilter('always')
        warnings.warn('m', UserWarning, 1, skip_file_prefixes=('/tmp/',))
        return len(w)


check('a_tuple_of_strs_is_accepted', _valid_prefixes, 1)


# ------------------------------------------------------- showwarning

def _replacement_is_used():
    seen = []
    orig = warnings.showwarning
    try:
        with warnings.catch_warnings():
            warnings.resetwarnings()
            warnings.simplefilter('always')
            warnings.showwarning = lambda *a, **k: seen.append(str(a[0]))
            warnings.warn('through the hook')
        return seen
    finally:
        warnings.showwarning = orig


check('a_replacement_is_used', _replacement_is_used, ['through the hook'])


def _non_callable_raises():
    orig = warnings.showwarning
    try:
        with warnings.catch_warnings():
            warnings.resetwarnings()
            warnings.simplefilter('always')
            warnings.showwarning = 23
            return raises(lambda: warnings.warn('boom'), TypeError)
    finally:
        warnings.showwarning = orig


check('a_non_callable_replacement_raises', _non_callable_raises, 'raised')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
