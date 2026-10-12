"""Calling a metaclass directly runs its __init__ (#1411).

``Meta(name, bases, ns)`` is ``type.__call__(Meta, name, bases, ns)``: __new__
builds the class, then -- because the result is an instance of Meta --
``Meta.__init__`` runs over it.  Grail ran __new__ and skipped __init__, so
whatever __init__ stored on the class was missing.  six.add_metaclass builds
classes exactly this way, and python-dateutil's tz singletons (and through
them boto3) failed on the attribute their metaclass __init__ sets.

The rows cover __init__ with and without a __new__, the dateutil singleton
shape through a six-style decorator (name-mangled attribute included), an
inherited and a runtime-assigned __init__, the arguments __init__ receives,
that it runs exactly once, and CPython's rule that __init__ is SKIPPED when
__new__ returns something that is not an instance of the metaclass.  The
class-statement form is the control: it already worked.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


calls = []


class InitOnly(type):
    def __init__(cls, *args, **kwargs):
        calls.append(('InitOnly', cls.__name__))
        cls.stamp = 'init-only'
        super().__init__(*args, **kwargs)


class NewAndInit(type):
    def __new__(mcls, name, bases, ns):
        calls.append(('new', name))
        return super().__new__(mcls, name, bases, ns)

    def __init__(cls, name, bases, ns):
        calls.append(('init', name))
        cls.stamp = 'new-and-init'
        cls.seen = (name, len(bases), sorted(k for k in ns if not k.startswith('__')))
        super().__init__(name, bases, ns)


class Inherits(InitOnly):
    pass


class NoInit(type):
    pass


class Swaps(type):
    def __new__(mcls, name, bases, ns):
        return 42

    def __init__(cls, *args):
        calls.append(('Swaps-init-must-not-run',))


class Assigned(type):
    pass


def _assigned_init(cls, name, bases, ns):
    cls.stamp = 'assigned'


Assigned.__init__ = _assigned_init


# python-dateutil's tz.tzutc, built the way six.add_metaclass builds it.
def add_metaclass(metaclass):
    def wrapper(cls):
        orig_vars = cls.__dict__.copy()
        orig_vars.pop('__dict__', None)
        orig_vars.pop('__weakref__', None)
        orig_vars['__qualname__'] = cls.__qualname__
        return metaclass(cls.__name__, cls.__bases__, orig_vars)
    return wrapper


class _TzSingleton(type):
    def __init__(cls, *args, **kwargs):
        cls.__instance = None
        super(_TzSingleton, cls).__init__(*args, **kwargs)

    def __call__(cls):
        if cls.__instance is None:
            cls.__instance = super(_TzSingleton, cls).__call__()
        return cls.__instance


@add_metaclass(_TzSingleton)
class tzutc(object):
    def utcoffset(self):
        return 0


class Statement(metaclass=NewAndInit):
    x = 1


A = InitOnly('A', (), {})
B = NewAndInit('B', (object,), {'x': 1, 'y': 2})
C = Inherits('C', (), {})
D = NoInit('D', (), {'z': 3})
E = Swaps('E', (), {})
F = Assigned('F', (), {})

t('InitOnly: __init__ stored', lambda: A.stamp)
t('NewAndInit: __init__ stored', lambda: B.stamp)
t('NewAndInit: __init__ saw its arguments', lambda: B.seen)
t('NewAndInit: type(B)', lambda: type(B).__name__)
t('inherited metaclass __init__', lambda: C.stamp)
t('no metaclass __init__: the namespace still lands', lambda: D.z)
t('__new__ returning a non-instance skips __init__', lambda: E)
t('runtime-assigned metaclass __init__', lambda: F.stamp)
t('dateutil: the mangled attribute is in vars', lambda: '_TzSingleton__instance' in vars(tzutc))
t('dateutil: tzutc() is a singleton', lambda: tzutc() is tzutc())
t('dateutil: the instance works', lambda: tzutc().utcoffset())
t('class statement (control)', lambda: (Statement.stamp, Statement.seen))
t('each __init__ ran exactly once', lambda: calls)


EXPECTED = {
    'InitOnly: __init__ stored': "'init-only'",
    'NewAndInit: __init__ stored': "'new-and-init'",
    'NewAndInit: __init__ saw its arguments': "('B', 1, ['x', 'y'])",
    'NewAndInit: type(B)': "'NewAndInit'",
    'inherited metaclass __init__': "'init-only'",
    'no metaclass __init__: the namespace still lands': '3',
    '__new__ returning a non-instance skips __init__': '42',
    'runtime-assigned metaclass __init__': "'assigned'",
    'dateutil: the mangled attribute is in vars': 'True',
    'dateutil: tzutc() is a singleton': 'True',
    'dateutil: the instance works': '0',
    'class statement (control)': "('new-and-init', ('Statement', 0, ['x']))",
    'each __init__ ran exactly once': "[('new', 'Statement'), ('init', 'Statement'), ('InitOnly', 'A'), ('new', 'B'), ('init', 'B'), ('InitOnly', 'C')]",
}


def mismatches():
    """The rows that differ from CPython's, as 'label: got X, CPython Y'."""
    return ['%s: got %s, CPython %s' % (k, r.get(k), v)
            for k, v in EXPECTED.items() if r.get(k) != v]
