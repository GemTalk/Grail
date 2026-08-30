# Fixture for TypeErrorTestCase's subscript checks.
#
# Subscripting an object that has no ``__getitem__`` used to die as a Smalltalk
# MessageNotUnderstood -- an error no Python ``except`` can see, which takes the
# whole process down instead of being handled:
#
#     (1.5)[0:2]      True[0]      object()[0]      {1, 2}[0]      ...[0]
#
# CPython raises a catchable ``TypeError: 'float' object is not subscriptable``.
# The guard existed, but as a PER-CLASS method someone had to remember to add:
# int (Int.gs), NoneType (NoneType.gs) and PythonInstance each had a private
# copy, and float / bool / complex / object / set / frozenset / ellipsis had
# none.  It is now a single fallback in Object >> doesNotUnderstand:args:envId:,
# next to the ``__setitem__`` / ``__delitem__`` / ``__contains__`` intercepts
# that were already there.
#
# Real-world blocker: kaggle/models/kaggle_models_extended.py:231 does
# ``string[:26]`` inside ``try: ... except: pass`` and the value it is handed is
# a float.  CPython catches it and moves on; Grail died.  See ``kaggle_shape``.
#
# EVERY expectation here is measured against CPython 3.14 -- run this file as a
# script (``python3 tests/python/subscript_typeerror.py``) and every line must
# read OK.  scripts/check_python_fixtures.sh does exactly that.

CHECKS = []


def check(name, expected):
    """Register fn as a check whose answer must equal ``expected`` in CPython."""

    def register(fn):
        CHECKS.append((name, fn, expected))
        return fn

    return register


def caught(fn):
    """The exception type and message, or 'no raise'.

    A Smalltalk MessageNotUnderstood is invisible to ``except BaseException``,
    so a regression does not produce a wrong string here -- it produces NO
    value at all, and the Smalltalk test errors rather than fails.  That is a
    different signal, and the one that matters."""
    try:
        fn()
    except BaseException as e:
        return "%s: %s" % (type(e).__name__, e)
    return "no raise"


class Plain:
    """No item protocol at all."""


class Indexable:
    """A REAL item protocol -- the fallback must never shadow it."""

    def __init__(self):
        self.store = {}

    def __getitem__(self, key):
        if key == "missing":
            raise KeyError(key)
        return ("got", key)

    def __setitem__(self, key, value):
        self.store[key] = value

    def __delitem__(self, key):
        del self.store[key]


# --- reading: x[0] and x[0:2] ------------------------------------------------


@check("read_int", "TypeError: 'int' object is not subscriptable")
def read_int():
    x = 5
    return caught(lambda: x[0])


@check("read_float", "TypeError: 'float' object is not subscriptable")
def read_float():
    x = 1.5
    return caught(lambda: x[0])


@check("slice_float", "TypeError: 'float' object is not subscriptable")
def slice_float():
    x = 1.5
    return caught(lambda: x[0:2])


@check("read_bool", "TypeError: 'bool' object is not subscriptable")
def read_bool():
    x = True
    return caught(lambda: x[0])


@check("read_complex", "TypeError: 'complex' object is not subscriptable")
def read_complex():
    x = 1j
    return caught(lambda: x[0])


@check("read_none", "TypeError: 'NoneType' object is not subscriptable")
def read_none():
    x = None
    return caught(lambda: x[0])


@check("read_object", "TypeError: 'object' object is not subscriptable")
def read_object():
    x = object()
    return caught(lambda: x[0])


@check("read_instance", "TypeError: 'Plain' object is not subscriptable")
def read_instance():
    x = Plain()
    return caught(lambda: x[0])


@check("read_set", "TypeError: 'set' object is not subscriptable")
def read_set():
    x = {1, 2}
    return caught(lambda: x[0])


@check("read_frozenset", "TypeError: 'frozenset' object is not subscriptable")
def read_frozenset():
    x = frozenset([1, 2])
    return caught(lambda: x[0])


@check("read_ellipsis", "TypeError: 'ellipsis' object is not subscriptable")
def read_ellipsis():
    x = Ellipsis
    return caught(lambda: x[0])


# --- assigning: x[0] = 1 -----------------------------------------------------


def _setitem(obj):
    def go():
        obj[0] = 1

    return caught(go)


@check("set_int", "TypeError: 'int' object does not support item assignment")
def set_int():
    return _setitem(5)


@check("set_float", "TypeError: 'float' object does not support item assignment")
def set_float():
    return _setitem(1.5)


@check("set_bool", "TypeError: 'bool' object does not support item assignment")
def set_bool():
    return _setitem(True)


@check("set_complex", "TypeError: 'complex' object does not support item assignment")
def set_complex():
    return _setitem(1j)


@check("set_none", "TypeError: 'NoneType' object does not support item assignment")
def set_none():
    return _setitem(None)


@check("set_object", "TypeError: 'object' object does not support item assignment")
def set_object():
    return _setitem(object())


@check("set_instance", "TypeError: 'Plain' object does not support item assignment")
def set_instance():
    return _setitem(Plain())


@check("set_set", "TypeError: 'set' object does not support item assignment")
def set_set():
    return _setitem({1, 2})


@check("set_frozenset", "TypeError: 'frozenset' object does not support item assignment")
def set_frozenset():
    return _setitem(frozenset([1, 2]))


@check("set_ellipsis", "TypeError: 'ellipsis' object does not support item assignment")
def set_ellipsis():
    return _setitem(Ellipsis)


@check("set_str", "TypeError: 'str' object does not support item assignment")
def set_str():
    return _setitem("abc")


@check("set_bytes", "TypeError: 'bytes' object does not support item assignment")
def set_bytes():
    return _setitem(b"abc")


@check("set_tuple", "TypeError: 'tuple' object does not support item assignment")
def set_tuple():
    return _setitem((1, 2))


@check("set_range", "TypeError: 'range' object does not support item assignment")
def set_range():
    return _setitem(range(5))


# --- deleting: del x[0] ------------------------------------------------------
#
# CPython has TWO wordings and picks by C slot, not by anything visible from
# Python: PyObject_DelItem routes an integer key to PySequence_DelItem whenever
# the type has a tp_as_sequence table (``doesn't''), and only says ``does not''
# for a type with no sequence table at all.  Both spellings are exercised.


def _delitem(obj):
    def go():
        del obj[0]

    return caught(go)


@check("del_int", "TypeError: 'int' object does not support item deletion")
def del_int():
    return _delitem(5)


@check("del_float", "TypeError: 'float' object does not support item deletion")
def del_float():
    return _delitem(1.5)


@check("del_bool", "TypeError: 'bool' object does not support item deletion")
def del_bool():
    return _delitem(True)


@check("del_complex", "TypeError: 'complex' object does not support item deletion")
def del_complex():
    return _delitem(1j)


@check("del_none", "TypeError: 'NoneType' object does not support item deletion")
def del_none():
    return _delitem(None)


@check("del_object", "TypeError: 'object' object does not support item deletion")
def del_object():
    return _delitem(object())


@check("del_ellipsis", "TypeError: 'ellipsis' object does not support item deletion")
def del_ellipsis():
    return _delitem(Ellipsis)


@check("del_instance", "TypeError: 'Plain' object doesn't support item deletion")
def del_instance():
    return _delitem(Plain())


@check("del_set", "TypeError: 'set' object doesn't support item deletion")
def del_set():
    return _delitem({1, 2})


@check("del_frozenset", "TypeError: 'frozenset' object doesn't support item deletion")
def del_frozenset():
    return _delitem(frozenset([1, 2]))


@check("del_str", "TypeError: 'str' object doesn't support item deletion")
def del_str():
    return _delitem("abc")


@check("del_bytes", "TypeError: 'bytes' object doesn't support item deletion")
def del_bytes():
    return _delitem(b"abc")


@check("del_tuple", "TypeError: 'tuple' object doesn't support item deletion")
def del_tuple():
    return _delitem((1, 2))


@check("del_range", "TypeError: 'range' object doesn't support item deletion")
def del_range():
    return _delitem(range(5))


# --- the blocker shape -------------------------------------------------------


@check("kaggle_shape", "caught")
def kaggle_shape():
    """kaggle_models_extended.py:231 -- ``string[:26]`` on a float, inside a
    bare ``except``.  Grail did not reach the handler; it died before it."""
    usability_rating = 4.5
    try:
        return usability_rating[:26]
    except Exception:
        return "caught"


# --- POSITIVE controls: subscripting that SHOULD work must keep working ------


@check("pos_list", "[2, [2, 3], 9, 2]")
def pos_list():
    xs = [1, 2, 3]
    read = xs[1]
    sliced = xs[1:3]
    xs[0] = 9
    first = xs[0]
    del xs[0]
    return str([read, sliced, first, xs[0]])


@check("pos_tuple", "(2, (2, 3))")
def pos_tuple():
    xs = (1, 2, 3)
    return str((xs[1], xs[1:3]))


@check("pos_str", "('b', 'bc')")
def pos_str():
    s = "abc"
    return str((s[1], s[1:3]))


@check("pos_bytes", "(98, b'bc')")
def pos_bytes():
    b = b"abc"
    return str((b[1], b[1:3]))


@check("pos_dict", "('a', 'z', False)")
def pos_dict():
    d = {0: "a", 1: "b"}
    read = d[0]
    d[1] = "z"
    got = d[1]
    del d[1]
    return str((read, got, 1 in d))


@check("pos_bytearray", "(98, 9, False)")
def pos_bytearray():
    b = bytearray(b"abc")
    read = b[1]
    b[0] = 9
    got = b[0]
    del b[0]
    return str((read, got, b[0] == 9))


@check("pos_range", "(1, range(1, 3))")
def pos_range():
    r = range(5)
    return str((r[1], r[1:3]))


# --- NEGATIVE controls -------------------------------------------------------
#
# A fallback that fires too eagerly would pass every check above and still be
# wrong.  These three fail if it shadows a real implementation, and the fourth
# fails if it was installed as a real ``object.__getitem__`` rather than as a
# dispatch-failure fallback.


@check("neg_real_getitem_wins", "('got', 3)")
def neg_real_getitem_wins():
    """A class WITH __getitem__ answers its own value, not a TypeError."""
    return str(Indexable()[3])


@check("neg_real_getitem_raises_its_own", "KeyError: 'missing'")
def neg_real_getitem_raises_its_own():
    """An exception raised BY a real __getitem__ must surface unchanged --
    the fallback must not repaint someone else's KeyError as a TypeError."""
    return caught(lambda: Indexable()["missing"])


@check("neg_real_setitem_and_delitem", "('v', False)")
def neg_real_setitem_and_delitem():
    obj = Indexable()
    obj["k"] = "v"
    got = obj.store["k"]
    del obj["k"]
    return str((got, "k" in obj.store))


@check("neg_no_phantom_getitem_attribute", "(False, False, False, True)")
def neg_no_phantom_getitem_attribute():
    """The DISCRIMINATOR between the two ways this fix could have been written.

    A real ``object.__getitem__`` would make ``hasattr(x, '__getitem__')``
    answer True for every object alive -- CPython says False -- and every
    ownership probe in the tree would then have to unlearn it.  A
    dispatch-failure fallback leaves attribute lookup exactly as it was.

    The three receivers probed are the ones the fix newly covers AND that
    Grail reports correctly today, so the check discriminates the two designs
    rather than measuring something else.  ``float`` and ``bool`` are
    deliberately NOT probed: Grail already answers True for them, because an
    instance attribute load reaches the CLASS-side __getitem__: that
    Subscript.gs installs on Float/Integer/Boolean/CharacterCollection.  That
    is a separate, pre-existing leak of the metaclass into instance attribute
    lookup, unrelated to this change -- probing it here would make this
    control fail for a reason it is not about.

    The fourth element is the control for the other direction: a class that
    really has __getitem__ still reports it."""
    return str(
        (
            hasattr(object(), "__getitem__"),
            hasattr({1, 2}, "__getitem__"),
            hasattr(frozenset([1, 2]), "__getitem__"),
            hasattr(Indexable(), "__getitem__"),
        )
    )


# --- harness entry points ----------------------------------------------------


def check_count():
    """How many checks ran.  Asserted by the Smalltalk test so that an empty
    or half-built table cannot report a well-formed zero failures."""
    return len(CHECKS)


def failures():
    """Every check whose answer differs from CPython's, as one string.

    Rows, not a count: the value a check actually got is the whole diagnosis,
    and a bare number describes nothing when it is wrong."""
    bad = []
    for name, fn, expected in CHECKS:
        actual = fn()
        if actual != expected:
            bad.append("%s: expected <%s> got <%s>" % (name, expected, actual))
    return "\n".join(bad)


if __name__ == "__main__":
    for _name, _fn, _expected in CHECKS:
        _actual = _fn()
        print("%-4s %-34s %s" % ("OK" if _actual == _expected else "FAIL", _name, _actual))
