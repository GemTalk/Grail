"""A class statement in a def binds its local name only when the class is done (#1696).

CPython builds the class first and stores the name last, so a class body,
metaclass, ``__init_subclass__`` or decorator that raises leaves the name as
it was: the previous value, or unbound.  Grail's text arm (GRAIL_IR_CODEGEN=0)
built the class in the def's own local, so the half-built class stayed bound.
A class-body read of the name also saw the class being built, where CPython
reads the enclosing binding.  The IR arm already built the class in a helper
method and assigned the local from its answer; this fixture holds both arms
to the same rows.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


def _boom():
    raise ValueError('boom')


def body_raises_unbound():
    try:
        class L:
            _boom()
    except ValueError:
        pass
    try:
        L
        return 'bound'
    except NameError:
        return 'unbound'


def body_raises_keeps_previous():
    L = 'prev'
    try:
        class L:
            x = 1 / 0
    except ZeroDivisionError:
        pass
    return L


def body_reads_enclosing_binding():
    L = 'prev'

    class L:
        seen = L
    return (L.__name__, L.seen)


def method_reads_final_binding():
    class L:
        def me(self):
            return L
    return L().me() is L


def nonlocal_keeps_previous():
    L = 'prev'

    def inner():
        nonlocal L
        try:
            class L:
                _boom()
        except ValueError:
            pass
    inner()
    return L


def nonlocal_binds():
    L = 'prev'

    def inner():
        nonlocal L

        class L:
            pass
    inner()
    return L.__name__


def decorator_raises_keeps_previous():
    def deco(cls):
        raise ValueError('deco')
    L = 'prev'
    try:
        @deco
        class L:
            pass
    except ValueError:
        pass
    return L


def decorator_result_is_bound():
    def deco(cls):
        return ('decorated', cls.__name__)

    @deco
    class L:
        pass
    return L


def decorator_sees_previous_binding():
    seen = []

    def deco(cls):
        seen.append(L)
        return cls
    L = 'prev'

    @deco
    class L:
        pass
    return (seen, L.__name__)


def metaclass_raises_keeps_previous():
    class Meta(type):
        def __new__(mcls, name, bases, ns):
            raise TypeError('meta')
    L = 'prev'
    try:
        class L(metaclass=Meta):
            pass
    except TypeError:
        pass
    return L


def init_subclass_raises_keeps_previous():
    class Base:
        def __init_subclass__(cls):
            raise RuntimeError('init_subclass')
    L = 'prev'
    try:
        class L(Base):
            pass
    except RuntimeError:
        pass
    return L


def class_cell_during_build():
    # __class__ is the class under construction even while the NAME still
    # holds its previous binding: a metaclass that calls a method during
    # creation must see it.  (Grail keeps __class__ and a method's read of the
    # class name in one cell, so a method reading the NAME during
    # construction sees the class too, where CPython reads 'prev' -- #1715.)
    seen = []

    class Meta(type):
        def __init__(cls, *args):
            super().__init__(*args)
            cls.peek()
    L = 'prev'

    class L(metaclass=Meta):
        @classmethod
        def peek(cls):
            seen.append(__class__)
    return (seen[0] is L, L.__name__)


def zero_arg_super_during_build():
    class Base:
        def __init_subclass__(cls):
            cls.tag = cls.make()

        @classmethod
        def make(cls):
            return 'base'
    L = 'prev'

    class L(Base):
        @classmethod
        def make(cls):
            return 'sub+' + super().make()
    return L.tag


def class_reserved_name():
    class super:
        k = 1
    return (super.__name__, super.k)


def class_in_loop():
    out = []
    for i in range(3):
        class L:
            n = i
        out.append(L.n)
    return (out, L.n)


def class_body_helper_temps():
    L = 'prev'
    try:
        class L:
            ok = 1 < 2 < 3
            _boom()
    except ValueError:
        pass
    return L


def class_nested_same_name():
    class L:
        class L:
            v = 'inner'
    return (L.__qualname__, L.L.__qualname__, L.L.v)


def gen_class():
    L = 'prev'
    try:
        class L:
            _boom()
    except ValueError:
        pass
    yield L

    class L:
        pass
    yield L.__name__


class Host:
    def private_class(self):
        class __P:
            v = 'p'
        return (__P.__name__, __P.v)

    def private_class_keeps_previous(self):
        __P = 'prev'
        try:
            class __P:
                _boom()
        except ValueError:
            pass
        return __P


def body_reads_own_unbound_name():
    # The read raises rather than seeing the class being built.  The CLASS
    # and text of the error are #1712 (Grail raises UnboundLocalError where
    # CPython raises a plain NameError about a free variable), so this row
    # asks only that it is a NameError.
    try:
        class L:
            x = L
    except NameError:
        return 'NameError'
    return L


def raise_statement_keeps_previous():
    L = 'prev'
    try:
        class L:
            raise ValueError('body')
    except ValueError:
        pass
    return L


def if_import_and_del():
    class L:
        x = 1
        if True:
            import math
            del x
    return (hasattr(L, 'math'), hasattr(L, 'x'))


def try_and_for_assign():
    class L:
        try:
            y = 2
        finally:
            pass
        for z in (1, 2, 3):
            pass
    return (L.y, L.z)


def nested_in_try():
    class L:
        try:
            class Inner:
                v = 'inner'
        except Exception:
            pass
    return (L.Inner.v, L.Inner.__qualname__)


def augmented_assign():
    class D:
        s = 'a'
        s += 'b'
    return D.s


def exec_raise_keeps_previous():
    g = {'E': 'prev'}
    try:
        exec('class E:\n    raise ValueError\n', g)
    except ValueError:
        pass
    return g['E']


def exec_keeps_previous():
    g = {'_boom': _boom, 'E': 'prev'}
    try:
        exec('class E:\n    _boom()\n', g)
    except ValueError:
        pass
    return g['E']


def exec_function_keeps_previous():
    g = {'_boom': _boom}
    exec('def f():\n'
         '    E = "prev"\n'
         '    try:\n'
         '        class E:\n'
         '            _boom()\n'
         '    except ValueError:\n'
         '        pass\n'
         '    return E\n', g)
    return g['f']()


t('body_raises_unbound', body_raises_unbound)
t('body_raises_keeps_previous', body_raises_keeps_previous)
t('body_reads_enclosing_binding', body_reads_enclosing_binding)
t('method_reads_final_binding', method_reads_final_binding)
t('nonlocal_keeps_previous', nonlocal_keeps_previous)
t('nonlocal_binds', nonlocal_binds)
t('decorator_raises_keeps_previous', decorator_raises_keeps_previous)
t('decorator_result_is_bound', decorator_result_is_bound)
t('decorator_sees_previous_binding', decorator_sees_previous_binding)
t('metaclass_raises_keeps_previous', metaclass_raises_keeps_previous)
t('init_subclass_raises_keeps_previous', init_subclass_raises_keeps_previous)
t('class_cell_during_build', class_cell_during_build)
t('zero_arg_super_during_build', zero_arg_super_during_build)
t('class_reserved_name', class_reserved_name)
t('class_in_loop', class_in_loop)
t('class_body_helper_temps', class_body_helper_temps)
t('class_nested_same_name', class_nested_same_name)
t('generator', lambda: list(gen_class()))
t('private_class', lambda: Host().private_class())
t('private_class_keeps_previous', lambda: Host().private_class_keeps_previous())
t('body_reads_own_unbound_name', body_reads_own_unbound_name)
t('raise_statement_keeps_previous', raise_statement_keeps_previous)
t('if_import_and_del', if_import_and_del)
t('try_and_for_assign', try_and_for_assign)
t('nested_in_try', nested_in_try)
t('augmented_assign', augmented_assign)
t('exec_raise_keeps_previous', exec_raise_keeps_previous)
t('exec_keeps_previous', exec_keeps_previous)
t('exec_function_keeps_previous', exec_function_keeps_previous)


EXPECTED = {
    'augmented_assign': "'ab'",
    'body_raises_keeps_previous': "'prev'",
    'body_raises_unbound': "'unbound'",
    'body_reads_enclosing_binding': "('L', 'prev')",
    'body_reads_own_unbound_name': "'NameError'",
    'class_body_helper_temps': "'prev'",
    'class_cell_during_build': "(True, 'L')",
    'class_in_loop': '([0, 1, 2], 2)',
    'class_nested_same_name': "('class_nested_same_name.<locals>.L', 'class_nested_same_name.<locals>.L.L', 'inner')",
    'class_reserved_name': "('super', 1)",
    'decorator_raises_keeps_previous': "'prev'",
    'decorator_result_is_bound': "('decorated', 'L')",
    'decorator_sees_previous_binding': "(['prev'], 'L')",
    'exec_function_keeps_previous': "'prev'",
    'exec_keeps_previous': "'prev'",
    'exec_raise_keeps_previous': "'prev'",
    'generator': "['prev', 'L']",
    'if_import_and_del': '(True, False)',
    'init_subclass_raises_keeps_previous': "'prev'",
    'metaclass_raises_keeps_previous': "'prev'",
    'method_reads_final_binding': 'True',
    'nested_in_try': "('inner', 'nested_in_try.<locals>.L.Inner')",
    'nonlocal_binds': "'L'",
    'nonlocal_keeps_previous': "'prev'",
    'private_class': "('__P', 'p')",
    'private_class_keeps_previous': "'prev'",
    'raise_statement_keeps_previous': "'prev'",
    'try_and_for_assign': '(2, 3)',
    'zero_arg_super_during_build': "'sub+base'",
}


def mismatches():
    return sorted(k for k in EXPECTED if r.get(k) != EXPECTED[k])


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
