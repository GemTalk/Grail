"""A decorator that reads its def's own name sees the binding BEFORE the def.

CPython evaluates the decorator expressions, makes the function, applies the
decorators and only then binds the name.  Inside a function, Grail bound the
new function first and evaluated each decorator after, which shows only when
a decorator reads the name it replaces: ``@alias.setter`` after
``@property def alias`` read ``.setter`` off the new plain function --
``AttributeError: ... no attribute 'setter'`` -- and beautifulsoup4's
_deprecated_alias, which builds exactly that pair, failed to import.

The rows cover a property's setter and deleter built inside a function
(bs4's shape), a chain whose outer decorator reads the name, the same pair in
a module-level ``if``, a decorator expression with a side effect (it runs
before the function is made, as in CPython), and a class built from the
function-made property.  A def whose decorators do not read its name, and
the class-body form, are the guards.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


def deprecated_alias(old_name, new_name):
    """bs4._deprecation._deprecated_alias, without the warnings."""

    @property
    def alias(self):
        return getattr(self, new_name)

    @alias.setter
    def alias(self, value):
        return setattr(self, new_name, value)

    return alias


class Tag:
    def __init__(self):
        self.name = 'p'

    tagName = deprecated_alias('tagName', 'name')


def with_deleter():
    @property
    def p(self):
        return 1

    @p.deleter
    def p(self):
        pass

    return (p.fget is not None, p.fdel is not None, p.fset is None)


log = []


def noting(tag):
    log.append('made ' + tag)

    def deco(f):
        log.append('applied ' + tag)
        return f
    return deco


def side_effect_order():
    del log[:]

    @property
    def q(self):
        return 2

    @noting(q.__class__.__name__)
    def q(self):
        log.append('body')
    return list(log)


def identity(f):
    return f


def chain():
    @property
    def c(self):
        return 3

    @identity
    @c.setter
    def c(self, v):
        pass
    return (type(c).__name__, c.fset is not None)


if True:
    @property
    def module_alias(self):
        return 'got'

    @module_alias.setter
    def module_alias(self, v):
        pass


def plain_decorated():
    del log[:]

    @noting('plain')
    def f(x):
        return x * 2
    return (f(21), list(log))


class Guard:
    @property
    def g(self):
        return self._g

    @g.setter
    def g(self, v):
        self._g = v


def guard_set():
    o = Guard()
    o.g = 5
    return o.g


def tag_round_trip():
    tag = Tag()
    before = tag.tagName
    tag.tagName = 'div'
    return (before, tag.name, tag.tagName)


t('bs4 alias type', lambda: type(deprecated_alias('a', 'b')).__name__)
t('bs4 alias has a setter', lambda: deprecated_alias('a', 'b').fset is not None)
t('bs4 alias round trip', tag_round_trip)
t('deleter', with_deleter)
t('decorator made before the function', side_effect_order)
t('chain', chain)
t('module-level if', lambda: (type(module_alias).__name__, module_alias.fset is not None))
t('guard: decorators that do not read the name', plain_decorated)
t('guard: class body', guard_set)


EXPECTED = {
    'bs4 alias type': "'property'",
    'bs4 alias has a setter': 'True',
    'bs4 alias round trip': "('p', 'div', 'div')",
    'deleter': '(True, True, True)',
    'decorator made before the function': "['made property', 'applied property']",
    'chain': "('property', True)",
    'module-level if': "('property', True)",
    'guard: decorators that do not read the name': "(42, ['made plain', 'applied plain'])",
    'guard: class body': '5',
}


def mismatches():
    """The rows that differ from CPython's, as 'label: got X, CPython Y'."""
    return ['%s: got %s, CPython %s' % (k, r.get(k), v)
            for k, v in EXPECTED.items() if r.get(k) != v]
