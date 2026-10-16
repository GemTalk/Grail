"""A nested def or a lambda binds with __get__, as every CPython function does (#1656).

Grail represents a nested def or a lambda as an ExecBlock, and an ExecBlock had
no __get__: ``h.__get__(obj)`` raised ``AttributeError: ExecBlock object has no
attribute '__get__'``, and ``hasattr(h, '__get__')`` was False.  (A module-level
def is a different object, which already bound.)  Under runpy.run_path even a
module-level def is an ExecBlock, so a fixture's own functions failed there.

It also made a class-attribute lambda bind on a subclass of a BUILT-IN
(Exception, list): that read asks the value for __get__, and an ExecBlock had
none, so ``m = lambda self: ...'' was called without self.  On a plain class
the read already bound it; those rows, and the staticmethod / classmethod ones,
are controls.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

import enum
import types

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


class C: pass
c = C()
def outer():
    def h(self, x=1):
        return ('h', type(self).__name__, x)
    return h
h = outer()
lam = lambda self: ('lam', type(self).__name__)
t('nested_get', lambda: h.__get__(c)())
t('nested_get_arg', lambda: h.__get__(c)(5))
t('nested_get_owner', lambda: h.__get__(c, C)())
t('lambda_get', lambda: lam.__get__(c)())
t('class_access', lambda: h.__get__(None, C) is h)
t('hasattr', lambda: hasattr(h, '__get__'))
t('bound_self', lambda: h.__get__(c).__self__ is c)
t('bound_func', lambda: h.__get__(c).__func__ is h)
t('bound_type', lambda: type(h.__get__(c)).__name__)
t('ismethod', lambda: isinstance(h.__get__(c), types.MethodType))
class D:
    m = lam
    n = outer()
t('class_attr_lambda', lambda: D().m())
t('class_attr_nested', lambda: D().n(3))
t('class_read_lambda', lambda: D.m is lam)
class E(enum.Enum):
    A = 1
    f = lambda self: 'f'
t('enum_members', lambda: [m.name for m in E])
t('enum_lambda_call', lambda: E.A.f())
def deco(fn):
    def wrapper(self, *a): return ('wrapped', fn(self, *a))
    return wrapper
class W:
    @deco
    def m(self, x): return x
t('decorated_method', lambda: W().m(4))
t('decorated_get', lambda: W.m.__get__(W())(5))
t('staticmethod_of_nested', lambda: staticmethod(outer()).__get__(None, C)(c))



def mk():
    def inner(a, b=2):
        return ('inner', type(a).__name__, b)
    return inner


class K:
    f = staticmethod(lambda a: ('lam', a))
    g = staticmethod(mk())
    h = classmethod(lambda cls, a: (cls.__name__, a))
    i = mk()


class KSub(K):
    pass


class Ex(Exception):
    f = staticmethod(lambda a: ('exc-static', a))
    m = lambda self: ('exc-plain', type(self).__name__)


class L(list):
    f = staticmethod(lambda a: ('list-static', a))
    m = lambda self: ('list-plain', len(self))


t('static_lambda_inst', lambda: K().f(1))
t('static_lambda_cls', lambda: K.f(1))
t('static_nested_inst', lambda: K().g(1))
t('class_lambda_inst', lambda: K().h(1))
t('plain_nested_inst', lambda: K().i(5))
t('sub_static', lambda: KSub().f(3))
t('sub_plain', lambda: KSub().i(6))
t('exception_subclass_static', lambda: Ex().f(1))
t('exception_subclass_lambda_binds', lambda: Ex().m())
t('list_subclass_static', lambda: L().f(1))
t('list_subclass_lambda_binds', lambda: L([1, 2]).m())


EXPECTED = {
    'bound_func': 'True',
    'bound_self': 'True',
    'bound_type': "'method'",
    'class_access': 'True',
    'class_attr_lambda': "('lam', 'D')",
    'class_attr_nested': "('h', 'D', 3)",
    'class_lambda_inst': "('K', 1)",
    'class_read_lambda': 'True',
    'decorated_get': "('wrapped', 5)",
    'decorated_method': "('wrapped', 4)",
    'enum_lambda_call': "'f'",
    'enum_members': "['A']",
    'exception_subclass_lambda_binds': "('exc-plain', 'Ex')",
    'exception_subclass_static': "('exc-static', 1)",
    'hasattr': 'True',
    'ismethod': 'True',
    'lambda_get': "('lam', 'C')",
    'list_subclass_lambda_binds': "('list-plain', 2)",
    'list_subclass_static': "('list-static', 1)",
    'nested_get': "('h', 'C', 1)",
    'nested_get_arg': "('h', 'C', 5)",
    'nested_get_owner': "('h', 'C', 1)",
    'plain_nested_inst': "('inner', 'K', 5)",
    'static_lambda_cls': "('lam', 1)",
    'static_lambda_inst': "('lam', 1)",
    'static_nested_inst': "('inner', 'int', 2)",
    'staticmethod_of_nested': "('h', 'C', 1)",
    'sub_plain': "('inner', 'KSub', 6)",
    'sub_static': "('lam', 3)",
}


def mismatches():
    return sorted(k for k in EXPECTED if r.get(k) != EXPECTED[k])


def mismatches_when_run_by_path():
    """mismatches() of a copy run by runpy.run_path: there even the
    module-level helpers are ExecBlocks."""
    import runpy
    g = runpy.run_path(__file__, run_name='_execblock_get_by_path')
    return g['mismatches']()


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
