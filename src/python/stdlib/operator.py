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
    try:
        return obj.__length_hint__()
    except AttributeError:
        return default


def concat(a, b):
    return a + b


def iconcat(a, b):
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
