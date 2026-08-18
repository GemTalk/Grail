"""``catch_warnings(record=True)`` hands back a LIST, not the context manager.

CPython's contract is specific and callers lean on all of it:

    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter("always")
        warnings.warn("boom")
        len(w)                  # 1
        w[0].message            # UserWarning("boom") -- an INSTANCE
        w[0].category           # UserWarning -- the class
        del w[:]                # a real, mutable list

Grail answered the context manager itself, so ``len(w)`` raised "object of type
'CatchWarnings' has no len()" -- the single most common failure in
test.test_warnings.  Without record, the answer is None, also as in CPython.

Two details are easy to get subtly wrong and are pinned below:

  * ``.message`` is a Warning INSTANCE, not the text.  Recording the bare
    string passes a str() check and fails ``.args[0]``, which is what
    test_warnings reads.
  * The list is LIVE -- it fills during the block rather than being handed over
    at exit -- and it is an ordinary list, so ``del w[:]`` works.

Grail's recording buffer is also a STACK now.  assertWarns nests inside
catch_warnings(record=True), and with a single slot the inner context
overwrote the outer and cleared it on exit, so the outer silently stopped
recording halfway through its own block.

Every expectation below was checked against CPython 3.14.
"""

import warnings

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


# ------------------------------------------------------- the list itself

def _basic():
    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter("always")
        before = len(w)
        warnings.warn("boom")
        warnings.warn("second", DeprecationWarning)
        return (before, len(w))


check('starts_empty_and_fills', _basic, (0, 2))


def _record(fn):
    """Run fn inside a recording context; answer the list."""
    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter("always")
        fn()
        return list(w)


check('supports_len',
      lambda: len(_record(lambda: warnings.warn("x"))), 1)
check('supports_indexing',
      lambda: _record(lambda: warnings.warn("x"))[0].category.__name__,
      'UserWarning')
check('supports_negative_indexing',
      lambda: _record(lambda: warnings.warn("x"))[-1].category.__name__,
      'UserWarning')


def _mutable():
    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter("always")
        warnings.warn("x")
        n_before = len(w)
        del w[:]
        return (n_before, len(w))


check('list_is_mutable', _mutable, (1, 0))


# --------------------------------------------- what a record looks like

def _one():
    return _record(lambda: warnings.warn("boom"))[0]


# The distinction that matters: an INSTANCE, not the text.
check('message_is_a_warning_instance',
      lambda: type(_one().message).__name__, 'UserWarning')
check('message_is_not_a_string',
      lambda: isinstance(_one().message, str), False)
check('str_of_message_is_the_text', lambda: str(_one().message), 'boom')
check('message_args_carry_the_text', lambda: _one().message.args[0], 'boom')
check('category_is_the_class', lambda: _one().category.__name__, 'UserWarning')
check('category_is_a_type', lambda: isinstance(_one().category, type), True)

# The record carries CPython's full attribute set, present even where Grail has
# nothing to put in them.
check('has_filename', lambda: hasattr(_one(), 'filename'), True)
check('has_lineno', lambda: hasattr(_one(), 'lineno'), True)
check('has_file', lambda: hasattr(_one(), 'file'), True)
check('has_line', lambda: hasattr(_one(), 'line'), True)


# An explicit category is preserved, and each record keeps its own.
def _two_categories():
    recs = _record(lambda: (warnings.warn("a", UserWarning),
                            warnings.warn("b", DeprecationWarning)))
    return (recs[0].category.__name__, recs[1].category.__name__)


check('each_record_keeps_its_category', _two_categories,
      ('UserWarning', 'DeprecationWarning'))

# Warning INSTANCES passed to warn() are stored as-is rather than re-wrapped.
check('warn_with_an_instance',
      lambda: str(_record(lambda: warnings.warn(UserWarning("inst")))[0].message),
      'inst')


# ------------------------------------------------------ without record

def _no_record():
    with warnings.catch_warnings() as cm:
        return cm


def _explicit_false():
    with warnings.catch_warnings(record=False) as cm:
        return cm


check('omitting_record_answers_none', lambda: _no_record() is None, True)
check('record_false_answers_none', lambda: _explicit_false() is None, True)


# ------------------------------------------------------------- nesting

def _nested():
    """An inner recorder must not steal the outer one's records."""
    with warnings.catch_warnings(record=True) as outer:
        warnings.simplefilter("always")
        warnings.warn("first")
        with warnings.catch_warnings(record=True) as inner:
            warnings.simplefilter("always")
            warnings.warn("inner-only")
            n_inner = len(inner)
        # Back in the outer context: it kept its own record and resumes.
        warnings.warn("third")
        return (len(outer), n_inner)


check('nested_recorders_stay_separate', _nested, (2, 1))


def _restores_filters():
    """catch_warnings restores the filter list whether or not it recorded."""
    warnings.resetwarnings()
    warnings.simplefilter("always")
    n_before = len(warnings.filters)
    with warnings.catch_warnings(record=True):
        warnings.simplefilter("ignore")
        warnings.filterwarnings("error")
    return len(warnings.filters) == n_before


check('filters_restored_on_exit', _restores_filters, True)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
