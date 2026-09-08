"""A metaclass's `__iter__` / `__contains__` must reach the operator.

`class Owned(metaclass=Meta)` makes `Meta`'s methods the ones Python uses
for operations on the CLASS itself: `len(Owned)`, `x in Owned`,
`list(Owned)`.  In Grail some of those worked and some did not, and the
split was not arbitrary -- it depended on whether `object` happens to
carry a synthesized DEFAULT for the name:

  * `__len__` and `__getitem__` have no default on `object`, so the env-1
    send missed, `doesNotUnderstand:` consulted the recorded metaclass,
    and they worked.
  * `__iter__` and `__contains__:` DO have defaults -- the ones that raise
    CPython's "not iterable" / "not a container" TypeErrors -- so the send
    resolved there and the metaclass was never asked.

So `len(Owned)` answered 42 while `'x' in Owned` raised `TypeError:
'type' object is not iterable`, from the same class, for the same reason
in reverse.  The defaults now ask the recorded metaclass before raising.

The metaclass lookup deliberately refuses an implementation owned by
`object` or `PythonInstance`: a metaclass is itself a Python class and
inherits the same defaults, so an ungated probe would find the default
again and performing it would re-enter the same method forever.

Every expectation was checked against CPython 3.14 first.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


def _outcome(fn):
    try:
        return ('ok', fn())
    except BaseException as exc:
        return (type(exc).__name__, str(exc)[:60])


class Meta(type):
    def __iter__(cls):
        return iter(['a', 'b'])

    def __contains__(cls, item):
        return item == 'yes'

    def __len__(cls):
        return 42

    def __getitem__(cls, key):
        return ('META-getitem', key)


class Owned(metaclass=Meta):
    pass


class Inheriting(Owned):
    """A metaclass is inherited, as in CPython."""


# ------------------------------------------- the two that did not work

def _in_uses_the_metaclass():
    return ('yes' in Owned, 'no' in Owned)


def _iteration_uses_the_metaclass():
    return (list(Owned), [x for x in Owned], tuple(Owned))


def _for_loop_uses_the_metaclass():
    out = []
    for item in Owned:
        out.append(item)
    return out


def _inherited_metaclass_too():
    return ('yes' in Inheriting, list(Inheriting))


check('in_uses_the_metaclass', _in_uses_the_metaclass(), (True, False))
check('iteration_uses_the_metaclass', _iteration_uses_the_metaclass(),
      (['a', 'b'], ['a', 'b'], ('a', 'b')))
check('for_loop_uses_the_metaclass', _for_loop_uses_the_metaclass(),
      ['a', 'b'])
check('inherited_metaclass_too', _inherited_metaclass_too(),
      (True, ['a', 'b']))


# ------------------------------------- the two that already worked

def _len_and_getitem_still_work():
    return (len(Owned), Owned['k'])


check('len_and_getitem_still_work', _len_and_getitem_still_work(),
      (42, ('META-getitem', 'k')))


# --------------------------------- a class with NO metaclass is unchanged

class Bare:
    pass


class Iterable:
    def __iter__(self):
        return iter([1, 2])


def _a_plain_class_is_still_not_iterable():
    return _outcome(lambda: list(Bare))[0]


def _a_plain_class_is_still_not_a_container():
    return _outcome(lambda: 'x' in Bare)[0]


def _an_instance_is_unaffected():
    """The receiver on the hot path is an instance, never a class."""
    return (list(Iterable()), 1 in Iterable(), 9 in Iterable())


def _an_instance_without_iter_still_raises():
    return (_outcome(lambda: list(Bare()))[0],
            _outcome(lambda: 'x' in Bare())[0])


check('a_plain_class_is_still_not_iterable',
      _a_plain_class_is_still_not_iterable(), 'TypeError')
check('a_plain_class_is_still_not_a_container',
      _a_plain_class_is_still_not_a_container(), 'TypeError')
check('an_instance_is_unaffected', _an_instance_is_unaffected(),
      ([1, 2], True, False))
check('an_instance_without_iter_still_raises',
      _an_instance_without_iter_still_raises(), ('TypeError', 'TypeError'))


# ---------------- a metaclass that does NOT define them is unchanged

class QuietMeta(type):
    def unrelated(cls):
        return 'unrelated'


class QuietlyOwned(metaclass=QuietMeta):
    pass


def _a_metaclass_without_them_still_raises():
    """The probe must refuse an implementation owned by object itself --
    a metaclass inherits the same defaults, and performing one would
    re-enter this method on the same receiver forever."""
    return (_outcome(lambda: list(QuietlyOwned))[0],
            _outcome(lambda: 'x' in QuietlyOwned)[0],
            QuietlyOwned.unrelated())


check('a_metaclass_without_them_still_raises',
      _a_metaclass_without_them_still_raises(),
      ('TypeError', 'TypeError', 'unrelated'))


# ------------------------- the ordinary containment fallback is intact

class ByIter:
    """No __contains__ -- membership falls back to iterating __iter__."""

    def __iter__(self):
        return iter(['p', 'q'])


class NeverEq:
    def __eq__(self, other):
        return False


def _containment_still_falls_back_to_iteration():
    return ('p' in ByIter(), 'z' in ByIter())


def _containment_compares_element_first():
    """The ELEMENT is the left operand, so its __eq__ runs first."""
    never = NeverEq()
    return never in [never]


check('containment_still_falls_back_to_iteration',
      _containment_still_falls_back_to_iteration(), (True, False))
check('containment_compares_element_first',
      _containment_compares_element_first(), True)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
