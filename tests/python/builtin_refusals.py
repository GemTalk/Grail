"""Six builtins that ANSWERED where CPython refuses.

Grouped by that shape rather than by subject: in every case here Grail
returned a plausible value for a call CPython rejects, which is the
worse half of a conformance gap -- a missing error announces itself the
moment anything downstream looks at the result, a wrong answer travels.

  * ``sum(items, start='')`` concatenated strings.  CPython refuses str,
    bytes and bytearray starts and names join() instead, because repeated
    concatenation is quadratic.
  * ``sum(items, start=0)`` -- the KEYWORD spelling -- never worked at
    all.  Its method is compiled in env 1, where a bare ``>=`` on a
    SmallInteger is a Python operator the class does not answer, so the
    first line raised an uncatchable Smalltalk MessageNotUnderstood.
  * ``getattr(o, 1, 'dflt')`` answered 'dflt'.  A default does not excuse
    a non-string name; the check lived only on the 2-arg form.
  * ``getattr(o, <lone surrogate>)`` raised MessageNotUnderstood, because
    a surrogate str cannot be made into a Smalltalk Symbol.  It is an
    ordinary AttributeError -- nothing can be stored under that name.
  * ``len(x)`` handed back a __len__ larger than sys.maxsize, and
    ``hash(x)`` handed back a __hash__ that was not an integer.
  * ``max(1, 2, default=None)`` answered 2, and an unknown keyword was
    ignored outright.

Every expectation was checked against CPython 3.14 first.
"""

import sys

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


def _outcome(fn):
    try:
        return ('ok', fn())
    except Exception as exc:
        return (type(exc).__name__, str(exc))


# --------------------------------------------------------------- sum()

def _sum_refuses_str():
    return _outcome(lambda: sum(['a', 'b'], ''))


def _sum_refuses_bytes():
    return _outcome(lambda: sum([b'a'], b''))


def _sum_refuses_bytearray():
    return _outcome(lambda: sum([bytearray(b'a')], bytearray()))


def _sum_refuses_an_empty_iterable_too():
    """The refusal is about the START's type, so it fires before the walk."""
    return _outcome(lambda: sum([], ''))


def _sum_start_keyword():
    """The spelling that raised a Smalltalk error before reaching line 2."""
    return (sum(range(10), start=1000),
            sum([], start=99),
            sum([0.5, 1], start=0),
            sum(range(10), 1000))


def _sum_still_sums_lists():
    """Lists are NOT refused -- only str/bytes/bytearray are."""
    return sum([[1], [2], [3]], [])


check('sum_refuses_str', _sum_refuses_str(),
      ('TypeError', "sum() can't sum strings [use ''.join(seq) instead]"))
check('sum_refuses_bytes', _sum_refuses_bytes(),
      ('TypeError', "sum() can't sum bytes [use b''.join(seq) instead]"))
check('sum_refuses_bytearray', _sum_refuses_bytearray(),
      ('TypeError', "sum() can't sum bytearray [use b''.join(seq) instead]"))
check('sum_refuses_an_empty_iterable_too', _sum_refuses_an_empty_iterable_too(),
      ('TypeError', "sum() can't sum strings [use ''.join(seq) instead]"))
check('sum_start_keyword', _sum_start_keyword(),
      (1045, 99, 1.5, 1045))
check('sum_still_sums_lists', _sum_still_sums_lists(), [1, 2, 3])


# ----------------------------------------------------------- getattr()

def _getattr_name_with_default():
    """A default does not excuse a non-string name."""
    return _outcome(lambda: getattr(sys, 1, 'spam'))


def _getattr_name_without_default():
    return _outcome(lambda: getattr(sys, 1))


def _getattr_surrogate_name():
    """A str Grail cannot make a Symbol of: an ordinary miss, not a crash."""
    return _outcome(lambda: getattr(1, '\udad1픞'))[0]


def _getattr_surrogate_name_with_default():
    """And the miss is inside the handler, so a default is still honoured."""
    return getattr(1, '\udad1픞', 'fallback')


def _getattr_default_still_works():
    return (getattr(sys, 'no_such_attribute_at_all', 'dflt'),
            getattr(sys, 'maxsize') == sys.maxsize)


_NAME_MSG = "attribute name must be string, not 'int'"
check('getattr_name_with_default', _getattr_name_with_default(),
      ('TypeError', _NAME_MSG))
check('getattr_name_without_default', _getattr_name_without_default(),
      ('TypeError', _NAME_MSG))
check('getattr_surrogate_name', _getattr_surrogate_name(), 'AttributeError')
check('getattr_surrogate_name_with_default',
      _getattr_surrogate_name_with_default(), 'fallback')
check('getattr_default_still_works', _getattr_default_still_works(),
      ('dflt', True))


# --------------------------------------------------------- len(), hash()

class _HugeLen:
    def __len__(self):
        return sys.maxsize + 1


class _HugeNegativeLen:
    def __len__(self):
        return -sys.maxsize - 10


class _MaxLen:
    def __len__(self):
        return sys.maxsize


class _FloatHash:
    def __hash__(self):
        return 1.0


class _BoolHash:
    """bool IS an int in Python, so this is a legal hash of 1."""
    def __hash__(self):
        return True


class _IntSubclassHash(int):
    """CPython's check is PyLong_Check, which admits subclasses."""
    def __hash__(self):
        return self


class _BigHash:
    """A long hash is explicitly allowed (CPython bug 1536021)."""
    def __hash__(self):
        return 2 ** 100


def _len_too_big():
    return _outcome(lambda: len(_HugeLen()))


def _len_too_negative():
    """Hugely negative stays the ValueError; the order of the two matters."""
    return _outcome(lambda: len(_HugeNegativeLen()))


def _len_at_the_limit():
    return len(_MaxLen()) == sys.maxsize


def _hash_not_an_integer():
    return _outcome(lambda: hash(_FloatHash()))


def _hash_boolean():
    return hash(_BoolHash())


def _hash_int_subclass():
    return hash(_IntSubclassHash(42)) == hash(42)


def _hash_may_be_long():
    return type(hash(_BigHash())).__name__


check('len_too_big', _len_too_big(),
      ('OverflowError', "cannot fit 'int' into an index-sized integer"))
check('len_too_negative', _len_too_negative(),
      ('ValueError', '__len__() should return >= 0'))
check('len_at_the_limit', _len_at_the_limit(), True)
check('hash_not_an_integer', _hash_not_an_integer(),
      ('TypeError', '__hash__ method should return an integer'))
check('hash_boolean', _hash_boolean(), 1)
check('hash_int_subclass', _hash_int_subclass(), True)
check('hash_may_be_long', _hash_may_be_long(), 'int')


# ------------------------------------------------------- max(), min()

def _default_with_several_positionals():
    return (_outcome(lambda: max(1, 2, default=None)),
            _outcome(lambda: min(1, 2, default=None)))


def _unexpected_keyword():
    return _outcome(lambda: max([1], bogus=1))


def _the_spellings_that_stay():
    return (max([], default=7), min([], default=7),
            max([3, 1, 2]), min([3, 1, 2]),
            max(1, 2), min(1, 2),
            max(['bb', 'a'], key=len))


check('default_with_several_positionals', _default_with_several_positionals(),
      (('TypeError', 'Cannot specify a default for max() with multiple '
                     'positional arguments'),
       ('TypeError', 'Cannot specify a default for min() with multiple '
                     'positional arguments')))
check('unexpected_keyword', _unexpected_keyword(),
      ('TypeError', "max() got an unexpected keyword argument 'bogus'"))
check('the_spellings_that_stay', _the_spellings_that_stay(),
      (7, 7, 3, 1, 2, 1, 'bb'))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
