"""A class or module may bind a name GemStone will not compile as a selector.

Grail compiles a class body's def or attribute, and a module's def, as
methods named after it: ``repeat`` for an attribute or a no-argument def,
``ifTrue:`` for a one-argument def or a setter.  The compiler refuses the
selectors it inlines (repeat, whileTrue, ifTrue:, timesRepeat:, ...) and
those with a special bytecode (isNil, yourself, isKindOf:, _isInteger, ...),
so ``repeat = _arraymethod('repeat')`` in numpy.ma's MaskedArray failed the
whole class with "You may not compile a method for this selector".
"""

import ast


def _arraymethod(name):
    """numpy.ma.core._arraymethod, cut down."""
    def wrapped(self, *args):
        return (name, self.tag) + args
    wrapped.__name__ = name
    return wrapped


class MaskedLike:
    tag = 'm'
    repeat = _arraymethod('repeat')
    isNil = 5
    yourself = 'attr'

    def notNil(self):
        return 'notNil()'

    def ifTrue(self, x):
        return ('ifTrue', x)

    @property
    def _isInteger(self):
        return 'property'

    @staticmethod
    def whileTrue():
        return 'static'

    @classmethod
    def timesRepeat(cls, n):
        return (cls.__name__, n)


class Sub(MaskedLike):
    tag = 's'

    def notNil(self):
        return ('sub', super().notNil())


def whileFalse():
    return 'module def'


def isKindOf(x):
    return ('module isKindOf', x)


def a_class_attribute_method_binds():
    m = MaskedLike()
    return m.repeat(2) == ('repeat', 'm', 2) and Sub().repeat() == ('repeat', 's')


def a_class_attribute_reads():
    return (MaskedLike.isNil, MaskedLike().isNil, Sub.yourself) == (5, 5, 'attr')


def reserved_defs_call():
    m = MaskedLike()
    return (m.notNil(), m.ifTrue(1), m._isInteger, MaskedLike.whileTrue(),
            Sub.timesRepeat(3)) == ('notNil()', ('ifTrue', 1), 'property',
                                    'static', ('Sub', 3))


def an_override_reaches_super():
    return Sub().notNil() == ('sub', 'notNil()')


def the_names_are_in_the_class_dict():
    d = MaskedLike.__dict__
    return (all(n in d for n in ('repeat', 'isNil', 'yourself', 'notNil',
                                 'ifTrue', '_isInteger', 'whileTrue',
                                 'timesRepeat'))
            and type(d['_isInteger']).__name__ == 'property'
            and type(d['whileTrue']).__name__ == 'staticmethod')


def a_class_attribute_rebinds():
    class K:
        isNil = 1
    class L(K):
        pass
    K.isNil = 2
    L.yourself = 3
    return (K.isNil, L.isNil, L.yourself, 'yourself' in K.__dict__) == (2, 2, 3, False)


def a_module_def_calls():
    return (whileFalse(), isKindOf(1), globals()['whileFalse'] is whileFalse) == \
        ('module def', ('module isKindOf', 1), True)


def a_class_in_a_function():
    def make():
        class Local:
            repeat = 'local'
            def isNil(self):
                return 'local isNil'
        return Local
    L = make()
    return (L.repeat, L().isNil()) == ('local', 'local isNil')


def ast_parse_shows_the_source():
    tree = ast.parse('class C:\n    repeat = 1\n    def isNil(self): pass\n'
                     'def whileTrue(): pass\n')
    body = tree.body[0].body
    return ([type(s).__name__ for s in body] == ['Assign', 'FunctionDef']
            and type(tree.body[1]).__name__ == 'FunctionDef'
            and tree.body[1].name == 'whileTrue')


CHECKS = [
    a_class_attribute_method_binds,
    a_class_attribute_reads,
    reserved_defs_call,
    an_override_reaches_super,
    the_names_are_in_the_class_dict,
    a_class_attribute_rebinds,
    a_module_def_calls,
    a_class_in_a_function,
    ast_parse_shows_the_source,
]

RESULTS = {}
for _fn in CHECKS:
    try:
        RESULTS[_fn.__name__] = _fn() is True
    except Exception as _exc:
        RESULTS[_fn.__name__] = type(_exc).__name__ + ': ' + str(_exc)


if __name__ == '__main__':
    for _fn in CHECKS:
        _got = RESULTS[_fn.__name__]
        print('%-4s %s' % ('OK' if _got is True else 'FAIL', _fn.__name__))
