"""A protocol method an object only has to raise TypeError is not an attribute
(#1632).

Grail gives the universal roots (object, and every Python class's
PythonInstance) and some built-ins (int, None) methods such as ``__iter__`` and
``__getitem__`` whose only job is to raise CPython's catchable TypeError, so
``iter(1)`` fails as CPython's does instead of as an uncatchable send.  They
were also ATTRIBUTES: ``hasattr(1, '__iter__')`` answered True for every
object, and duck-typed code took the collection branch -- real ``requests``
did, in ``_encode_params``, and failed with ``'int' object is not iterable``.
In CPython none of those types has the method at all.

The refusals must keep working for dispatch, so ``iter(1)`` and ``1[0]``
still raise their TypeErrors here.  Self-running: ``python3
protocol_fallback_attributes.py`` prints one line per check against what
CPython 3.14 answers.
"""

NAMES = ("__iter__", "__getitem__", "__len__", "__contains__", "__next__", "__call__", "__bool__")


class Plain:
    pass


class Subscriptable:
    def __getitem__(self, index):
        return index


class NotIterable:
    __iter__ = None


class MyInt(int):
    pass


def _present(value):
    return tuple(name for name in NAMES if hasattr(value, name))


def _outcome(action):
    try:
        return "ok -> %r" % (action(),)
    except Exception as e:
        return "%s: %s" % (type(e).__name__, e)


def _first_item(value):
    return value[0]


def _encode_params_style(value):
    # requests.models.RequestEncodingMixin._encode_params, the shape that found it.
    if isinstance(value, (str, bytes)) or not hasattr(value, "__iter__"):
        value = [value]
    return [v for v in value]


r = {
    "int": _present(1),
    "float": _present(1.5),
    "complex": _present(1j),
    "None": _present(None),
    "bool": _present(True),
    "object": _present(object()),
    "builtin_function": _present(len),
    "str": _present("ab"),
    "list": _present([1]),
    "dict": _present({}),
    "bytes": _present(b"x"),
    "plain_instance": _present(Plain()),
    "plain_class": _present(Plain),
    "subscriptable_instance": _present(Subscriptable()),
    "iter_set_to_none": _present(NotIterable()),
    "int_subclass": _present(MyInt(3)),
    "getattr_int_iter": _outcome(lambda: getattr(1, "__iter__")),
    "getattr_none_len": _outcome(lambda: getattr(None, "__len__")),
    "iter_int_still_raises": _outcome(lambda: iter(1)),
    "subscript_int_still_raises": _outcome(lambda: _first_item(1)),
    "len_none_still_raises": _outcome(lambda: len(None)),
    "contains_int_still_raises": _outcome(lambda: 1 in 1),
    "encode_params_int": _outcome(lambda: _encode_params_style(1)),
    "encode_params_list": _outcome(lambda: _encode_params_style([1, 2])),
}

EXPECTED = {
    'None': ('__bool__',),
    'bool': ('__bool__',),
    'builtin_function': ('__call__',),
    'bytes': ('__iter__', '__getitem__', '__len__', '__contains__'),
    'complex': ('__bool__',),
    'contains_int_still_raises': "TypeError: argument of type 'int' is not a container or iterable",
    'dict': ('__iter__', '__getitem__', '__len__', '__contains__'),
    'encode_params_int': 'ok -> [1]',
    'encode_params_list': 'ok -> [1, 2]',
    'float': ('__bool__',),
    'getattr_int_iter': "AttributeError: 'int' object has no attribute '__iter__'",
    'getattr_none_len': "AttributeError: 'NoneType' object has no attribute '__len__'",
    'int': ('__bool__',),
    'int_subclass': ('__bool__',),
    'iter_int_still_raises': "TypeError: 'int' object is not iterable",
    'iter_set_to_none': ('__iter__',),
    'len_none_still_raises': "TypeError: object of type 'NoneType' has no len()",
    'list': ('__iter__', '__getitem__', '__len__', '__contains__'),
    'object': (),
    'plain_class': ('__call__',),
    'plain_instance': (),
    'str': ('__iter__', '__getitem__', '__len__', '__contains__'),
    'subscript_int_still_raises': "TypeError: 'int' object is not subscriptable",
    'subscriptable_instance': ('__getitem__',),
}

# No Grail limitation is left to document.  The two this fixture carried, as
# GRAIL_ONLY, were a builtin function's ``__getitem__'' (a BoundMethod
# pass-through, function_not_subscriptable.py) and a class's missing
# ``__call__'' (type_methods_on_classes.py).
GRAIL_ONLY = {}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS,
    sorted(r) == sorted(list(EXPECTED) + list(GRAIL_ONLY)))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-28s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    for k in sorted(GRAIL_ONLY):
        actual = r[k]
        print('%-28s %s %r' % (k, 'XPASS' if actual == GRAIL_ONLY[k] else 'XFAIL', actual))
