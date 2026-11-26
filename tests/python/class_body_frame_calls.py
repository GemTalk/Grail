"""Fixture: frame calls and super() in class bodies and lambdas (#2341, #2342,
#2326), each checked with the class at MODULE level (``m_'') and inside a def
(``l_'', a method-local class, which the IR arm builds through a helper of its
own).  Every expectation is CPython 3.14's, verified by running this file
directly; the IR arm, ``GRAIL_IR_CLASS_HELPER=0'' and ``GRAIL_IR_CODEGEN=0'' all
agree with it.

* ``eval_*'' / ``exec_*'' (#2341): a bare eval() or exec() in a class body runs
  with the class namespace as its locals and the module's as its globals -- it
  reads class attributes, binds them (a later statement reads the binding),
  defines methods, and does NOT see the enclosing function's locals; an eval of
  a name only the eval string mentions is CPython's NameError (it used to stop
  the module compiling).  Explicit namespaces, a nested class, a comprehension,
  a def default, an ``if'' and a ``try'' too.
* ``lambda_*'' / ``comp_*'' / ``fn_*'' (#2326): locals(), vars(), dir(), eval()
  and exec() in a lambda see the lambda's own frame -- its parameters, walrus
  targets, free variables and the targets of a comprehension inside it -- in a
  class body, in a def, and at module level.
* ``lambda_super*'' / ``lambda_class*'' (#2342): zero-argument super() and
  ``__class__'' in a lambda in a class body, a nested lambda, a lambda default
  and a lambda in a def's default.  super() binds the lambda's first parameter
  and raises ``super(): no arguments'' for a lambda that has none.

Not checked here (Grail differs from CPython for reasons outside these issues):
a genexp's ``.0'' in locals(), ``self.m()'' in a class-body lambda, ``exec('del
a')'' with a locals mapping, and a class body's locals() missing a ``for''
loop's names (#2352).
"""

r = {}


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = '%s: %s' % (type(exc).__name__, exc)


class B:
    def hi(self):
        return 'B'


# ---- eval_attr ----
class C:
    a = 1
    b = eval('a + 1')
record('m_eval_attr', lambda: C.b)


def l_eval_attr():
    class C:
        a = 1
        b = eval('a + 1')
    return C.b


record('l_eval_attr', l_eval_attr)

# ---- exec_attr ----
class C:
    a = 1
    exec('c = a + 2')
record('m_exec_attr', lambda: getattr(C, 'c', 'MISSING'))


def l_exec_attr():
    class C:
        a = 1
        exec('c = a + 2')
    return getattr(C, 'c', 'MISSING')


record('l_exec_attr', l_exec_attr)

# ---- exec_then_read ----
class C:
    exec('c = 3')
    d = c + 1
record('m_exec_then_read', lambda: (C.c, C.d))


def l_exec_then_read():
    class C:
        exec('c = 3')
        d = c + 1
    return (C.c, C.d)


record('l_exec_then_read', l_exec_then_read)

# ---- exec_def ----
class C:
    exec('def m(self): return 5')
record('m_exec_def', lambda: C().m())


def l_exec_def():
    class C:
        exec('def m(self): return 5')
    return C().m()


record('l_exec_def', l_exec_def)

# ---- exec_rebind_read ----
class C:
    a = 1
    exec('a = 10')
    b = a + 1
record('m_exec_rebind_read', lambda: (C.a, C.b))


def l_exec_rebind_read():
    class C:
        a = 1
        exec('a = 10')
        b = a + 1
    return (C.a, C.b)


record('l_exec_rebind_read', l_exec_rebind_read)

# ---- eval_global ----
G = 40
class C:
    b = eval('G + 1')
record('m_eval_global', lambda: C.b)


def l_eval_global():
    global G
    G = 40
    class C:
        b = eval('G + 1')
    return C.b


record('l_eval_global', l_eval_global)

# ---- eval_shadow_global ----
G = 40
class C:
    G = 'class'
    b = eval('G')
record('m_eval_shadow_global', lambda: C.b)


def l_eval_shadow_global():
    global G
    G = 40
    class C:
        G = 'class'
        b = eval('G')
    return C.b


record('l_eval_shadow_global', l_eval_shadow_global)

# ---- eval_builtin ----
class C:
    b = eval('len([1, 2])')
record('m_eval_builtin', lambda: C.b)


def l_eval_builtin():
    class C:
        b = eval('len([1, 2])')
    return C.b


record('l_eval_builtin', l_eval_builtin)

# ---- eval_enclosing_only ----
x = 7
class C:
    b = eval('x')
record('m_eval_enclosing_only', lambda: C.b)


def l_eval_enclosing_only():
    x = 7
    class C:
        b = eval('x')
    return C.b


record('l_eval_enclosing_only', l_eval_enclosing_only)

# ---- eval_enclosing_mentioned ----
x = 7
class C:
    y = x
    b = eval('x')
record('m_eval_enclosing_mentioned', lambda: (C.y, C.b))


def l_eval_enclosing_mentioned():
    x = 7
    class C:
        y = x
        b = eval('x')
    return (C.y, C.b)


record('l_eval_enclosing_mentioned', l_eval_enclosing_mentioned)

# ---- eval_explicit_globals ----
class C:
    a = 1
    b = eval('a', {'a': 5})
record('m_eval_explicit_globals', lambda: C.b)


def l_eval_explicit_globals():
    class C:
        a = 1
        b = eval('a', {'a': 5})
    return C.b


record('l_eval_explicit_globals', l_eval_explicit_globals)

# ---- eval_explicit_both ----
class C:
    a = 1
    b = eval('a', {}, {'a': 6})
record('m_eval_explicit_both', lambda: C.b)


def l_eval_explicit_both():
    class C:
        a = 1
        b = eval('a', {}, {'a': 6})
    return C.b


record('l_eval_explicit_both', l_eval_explicit_both)

# ---- eval_locals_arg ----
class C:
    a = 1
    b = eval('a + 2', globals(), locals())
record('m_eval_locals_arg', lambda: C.b)


def l_eval_locals_arg():
    class C:
        a = 1
        b = eval('a + 2', globals(), locals())
    return C.b


record('l_eval_locals_arg', l_eval_locals_arg)

# ---- exec_explicit_dict ----
class C:
    d = {}
    exec('z = 4', d)
    z = d['z']
record('m_exec_explicit_dict', lambda: (C.z, hasattr(C, 'q')))


def l_exec_explicit_dict():
    class C:
        d = {}
        exec('z = 4', d)
        z = d['z']
    return (C.z, hasattr(C, 'q'))


record('l_exec_explicit_dict', l_exec_explicit_dict)

# ---- eval_in_comp ----
class C:
    l = [eval('i * 2') for i in range(3)]
record('m_eval_in_comp', lambda: C.l)


def l_eval_in_comp():
    class C:
        l = [eval('i * 2') for i in range(3)]
    return C.l


record('l_eval_in_comp', l_eval_in_comp)

# ---- eval_in_def_header ----
class C:
    a = 3
    def m(self, k=eval('a')):
        return k
record('m_eval_in_def_header', lambda: C().m())


def l_eval_in_def_header():
    class C:
        a = 3
        def m(self, k=eval('a')):
            return k
    return C().m()


record('l_eval_in_def_header', l_eval_in_def_header)

# ---- eval_nested_class ----
class C:
    a = 1
    class D:
        a = 2
        b = eval('a')
record('m_eval_nested_class', lambda: C.D.b)


def l_eval_nested_class():
    class C:
        a = 1
        class D:
            a = 2
            b = eval('a')
    return C.D.b


record('l_eval_nested_class', l_eval_nested_class)

# ---- eval_sees_later_assign ----
class C:
    b = eval("'a' in dir()")
    a = 1
record('m_eval_sees_later_assign', lambda: C.b)


def l_eval_sees_later_assign():
    class C:
        b = eval("'a' in dir()")
        a = 1
    return C.b


record('l_eval_sees_later_assign', l_eval_sees_later_assign)

# ---- exec_in_if ----
class C:
    a = 1
    if a:
        exec('c = a + 5')
    d = c
record('m_exec_in_if', lambda: (C.c, C.d))


def l_exec_in_if():
    class C:
        a = 1
        if a:
            exec('c = a + 5')
        d = c
    return (C.c, C.d)


record('l_exec_in_if', l_exec_in_if)

# ---- exec_in_try ----
class C:
    a = 1
    try:
        exec('c = a + 6')
    except Exception:
        pass
record('m_exec_in_try', lambda: getattr(C, 'c', 'MISSING'))


def l_exec_in_try():
    class C:
        a = 1
        try:
            exec('c = a + 6')
        except Exception:
            pass
    return getattr(C, 'c', 'MISSING')


record('l_exec_in_try', l_exec_in_try)

# ---- eval_walrus_binds ----
class C:
    b = eval('(z := 4) + 1')
record('m_eval_walrus_binds', lambda: (C.b, getattr(C, 'z', 'MISSING')))


def l_eval_walrus_binds():
    class C:
        b = eval('(z := 4) + 1')
    return (C.b, getattr(C, 'z', 'MISSING'))


record('l_eval_walrus_binds', l_eval_walrus_binds)

# ---- exec_sees_enclosing_cell ----
x = 3
class C:
    y = x
    exec('w = y * 2')
record('m_exec_sees_enclosing_cell', lambda: C.w)


def l_exec_sees_enclosing_cell():
    x = 3
    class C:
        y = x
        exec('w = y * 2')
    return C.w


record('l_exec_sees_enclosing_cell', l_exec_sees_enclosing_cell)

# ---- lambda_walrus_locals ----
class C:
    f = staticmethod(lambda: ((y := 1), sorted(locals()))[1])
record('m_lambda_walrus_locals', lambda: C.f())


def l_lambda_walrus_locals():
    class C:
        f = staticmethod(lambda: ((y := 1), sorted(locals()))[1])
    return C.f()


record('l_lambda_walrus_locals', l_lambda_walrus_locals)

# ---- lambda_locals_before_walrus ----
class C:
    f = staticmethod(lambda: (sorted(locals()), (y := 1))[0])
record('m_lambda_locals_before_walrus', lambda: C.f())


def l_lambda_locals_before_walrus():
    class C:
        f = staticmethod(lambda: (sorted(locals()), (y := 1))[0])
    return C.f()


record('l_lambda_locals_before_walrus', l_lambda_locals_before_walrus)

# ---- lambda_args_locals ----
class C:
    f = staticmethod(lambda a, /, b, *c, d, **e: sorted(locals()))
record('m_lambda_args_locals', lambda: C.f(1, 2, 3, d=4, z=5))


def l_lambda_args_locals():
    class C:
        f = staticmethod(lambda a, /, b, *c, d, **e: sorted(locals()))
    return C.f(1, 2, 3, d=4, z=5)


record('l_lambda_args_locals', l_lambda_args_locals)

# ---- lambda_self_locals ----
class C:
    f = lambda self: sorted(locals())
record('m_lambda_self_locals', lambda: C().f())


def l_lambda_self_locals():
    class C:
        f = lambda self: sorted(locals())
    return C().f()


record('l_lambda_self_locals', l_lambda_self_locals)

# ---- lambda_locals ----
class C:
    a = 1
    f = staticmethod(lambda q=2: sorted(locals()))
record('m_lambda_locals', lambda: C.f())


def l_lambda_locals():
    class C:
        a = 1
        f = staticmethod(lambda q=2: sorted(locals()))
    return C.f()


record('l_lambda_locals', l_lambda_locals)

# ---- lambda_locals_value ----
class C:
    a = 1
    f = lambda q: locals()
record('m_lambda_locals_value', lambda: C.f(5))


def l_lambda_locals_value():
    class C:
        a = 1
        f = lambda q: locals()
    return C.f(5)


record('l_lambda_locals_value', l_lambda_locals_value)

# ---- lambda_vars ----
class C:
    a = 1
    f = staticmethod(lambda: vars())
record('m_lambda_vars', lambda: C.f())


def l_lambda_vars():
    class C:
        a = 1
        f = staticmethod(lambda: vars())
    return C.f()


record('l_lambda_vars', l_lambda_vars)

# ---- lambda_dir ----
class C:
    a = 1
    f = lambda q: dir()
record('m_lambda_dir', lambda: C.f(5))


def l_lambda_dir():
    class C:
        a = 1
        f = lambda q: dir()
    return C.f(5)


record('l_lambda_dir', l_lambda_dir)

# ---- lambda_eval ----
class C:
    a = 1
    f = lambda q: eval('q + 1')
record('m_lambda_eval', lambda: C.f(5))


def l_lambda_eval():
    class C:
        a = 1
        f = lambda q: eval('q + 1')
    return C.f(5)


record('l_lambda_eval', l_lambda_eval)

# ---- lambda_eval_classname ----
a = "module"
class C:
    a = 1
    f = lambda q: eval('a')
record('m_lambda_eval_classname', lambda: C.f(5))


def l_lambda_eval_classname():
    global a
    a = "module"
    class C:
        a = 1
        f = lambda q: eval('a')
    return C.f(5)


record('l_lambda_eval_classname', l_lambda_eval_classname)

# ---- lambda_exec ----
class C:
    f = staticmethod(lambda: exec('t = 1'))
record('m_lambda_exec', lambda: C.f())


def l_lambda_exec():
    class C:
        f = staticmethod(lambda: exec('t = 1'))
    return C.f()


record('l_lambda_exec', l_lambda_exec)

# ---- lambda_globals ----
class C:
    f = staticmethod(lambda: globals())
record('m_lambda_globals', lambda: C.f() is globals())


def l_lambda_globals():
    class C:
        f = staticmethod(lambda: globals())
    return C.f() is globals()


record('l_lambda_globals', l_lambda_globals)

# ---- lambda_nested_locals ----
class C:
    a = 1
    f = staticmethod(lambda q: (lambda r: sorted(locals()))(2))
record('m_lambda_nested_locals', lambda: C.f(1))


def l_lambda_nested_locals():
    class C:
        a = 1
        f = staticmethod(lambda q: (lambda r: sorted(locals()))(2))
    return C.f(1)


record('l_lambda_nested_locals', l_lambda_nested_locals)

# ---- lambda_nested_free ----
class C:
    a = 1
    f = staticmethod(lambda q: (lambda r: (q, sorted(locals())))(2))
record('m_lambda_nested_free', lambda: C.f(1))


def l_lambda_nested_free():
    class C:
        a = 1
        f = staticmethod(lambda q: (lambda r: (q, sorted(locals())))(2))
    return C.f(1)


record('l_lambda_nested_free', l_lambda_nested_free)

# ---- lambda_nested_dir ----
class C:
    f = staticmethod(lambda q: (lambda r: dir())(2))
record('m_lambda_nested_dir', lambda: C.f(1))


def l_lambda_nested_dir():
    class C:
        f = staticmethod(lambda q: (lambda r: dir())(2))
    return C.f(1)


record('l_lambda_nested_dir', l_lambda_nested_dir)

# ---- lambda_nested_eval ----
class C:
    f = staticmethod(lambda q: (lambda r: eval('r * 10'))(2))
record('m_lambda_nested_eval', lambda: C.f(1))


def l_lambda_nested_eval():
    class C:
        f = staticmethod(lambda q: (lambda r: eval('r * 10'))(2))
    return C.f(1)


record('l_lambda_nested_eval', l_lambda_nested_eval)

# ---- lambda_enclosing_free ----
x = 7
class C:
    f = staticmethod(lambda q: sorted(locals().items()) + [x])
record('m_lambda_enclosing_free', lambda: C.f(1))


def l_lambda_enclosing_free():
    x = 7
    class C:
        f = staticmethod(lambda q: sorted(locals().items()) + [x])
    return C.f(1)


record('l_lambda_enclosing_free', l_lambda_enclosing_free)

# ---- lambda_default_locals ----
class C:
    a = 1
    f = staticmethod(lambda q=sorted(locals()): q)
record('m_lambda_default_locals', lambda: [n for n in C.f() if not n.startswith('__')])


def l_lambda_default_locals():
    class C:
        a = 1
        f = staticmethod(lambda q=sorted(locals()): q)
    return [n for n in C.f() if not n.startswith('__')]


record('l_lambda_default_locals', l_lambda_default_locals)

# ---- lambda_in_comp_locals ----
class C:
    l = [(lambda r: sorted(locals()))(i) for i in range(1)]
record('m_lambda_in_comp_locals', lambda: C.l)


def l_lambda_in_comp_locals():
    class C:
        l = [(lambda r: sorted(locals()))(i) for i in range(1)]
    return C.l


record('l_lambda_in_comp_locals', l_lambda_in_comp_locals)

# ---- comp_in_lambda_locals ----
class C:
    f = staticmethod(lambda q: [sorted(locals()) for i in range(1)])
record('m_comp_in_lambda_locals', lambda: C.f(1))


def l_comp_in_lambda_locals():
    class C:
        f = staticmethod(lambda q: [sorted(locals()) for i in range(1)])
    return C.f(1)


record('l_comp_in_lambda_locals', l_comp_in_lambda_locals)

# ---- comp_locals ----
class C:
    a = 1
    l = [sorted(locals()) for x in range(1)]
record('m_comp_locals', lambda: C.l)


def l_comp_locals():
    class C:
        a = 1
        l = [sorted(locals()) for x in range(1)]
    return C.l


record('l_comp_locals', l_comp_locals)

# ---- comp_dir ----
class C:
    a = 1
    l = [dir() for x in range(1)]
record('m_comp_dir', lambda: C.l)


def l_comp_dir():
    class C:
        a = 1
        l = [dir() for x in range(1)]
    return C.l


record('l_comp_dir', l_comp_dir)

# ---- body_locals ----
class C:
    a = 1
    l = sorted(locals())
record('m_body_locals', lambda: [n for n in C.l if n not in ('__module__', '__qualname__', '__firstlineno__')])


def l_body_locals():
    class C:
        a = 1
        l = sorted(locals())
    return [n for n in C.l if n not in ('__module__', '__qualname__', '__firstlineno__')]


record('l_body_locals', l_body_locals)

# ---- body_dir ----
class C:
    a = 1
    l = dir()
record('m_body_dir', lambda: [n for n in C.l if n not in ('__module__', '__qualname__', '__firstlineno__')])


def l_body_dir():
    class C:
        a = 1
        l = dir()
    return [n for n in C.l if n not in ('__module__', '__qualname__', '__firstlineno__')]


record('l_body_dir', l_body_dir)

# ---- fn_lambda_locals ----
a = 1
g = lambda q: sorted(locals())
record('m_fn_lambda_locals', lambda: g(5))


def l_fn_lambda_locals():
    a = 1
    g = lambda q: sorted(locals())
    return g(5)


record('l_fn_lambda_locals', l_fn_lambda_locals)

# ---- fn_lambda_dir ----
a = 1
g = lambda q: dir()
record('m_fn_lambda_dir', lambda: g(5))


def l_fn_lambda_dir():
    a = 1
    g = lambda q: dir()
    return g(5)


record('l_fn_lambda_dir', l_fn_lambda_dir)

# ---- fn_lambda_eval ----
a = 1
g = lambda q: eval('q + 1')
record('m_fn_lambda_eval', lambda: g(5))


def l_fn_lambda_eval():
    a = 1
    g = lambda q: eval('q + 1')
    return g(5)


record('l_fn_lambda_eval', l_fn_lambda_eval)

# ---- fn_lambda_free ----
a = 1
g = lambda q: (a, sorted(locals()))
record('m_fn_lambda_free', lambda: g(5))


def l_fn_lambda_free():
    a = 1
    g = lambda q: (a, sorted(locals()))
    return g(5)


record('l_fn_lambda_free', l_fn_lambda_free)

# ---- fn_lambda_vars_default ----
a = 1
g = lambda q, r=2: vars()
record('m_fn_lambda_vars_default', lambda: g(5))


def l_fn_lambda_vars_default():
    a = 1
    g = lambda q, r=2: vars()
    return g(5)


record('l_fn_lambda_vars_default', l_fn_lambda_vars_default)

# ---- fn_comp_in_lambda ----
g = lambda q: [sorted(locals()) for i in range(1)]
record('m_fn_comp_in_lambda', lambda: g(5))


def l_fn_comp_in_lambda():
    g = lambda q: [sorted(locals()) for i in range(1)]
    return g(5)


record('l_fn_comp_in_lambda', l_fn_comp_in_lambda)

# ---- lambda_super ----
class D(B):
    hi2 = lambda self: super().hi()
record('m_lambda_super', lambda: D().hi2())


def l_lambda_super():
    class D(B):
        hi2 = lambda self: super().hi()
    return D().hi2()


record('l_lambda_super', l_lambda_super)

# ---- lambda_super_args ----
class D(B):
    hi2 = lambda self, k=1: (super().hi(), k)
record('m_lambda_super_args', lambda: D().hi2())


def l_lambda_super_args():
    class D(B):
        hi2 = lambda self, k=1: (super().hi(), k)
    return D().hi2()


record('l_lambda_super_args', l_lambda_super_args)

# ---- lambda_super_noargs ----
class D(B):
    hi2 = staticmethod(lambda: super().hi())
record('m_lambda_super_noargs', lambda: D.hi2())


def l_lambda_super_noargs():
    class D(B):
        hi2 = staticmethod(lambda: super().hi())
    return D.hi2()


record('l_lambda_super_noargs', l_lambda_super_noargs)

# ---- lambda_super_nested ----
class D(B):
    hi2 = lambda self: (lambda s=self: super().hi())()
record('m_lambda_super_nested', lambda: D().hi2())


def l_lambda_super_nested():
    class D(B):
        hi2 = lambda self: (lambda s=self: super().hi())()
    return D().hi2()


record('l_lambda_super_nested', l_lambda_super_nested)

# ---- lambda_super_nested_noarg ----
class D(B):
    hi2 = lambda self: (lambda: super().hi())()
record('m_lambda_super_nested_noarg', lambda: D().hi2())


def l_lambda_super_nested_noarg():
    class D(B):
        hi2 = lambda self: (lambda: super().hi())()
    return D().hi2()


record('l_lambda_super_nested_noarg', l_lambda_super_nested_noarg)

# ---- lambda_super_in_default ----
class D(B):
    def m(self, f=lambda s: super().hi()):
        return f(self)
record('m_lambda_super_in_default', lambda: D().m())


def l_lambda_super_in_default():
    class D(B):
        def m(self, f=lambda s: super().hi()):
            return f(self)
    return D().m()


record('l_lambda_super_in_default', l_lambda_super_in_default)

# ---- lambda_super_in_lambda_default ----
class D(B):
    m = lambda self, f=lambda s: super().hi(): f(self)
record('m_lambda_super_in_lambda_default', lambda: D().m())


def l_lambda_super_in_lambda_default():
    class D(B):
        m = lambda self, f=lambda s: super().hi(): f(self)
    return D().m()


record('l_lambda_super_in_lambda_default', l_lambda_super_in_lambda_default)

# ---- lambda_class ----
class D:
    k = staticmethod(lambda: __class__)
record('m_lambda_class', lambda: D.k() is D)


def l_lambda_class():
    class D:
        k = staticmethod(lambda: __class__)
    return D.k() is D


record('l_lambda_class', l_lambda_class)

# ---- lambda_class_nested ----
class D:
    k = staticmethod(lambda: (lambda: __class__)())
record('m_lambda_class_nested', lambda: D.k() is D)


def l_lambda_class_nested():
    class D:
        k = staticmethod(lambda: (lambda: __class__)())
    return D.k() is D


record('l_lambda_class_nested', l_lambda_class_nested)

# ---- lambda_class_in_default ----
class D:
    def m(self, f=lambda: __class__):
        return f()
record('m_lambda_class_in_default', lambda: D().m() is D)


def l_lambda_class_in_default():
    class D:
        def m(self, f=lambda: __class__):
            return f()
    return D().m() is D


record('l_lambda_class_in_default', l_lambda_class_in_default)

# ---- lambda_super_classmethod ----
class D(B):
    @classmethod
    def k(cls):
        return 'Bk'
    f = classmethod(lambda cls: super().__init_subclass__ is not None)
record('m_lambda_super_classmethod', lambda: D.f())


def l_lambda_super_classmethod():
    class D(B):
        @classmethod
        def k(cls):
            return 'Bk'
        f = classmethod(lambda cls: super().__init_subclass__ is not None)
    return D.f()


record('l_lambda_super_classmethod', l_lambda_super_classmethod)


EXPECTED = {
    'l_body_dir': ['a'],
    'l_body_locals': ['a'],
    'l_comp_dir': [['x']],
    'l_comp_in_lambda_locals': [['i', 'q']],
    'l_comp_locals': [['x']],
    'l_eval_attr': 2,
    'l_eval_builtin': 2,
    'l_eval_enclosing_mentioned': (7, 7),
    'l_eval_enclosing_only': 7,
    'l_eval_explicit_both': 6,
    'l_eval_explicit_globals': 5,
    'l_eval_global': 41,
    'l_eval_in_comp': [0, 2, 4],
    'l_eval_in_def_header': 3,
    'l_eval_locals_arg': 3,
    'l_eval_nested_class': 2,
    'l_eval_sees_later_assign': False,
    'l_eval_shadow_global': 'class',
    'l_eval_walrus_binds': (5, 4),
    'l_exec_attr': 3,
    'l_exec_def': 5,
    'l_exec_explicit_dict': (4, False),
    'l_exec_in_if': (6, 6),
    'l_exec_in_try': 7,
    'l_exec_rebind_read': (10, 11),
    'l_exec_sees_enclosing_cell': 6,
    'l_exec_then_read': (3, 4),
    'l_fn_comp_in_lambda': [['i', 'q']],
    'l_fn_lambda_dir': ['q'],
    'l_fn_lambda_eval': 6,
    'l_fn_lambda_free': (1, ['a', 'q']),
    'l_fn_lambda_locals': ['q'],
    'l_fn_lambda_vars_default': {'q': 5, 'r': 2},
    'l_lambda_args_locals': ['a', 'b', 'c', 'd', 'e'],
    'l_lambda_class': True,
    'l_lambda_class_in_default': True,
    'l_lambda_class_nested': True,
    'l_lambda_default_locals': ['a'],
    'l_lambda_dir': ['q'],
    'l_lambda_enclosing_free': [('q', 1), ('x', 7), 7],
    'l_lambda_eval': 6,
    'l_lambda_eval_classname': 'module',
    'l_lambda_exec': None,
    'l_lambda_globals': True,
    'l_lambda_in_comp_locals': [['r']],
    'l_lambda_locals': ['q'],
    'l_lambda_locals_before_walrus': [],
    'l_lambda_locals_value': {'q': 5},
    'l_lambda_nested_dir': ['r'],
    'l_lambda_nested_eval': 20,
    'l_lambda_nested_free': (1, ['q', 'r']),
    'l_lambda_nested_locals': ['r'],
    'l_lambda_self_locals': ['self'],
    'l_lambda_super': 'B',
    'l_lambda_super_args': ('B', 1),
    'l_lambda_super_classmethod': True,
    'l_lambda_super_in_default': 'B',
    'l_lambda_super_in_lambda_default': 'B',
    'l_lambda_super_nested': 'B',
    'l_lambda_super_nested_noarg': 'RuntimeError: super(): no arguments',
    'l_lambda_super_noargs': 'RuntimeError: super(): no arguments',
    'l_lambda_vars': {},
    'l_lambda_walrus_locals': ['y'],
    'm_body_dir': ['a'],
    'm_body_locals': ['a'],
    'm_comp_dir': [['x']],
    'm_comp_in_lambda_locals': [['i', 'q']],
    'm_comp_locals': [['x']],
    'm_eval_attr': 2,
    'm_eval_builtin': 2,
    'm_eval_enclosing_mentioned': (7, 7),
    'm_eval_enclosing_only': 7,
    'm_eval_explicit_both': 6,
    'm_eval_explicit_globals': 5,
    'm_eval_global': 41,
    'm_eval_in_comp': [0, 2, 4],
    'm_eval_in_def_header': 3,
    'm_eval_locals_arg': 3,
    'm_eval_nested_class': 2,
    'm_eval_sees_later_assign': False,
    'm_eval_shadow_global': 'class',
    'm_eval_walrus_binds': (5, 4),
    'm_exec_attr': 3,
    'm_exec_def': 5,
    'm_exec_explicit_dict': (4, False),
    'm_exec_in_if': (6, 6),
    'm_exec_in_try': 7,
    'm_exec_rebind_read': (10, 11),
    'm_exec_sees_enclosing_cell': 6,
    'm_exec_then_read': (3, 4),
    'm_fn_comp_in_lambda': [['i', 'q']],
    'm_fn_lambda_dir': ['q'],
    'm_fn_lambda_eval': 6,
    'm_fn_lambda_free': (1, ['q']),
    'm_fn_lambda_locals': ['q'],
    'm_fn_lambda_vars_default': {'q': 5, 'r': 2},
    'm_lambda_args_locals': ['a', 'b', 'c', 'd', 'e'],
    'm_lambda_class': True,
    'm_lambda_class_in_default': True,
    'm_lambda_class_nested': True,
    'm_lambda_default_locals': ['a'],
    'm_lambda_dir': ['q'],
    'm_lambda_enclosing_free': [('q', 1), 7],
    'm_lambda_eval': 6,
    'm_lambda_eval_classname': 'module',
    'm_lambda_exec': None,
    'm_lambda_globals': True,
    'm_lambda_in_comp_locals': [['r']],
    'm_lambda_locals': ['q'],
    'm_lambda_locals_before_walrus': [],
    'm_lambda_locals_value': {'q': 5},
    'm_lambda_nested_dir': ['r'],
    'm_lambda_nested_eval': 20,
    'm_lambda_nested_free': (1, ['q', 'r']),
    'm_lambda_nested_locals': ['r'],
    'm_lambda_self_locals': ['self'],
    'm_lambda_super': 'B',
    'm_lambda_super_args': ('B', 1),
    'm_lambda_super_classmethod': True,
    'm_lambda_super_in_default': 'B',
    'm_lambda_super_in_lambda_default': 'B',
    'm_lambda_super_nested': 'B',
    'm_lambda_super_nested_noarg': 'RuntimeError: super(): no arguments',
    'm_lambda_super_noargs': 'RuntimeError: super(): no arguments',
    'm_lambda_vars': {},
    'm_lambda_walrus_locals': ['y'],
}


KEYS = sorted(EXPECTED)


def disagreements():
    """The checks that disagree with CPython, as printable lines (read by
    ClassBodyFrameCallsIRTestCase)."""
    bad = ['%s: %r, CPython %r' % (k, r.get(k, '<missing>'), EXPECTED[k])
           for k in KEYS if r.get(k, '<missing>') != EXPECTED[k]]
    return bad + ['%s is not in EXPECTED' % k for k in sorted(set(r) - set(EXPECTED))]


if __name__ == '__main__':
    for key in KEYS:
        print('%-5s %-36s -> %r' % ('OK' if r.get(key, '<missing>') == EXPECTED[key] else 'FAIL', key, r.get(key, '<missing>')))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-36s is not in EXPECTED' % ('FAIL', extra))
