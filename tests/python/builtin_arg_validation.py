"""The builtins that accepted what CPython refuses.

Argument validation is not decoration.  Two of these were WRONG ANSWERS
rather than missing errors -- ``len`` handed back whatever ``__len__``
returned, string or negative, and ``setattr(o, 1, 2)`` actually set an
attribute named by an integer -- and one was a crash the language could
not catch:

    format(1, 2)   ->  a SmallInteger does not understand #isEmpty

The rest are refusals CPython makes and Grail did not: a non-string
attribute name, a second positional argument to ``sorted`` or ``input``
or ``dir``, a ``__repr__`` set to None.  Each is small on its own; what
they have in common is that the lenient answer is indistinguishable from
a correct one until something downstream misbehaves.

Every expectation was checked against CPython 3.14 first.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


def _raises(fn):
    try:
        fn()
        return 'no raise'
    except Exception as exc:
        return (type(exc).__name__, str(exc))


class NoLen:
    pass


class BadLen:
    def __len__(self):
        return 'not an int'


class NegLen:
    def __len__(self):
        return -1


class Unhashable:
    __hash__ = None


class BadRepr:
    __repr__ = None


# -- len() must get a non-negative int ----------------------------------

check('len_no_dunder', _raises(lambda: len(NoLen())),
      ('TypeError', "object of type 'NoLen' has no len()"))
check('len_bad_return', _raises(lambda: len(BadLen())),
      ('TypeError', "'str' object cannot be interpreted as an integer"))
check('len_negative', _raises(lambda: len(NegLen())),
      ('ValueError', '__len__() should return >= 0'))


# -- an attribute NAME must be a string ---------------------------------
#
# ``setattr`` is the one that mattered: it did not refuse, it SET an
# attribute under a key no attribute lookup would ever produce.

ATTR_MESSAGE = "attribute name must be string, not 'int'"


def _attr_name_must_be_a_string():
    target = NoLen()
    return [_raises(lambda: getattr(1, 1)),
            _raises(lambda: hasattr(1, 1)),
            _raises(lambda: setattr(target, 1, 2)),
            _raises(lambda: delattr(target, 1))]


check('attr_name_must_be_a_string', _attr_name_must_be_a_string(),
      [('TypeError', ATTR_MESSAGE)] * 4)


# -- and the arity of the ones that take exactly one --------------------

check('dir_takes_one', _raises(lambda: dir(1, 2)),
      ('TypeError', 'dir expected at most 1 argument, got 2'))
check('sorted_takes_one', _raises(lambda: sorted([3, 2], (lambda a, b: 0))),
      ('TypeError', 'sorted expected 1 argument, got 2'))
check('sorted_needs_one', _raises(lambda: sorted()),
      ('TypeError', 'sorted expected 1 argument, got 0'))
check('input_takes_one', _raises(lambda: input('a', 'b')),
      ('TypeError', 'input expected at most 1 argument, got 2'))


# -- format()'s spec is a str, and asking for one is not a crash --------

check('format_spec_must_be_str', _raises(lambda: format(1, 2)),
      ('TypeError', 'format() argument 2 must be str, not int'))
check('format_spec_none', _raises(lambda: format(1, None)),
      ('TypeError', 'format() argument 2 must be str, not None'))
check('format_spec_ok', format(1, '5'), '    1')


# -- a dunder set to None is not callable -------------------------------

check('repr_blocked', _raises(lambda: repr(BadRepr())),
      ('TypeError', "'NoneType' object is not callable"))
check('hash_unhashable', _raises(lambda: hash(Unhashable())),
      ('TypeError', "unhashable type: 'Unhashable'"))


# -- the ones that already worked, so the fixes do not undo them --------

def _still_fine():
    target = NoLen()
    setattr(target, 'ok', 1)
    return (len([1, 2]), len(''), getattr(target, 'ok'),
            hasattr(target, 'ok'), hasattr(target, 'nope'),
            sorted([3, 1, 2]), sorted([3, 1, 2], key=lambda v: -v),
            dir(target) == sorted(dir(target)),
            format(1, ''), format('a', '>3'), repr([1]), hash(1) == hash(1))


check('still_fine', _still_fine(),
      (2, 0, 1, True, False, [1, 2, 3], [3, 2, 1], True,
       '1', '  a', '[1]', True))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
