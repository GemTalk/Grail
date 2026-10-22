"""A class reads type's own methods as attributes, as CPython's classes do.

Reading an attribute off a class searches type(cls).__mro__ after cls.__mro__,
and for a class with no ``metaclass=`` that type is ``type``.  Grail consulted a
RECORDED metaclass, so ``class C(metaclass=M)`` reached type's methods through
M, but a plain class has none recorded and is not a Smalltalk instance of
type: ``Plain.__call__`` was an AttributeError, ``hasattr(Plain, '__call__')``
was False -- the old ``callable`` idiom said a class could not be called -- and
``type.__instancecheck__(Plain, x)`` was an uncatchable error.

Only type's OWN methods: its chain ends in object, whose protocol refusals
(#1632) are attributes of no CPython class.  Self-running: ``python3
type_methods_on_classes.py`` prints one line per check against what CPython 3.14
answers.
"""

NAMES = ("__call__", "__instancecheck__", "__subclasscheck__")
NOT_TYPES = ("__iter__", "__getitem__", "__len__", "__contains__", "__next__")


class Plain:
    pass


class Sub(Plain):
    pass


class Meta(type):
    pass


class WithMeta(metaclass=Meta):
    pass


class CallMeta(type):
    def __call__(cls, *args):
        return "the metaclass's __call__"


class UsesCallMeta(metaclass=CallMeta):
    pass


def _present(value, names):
    return tuple(name for name in names if hasattr(value, name))


def _outcome(action):
    try:
        return "ok -> %r" % (action(),)
    except Exception as e:
        return "%s: %s" % (type(e).__name__, e)


def _callable_by_hasattr():
    candidates = (("Plain", Plain), ("len", len), ("three", 3), ("instance", Plain()))
    return [name for name, value in candidates if hasattr(value, "__call__")]


r = {
    "plain_has": _present(Plain, NAMES),
    "int_has": _present(int, NAMES),
    "object_has": _present(object, NAMES),
    "with_meta_has": _present(WithMeta, NAMES),
    "plain_has_no_refusal": _present(Plain, NOT_TYPES),
    "object_has_no_refusal": _present(object, NOT_TYPES),
    "callable_by_hasattr": _callable_by_hasattr(),
    "plain_call_makes_an_instance": _outcome(lambda: type(Plain.__call__()).__name__),
    "int_call_converts": _outcome(lambda: int.__call__("5")),
    "metaclass_call_wins": _outcome(lambda: UsesCallMeta.__call__()),
    "plain_instancecheck": _outcome(lambda: Plain.__instancecheck__(Plain())),
    "plain_instancecheck_other": _outcome(lambda: Plain.__instancecheck__(3)),
    "plain_subclasscheck": _outcome(lambda: Plain.__subclasscheck__(Sub)),
    "type_instancecheck_unbound": _outcome(lambda: type.__instancecheck__(Plain, Plain())),
    "type_subclasscheck_unbound": _outcome(lambda: type.__subclasscheck__(Plain, Sub)),
    "call_not_in_class_dict": "__call__" in vars(Plain),
    "call_not_in_dir": "__call__" in dir(Plain),
    "int_instancecheck": _outcome(lambda: int.__instancecheck__(3)),
    "int_instancecheck_bool": _outcome(lambda: int.__instancecheck__(True)),
    "float_instancecheck": _outcome(lambda: float.__instancecheck__(1.5)),
}

EXPECTED = {
    'call_not_in_class_dict': False,
    'call_not_in_dir': False,
    'callable_by_hasattr': ['Plain', 'len'],
    'float_instancecheck': 'ok -> True',
    'int_call_converts': 'ok -> 5',
    'int_has': ('__call__', '__instancecheck__', '__subclasscheck__'),
    'int_instancecheck': 'ok -> True',
    'int_instancecheck_bool': 'ok -> True',
    'metaclass_call_wins': 'ok -> "the metaclass\'s __call__"',
    'object_has': ('__call__', '__instancecheck__', '__subclasscheck__'),
    'object_has_no_refusal': (),
    'plain_call_makes_an_instance': "ok -> 'Plain'",
    'plain_has': ('__call__', '__instancecheck__', '__subclasscheck__'),
    'plain_has_no_refusal': (),
    'plain_instancecheck': 'ok -> True',
    'plain_instancecheck_other': 'ok -> False',
    'plain_subclasscheck': 'ok -> True',
    'type_instancecheck_unbound': 'ok -> True',
    'type_subclasscheck_unbound': 'ok -> True',
    'with_meta_has': ('__call__', '__instancecheck__', '__subclasscheck__'),
}

# No Grail limitation is left to document.  The last one was int's own
# class-side __instancecheck__:, a hook isinstance consults only after its
# isKindOf: Integer test has failed: called directly it recognized int WRAPPERS
# alone, and ``int.__instancecheck__(3)'' was False (float's had the same shape).
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
    print(SUMMARY)
