"""Fixture: a read of ``type'', ``super'', a Smalltalk pseudo-variable spelling
(``nil'', ``self'', ``true'') or ``__class__'' that the IR path refused because
the name has a branch of its own in the text emitter -- in the cases where that
branch stands down and the name is resolved like any other.

* ``type'' shadowed by a module binding (``NameAst:type-other'');
* ``super'' bound by the module, ``class super: ...''
  (``NameAst:super-moduleBinds'') -- and ``super()'' is then an ordinary call
  of that class, in a function and in a method alike;
* ``nil'', ``self'', ``true'' bound at module level and read in a def
  (``NameAst:reservedIdentifier'');
* ``__class__'' read in a module-level def (``NameAst:__class__-noClass''):
  CPython compiles it as a global read, so it is a NameError unless the module
  binds it.  Grail answered the MODULE TYPE on both paths -- the module object's
  own ``__class__'' attribute leaked in as a global -- and that is fixed on
  both, along with ``globals()['__class__']''.

A separate fixture from name_binding_stores.py because every binding here is
module-wide: ``type = ...'' anywhere in a module makes every ``type'' read in
it a module read.

Everything here is verified against real CPython by running the file directly;
NameBindingStoresTestCase holds Grail to it on both codegen paths, and checks
that the IR arm compiled every def here rather than falling back.
"""

r = {}


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = '%s: %s' % (exc.__class__.__name__, exc)


# Read BEFORE the module binds ``type'': the module miss falls back to builtins.
def type_before_binding(x):
    return type(x).__name__


record('type_before_binding', lambda: type_before_binding(1))


def _module_type(x):
    return 'module type of %r' % (x,)


# An ASSIGNMENT, not ``def type'': Grail binds a module's top-level defs before
# its body runs, so a def would already shadow the builtin above.
type = _module_type


def type_call(x):
    return type(x)


def type_value():
    t = type
    return t.__name__, t(2)


class UsesType:
    def m(self):
        return type(3)


class super:
    def __init__(self, *args):
        self.args = args


def super_value():
    return super.__name__, super is globals()['super']


def super_call():
    s = super(1, 2)
    return s.__class__.__name__, s.args


class UsesSuper:
    def m(self):
        return super().args, super.__name__


nil = 3
self = 'module self'
true = 'module true'


def reserved_reads():
    return nil, self, true


def reserved_in_expression():
    return [nil + 1, self.upper(), true.split()]


class UsesReserved:
    def m(self):
        # ``self'' here is the receiver; ``nil'' and ``true'' are the module's.
        return nil * 2, true, self.__class__.__name__


def dunder_class_module_level():
    return __class__


def dunder_class_in_globals():
    return '__class__' in globals(), globals().get('__class__', 'absent')


def dunder_class_nested():
    def inner():
        return __class__
    return inner()


record('type_call', lambda: type_call(1))
record('type_value', type_value)
record('type_in_method', lambda: UsesType().m())
record('super_value', super_value)
record('super_call', super_call)
record('super_in_method', lambda: UsesSuper().m())
record('reserved_reads', reserved_reads)
record('reserved_in_expression', reserved_in_expression)
record('reserved_in_method', lambda: UsesReserved().m())
record('dunder_class_module_level', dunder_class_module_level)
record('dunder_class_in_globals', dunder_class_in_globals)
record('dunder_class_nested', dunder_class_nested)


EXPECTED = {
    'type_before_binding': 'int',
    'type_call': 'module type of 1',
    'type_value': ('_module_type', 'module type of 2'),
    'type_in_method': 'module type of 3',
    'super_value': ('super', True),
    'super_call': ('super', (1, 2)),
    # The module's ``super'' shadows the builtin in a method too, so
    # ``super()'' calls the class with no arguments.
    'super_in_method': ((), 'super'),
    'reserved_reads': (3, 'module self', 'module true'),
    'reserved_in_expression': [4, 'MODULE SELF', ['module', 'true']],
    'reserved_in_method': (6, 'module true', 'UsesReserved'),
    'dunder_class_module_level': "NameError: name '__class__' is not defined",
    'dunder_class_in_globals': (False, 'absent'),
    'dunder_class_nested': "NameError: name '__class__' is not defined",
}


KNOWN_GRAIL = ()


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        actual = r[key]
        status = 'OK' if actual == EXPECTED[key] else 'FAIL'
        print('%-5s %-42s -> %r' % (status, key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-42s is not in EXPECTED' % ('FAIL', extra))
