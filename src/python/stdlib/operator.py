# Minimal `operator` module port for Grail.  Mirrors the CPython
# public surface that Jinja2 (and Werkzeug / Flask via attrgetter
# / itemgetter) reach for: function objects that implement the
# common arithmetic, comparison, and logical operators by name,
# plus the attrgetter / itemgetter / methodcaller factories.
#
# Implementations defer to Python's operator semantics rather than
# Smalltalk primitives, so e.g. ``operator.add(a, b)`` is just
# ``a + b``.  This keeps behavior consistent with CPython.


def add(a, b):
    return a + b


def sub(a, b):
    return a - b


def mul(a, b):
    return a * b


def truediv(a, b):
    return a / b


def floordiv(a, b):
    return a // b


def mod(a, b):
    return a % b


def pow(a, b):
    return a ** b


def neg(a):
    return -a


def pos(a):
    return +a


def abs(a):
    return a if a >= 0 else -a


def matmul(a, b):
    return a @ b


def lshift(a, b):
    return a << b


def rshift(a, b):
    return a >> b


def and_(a, b):
    return a & b


def or_(a, b):
    return a | b


def xor(a, b):
    return a ^ b


def invert(a):
    return ~a


def not_(a):
    return not a


def truth(a):
    return True if a else False


def is_(a, b):
    return a is b


def is_not(a, b):
    return a is not b


def eq(a, b):
    return a == b


def ne(a, b):
    return a != b


def lt(a, b):
    return a < b


def le(a, b):
    return a <= b


def gt(a, b):
    return a > b


def ge(a, b):
    return a >= b


def contains(a, b):
    return b in a


def index(a):
    return a.__index__()


def length_hint(obj, default=0):
    """Return an estimate of the number of items in obj.

    This is useful for presizing containers when building from an iterable.

    If the object supports len(), the result will be exact.  Otherwise, it may
    over- or under-estimate by an arbitrary amount.  The result will be an
    integer >= 0.
    """
    if not isinstance(default, int):
        msg = ("'%s' object cannot be interpreted as an integer" %
               type(default).__name__)
        raise TypeError(msg)

    try:
        return len(obj)
    except TypeError:
        pass

    try:
        hint = type(obj).__length_hint__
    except AttributeError:
        return default

    try:
        val = hint(obj)
    except TypeError:
        return default
    if val is NotImplemented:
        return default
    if val < 0:
        msg = "__length_hint__() should return >= 0"
        raise ValueError(msg)
    return val


def concat(a, b):
    "Same as a + b, for a and b sequences."
    # CPython's concat requires a sequence; numbers raise TypeError.  Grail's
    # ``hasattr(int_instance, '__getitem__')`` returns True (a default dunder
    # on Object), so an explicit numeric guard is layered on top.  The
    # TypeError names the *Python* type ('int'), but Grail's
    # ``type(a).__name__`` reports the Smalltalk class ('Integer'); map the
    # common built-ins back to their Python spelling.
    if isinstance(a, (int, float, complex)) or not hasattr(a, '__getitem__'):
        name = {int: 'int', float: 'float', complex: 'complex', bool: 'bool'
                }.get(type(a), type(a).__name__)
        raise TypeError("'%s' object can't be concatenated" % name)
    return a + b


def iconcat(a, b):
    "Same as a += b, for a and b sequences."
    if isinstance(a, (int, float, complex)) or not hasattr(a, '__getitem__'):
        name = {int: 'int', float: 'float', complex: 'complex', bool: 'bool'
                }.get(type(a), type(a).__name__)
        raise TypeError("'%s' object can't be concatenated" % name)
    a += b
    return a


def getitem(a, b):
    return a[b]


def setitem(a, b, c):
    a[b] = c


def delitem(a, b):
    del a[b]


class attrgetter:
    """``operator.attrgetter('x.y')(obj)`` returns ``obj.x.y``.
    Multi-arg form returns a tuple of attribute values."""

    def __init__(self, attr, *attrs):
        self._attrs = (attr,) + attrs

    def __call__(self, obj):
        if len(self._attrs) == 1:
            return self._resolve(obj, self._attrs[0])
        return tuple(self._resolve(obj, a) for a in self._attrs)

    @staticmethod
    def _resolve(obj, dotted):
        for part in dotted.split('.'):
            obj = getattr(obj, part)
        return obj


class itemgetter:
    """``operator.itemgetter(0)(seq)`` returns ``seq[0]``."""

    def __init__(self, item, *items):
        self._items = (item,) + items

    def __call__(self, obj):
        if len(self._items) == 1:
            return obj[self._items[0]]
        return tuple(obj[i] for i in self._items)


class methodcaller:
    """``operator.methodcaller('upper')(s)`` returns ``s.upper()``."""

    def __init__(self, name, *args, **kwargs):
        self._name = name
        self._args = args
        self._kwargs = kwargs

    def __call__(self, obj):
        return getattr(obj, self._name)(*self._args, **self._kwargs)


# In-place arithmetic — used less often, but keep parity.
def iadd(a, b):
    a += b
    return a


def isub(a, b):
    a -= b
    return a


def imul(a, b):
    a *= b
    return a


def itruediv(a, b):
    a /= b
    return a


def ifloordiv(a, b):
    a //= b
    return a


def imod(a, b):
    a %= b
    return a


def ipow(a, b):
    a **= b
    return a


def imatmul(a, b):
    a @= b
    return a


def ilshift(a, b):
    a <<= b
    return a


def irshift(a, b):
    a >>= b
    return a


def iand(a, b):
    a &= b
    return a


def ior(a, b):
    a |= b
    return a


def ixor(a, b):
    a ^= b
    return a


# ---- CPython parity additions (test_operator coverage) --------------------

__all__ = ['abs', 'add', 'and_', 'attrgetter', 'call', 'concat', 'contains',
           'countOf', 'delitem', 'eq', 'floordiv', 'ge', 'getitem', 'gt',
           'iadd', 'iand', 'iconcat', 'ifloordiv', 'ilshift', 'imatmul',
           'imod', 'imul', 'index', 'indexOf', 'inv', 'invert', 'ior',
           'ipow', 'irshift', 'is_', 'is_none', 'is_not', 'is_not_none',
           'isub', 'itemgetter', 'itruediv', 'ixor', 'le', 'length_hint',
           'lshift', 'lt', 'matmul', 'methodcaller', 'mod', 'mul', 'ne',
           'neg', 'not_', 'or_', 'pos', 'pow', 'rshift', 'setitem', 'sub',
           'truediv', 'truth', 'xor']


def inv(a):
    return ~a


def call(obj, *args, **kwargs):
    return obj(*args, **kwargs)


def is_none(a):
    return a is None


def is_not_none(a):
    return a is not None


def countOf(a, b):
    "Return the number of items in a which are, or which equal, b."
    count = 0
    for i in a:
        if i is b or i == b:
            count = count + 1
    return count


def indexOf(a, b):
    "Return the first index of b in a."
    i = 0
    for j in a:
        if j is b or j == b:
            return i
        i = i + 1
    raise ValueError('sequence.index(x): x not in sequence')


# All of these "__func__ = func" assignments have to happen after the
# function definitions above so the dunder aliases are set to the right
# functions.  CPython's operator module exposes each operation under both
# its plain name and its dunder name, with the SAME object identity
# (``operator.__add__ is operator.add``); test_dunder_is_original checks it.
__lt__ = lt
__le__ = le
__eq__ = eq
__ne__ = ne
__ge__ = ge
__gt__ = gt
__not__ = not_
__abs__ = abs
__add__ = add
__and__ = and_
__floordiv__ = floordiv
__index__ = index
__inv__ = inv
__invert__ = invert
__lshift__ = lshift
__mod__ = mod
__mul__ = mul
__matmul__ = matmul
__neg__ = neg
__or__ = or_
__pos__ = pos
__pow__ = pow
__rshift__ = rshift
__sub__ = sub
__truediv__ = truediv
__xor__ = xor
__concat__ = concat
__contains__ = contains
__delitem__ = delitem
__getitem__ = getitem
__setitem__ = setitem
__iadd__ = iadd
__iand__ = iand
__iconcat__ = iconcat
__ifloordiv__ = ifloordiv
__ilshift__ = ilshift
__imod__ = imod
__imul__ = imul
__imatmul__ = imatmul
__ior__ = ior
__ipow__ = ipow
__irshift__ = irshift
__isub__ = isub
__itruediv__ = itruediv
__ixor__ = ixor
