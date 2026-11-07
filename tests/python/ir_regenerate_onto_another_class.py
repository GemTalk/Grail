"""Fixture: a method moved onto another class keeps behaving as the def it was.

Four of Grail's features copy a class's methods onto ANOTHER class: the
multiple-inheritance merge and the enum gap-fill (a secondary base's methods
onto the class being built), ``@smalltalk_class`` (a temporary class's defs
onto a Smalltalk class) and UnboundMethod's special-receiver form.  Grail's
regenerate API (``importlib ___irRegenerate___:onto:category:``) does that for
an IR-built method by generating its finished IR again for the new class,
where the copies used to recompile a Smalltalk text twin.

``PLAN`` names the copies; ``copy_by_setattr`` is what they mean in CPython --
the function objects themselves put on the other class.  The Smalltalk side
(``IRRegenerateTestCase``) makes the same copies through the regenerate API
instead and then runs the same ``run_checks``.  Run as a script, this file is
its own CPython oracle.

What each check covers:

* ``plain``, ``kw``, ``calls_self``: an ordinary method, the varargs form, and a
  self-send between two copied methods.
* ``classmethod`` / ``staticmethod``: class-side methods, regenerated onto the
  other class's metaclass; a classmethod sees the class it is CALLED on.
* ``generator`` and ``closure``: a wrapped body and a nested def.
* ``class statement``: a method holding a ``class`` statement, whose helper
  has to be reachable from the other class.
* ``traceback``: the copy still reports the def's own name and line.
* ``super`` and ``super, not a subclass``: zero-argument ``super()`` names the
  DEFINING class, so a copy onto a subclass chains to the base and a copy onto
  an unrelated class raises TypeError, as CPython's ``__class__`` cell does.
* ``slots``: ``Padded`` declares the same slot names as ``Slotted`` in another
  order.  A slot is a per-class layout POSITION in Grail
  (docs/Instance_Attribute_Indexed_Slots.md), so a copy has to read Padded's
  positions, not carry Slotted's.
"""


class Base:
    def __init__(self, v):
        self.v = v

    def plain(self, x):
        return self.v + x

    def kw(self, a, b=2, *args, **kw):
        return (self.v, a, b, args, sorted(kw.items()))

    def calls_self(self):
        return self.plain(100)

    @classmethod
    def cm(cls, x):
        return (cls.__name__, x)

    @staticmethod
    def sm(x, y):
        return x * y

    def gen(self, n):
        for i in range(n):
            yield self.v + i

    def closure(self, k):
        def inner(z):
            return self.v + k + z
        return inner(1)

    def raises(self):
        return 1 // 0

    def with_class(self):
        class Local:
            def f(self):
                return 'local'
        return Local().f()

    def describe(self):
        return (type(self).__name__, self + 1)

    def uses_super(self):
        return ('Base', type(self).__name__)


class Child(Base):
    def uses_super(self):
        return ('Child',) + super().uses_super()


class GrandChild(Child):
    pass


class Stranger:
    pass


class Target:
    def __init__(self, v):
        self.v = v


class Slotted:
    __slots__ = ('a', 'b')

    def __init__(self, a, b):
        self.a = a
        self.b = b

    def total(self):
        return self.a * 100 + self.b

    def bump(self):
        self.b = self.b + 1
        return (self.a, self.b)


class Padded:
    __slots__ = ('pad', 'b', 'a')

    def __init__(self, a, b):
        self.pad = 'pad'
        self.a = a
        self.b = b


# (source class, target class): every def of the source the target does not
# define itself goes onto the target.
PLAN = [('Base', 'Target'), ('Child', 'GrandChild'), ('Child', 'Stranger'),
        ('Slotted', 'Padded')]


def copy_by_setattr():
    """What the copies mean in CPython: the function objects themselves."""
    g = globals()
    for src_name, dst_name in PLAN:
        src, dst = g[src_name], g[dst_name]
        for name, val in list(vars(src).items()):
            if name in vars(dst):
                continue
            if isinstance(val, (staticmethod, classmethod)) or callable(val):
                setattr(dst, name, val)


def _raises():
    try:
        Target(5).raises()
    except ZeroDivisionError as e:
        tb = e.__traceback__
        while tb.tb_next is not None:
            tb = tb.tb_next
        return (tb.tb_frame.f_code.co_name,
                tb.tb_lineno == Base.raises.__code__.co_firstlineno + 1)
    return 'no exception'


def _super_stranger():
    try:
        return Stranger().uses_super()
    except TypeError:
        return 'TypeError'


def _bump():
    p = Padded(3, 4)
    return (p.bump(), p.total(), p.pad)


CHECKS = [
    ('plain', lambda: Target(5).plain(1), 6),
    ('kw', lambda: Target(5).kw(1, 3, 4, z=1), (5, 1, 3, (4,), [('z', 1)])),
    ('calls_self', lambda: Target(5).calls_self(), 105),
    ('classmethod', lambda: Target.cm(3), ('Target', 3)),
    ('staticmethod', lambda: Target.sm(3, 4), 12),
    ('generator', lambda: list(Target(5).gen(3)), [5, 6, 7]),
    ('closure', lambda: Target(5).closure(2), 8),
    ('class_statement', lambda: Target(5).with_class(), 'local'),
    ('traceback', _raises, ('raises', True)),
    ('super', lambda: GrandChild(1).uses_super(), ('Child', 'Base', 'GrandChild')),
    ('super_stranger', _super_stranger, 'TypeError'),
    ('slots', lambda: Padded(3, 4).total(), 304),
    ('slots_store', _bump, ((3, 5), 305, 'pad')),
]


def run_checks():
    """[(name, ok, actual)] for every check."""
    out = []
    for name, fn, expected in CHECKS:
        try:
            actual = fn()
        except Exception as e:
            actual = '%s: %s' % (type(e).__name__, e)
        out.append((name, actual == expected, actual))
    return out


if __name__ == '__main__':
    copy_by_setattr()
    for name, ok, actual in run_checks():
        print('%-16s %s %r' % (name, 'OK ' if ok else 'DIFF', actual))
