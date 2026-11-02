"""Fixture: function, closure and lambda shapes the IR path used to refuse.

Plan item P1.2 ("PR 2"): each shape below was a census refusal of
FunctionDefAst / LambdaAst / NonlocalAst, so its enclosing def compiled as
Smalltalk TEXT even with the IR seam on.  IRFunctionShapesTestCase imports this
file with the seam forced on and asserts three things: every value agrees with
the EXPECTED table (measured under CPython 3.14 -- run this file directly), the
same values come out of the text path, and the census records no refusal for
any def here.

The row each group retires is named beside it.  Every shape is reached
through a top-level function or a method, never at module level, because a
module body is still text and would prove nothing.
"""

r = {}


def record(key, fn):
    try:
        r[key] = repr(fn())
    except Exception as exc:
        r[key] = '%s: %s' % (type(exc).__name__, exc)


# --- method:noSelfNamesReceiver ------------------------------------------------
# A method-local class's def that takes NO positional parameter and reads the
# ENCLOSING method's ``self'' (test_copy's __reduce__ / __reduce_ex__ hooks).
# CPython reads it from the closure; the text used to hand back the C instance.

class Host:
    tag = 'the host'

    def run(self):
        class C(object):
            def __reduce_ex__(self, proto):
                return ('reduce_ex', proto, type(self).__name__)

            def __reduce__(*args):
                return (self.tag, len(args), type(args[0]).__name__)

        return C().__reduce__(), C().__reduce_ex__(2)

    def run_kwargs_only(self):
        class C:
            def m(*args, **kw):
                return (self.tag, len(args), sorted(kw))

        return C().m(a=1)


record('no_positional_reads_enclosing_self', Host().run)
record('kwargs_only_reads_enclosing_self', Host().run_kwargs_only)


# --- signature:defaultReadsLocal -----------------------------------------------
# A method default that names the receiver's spelling, which at def time is the
# ENCLOSING method's ``self'' (test_descr's Checker).

class Describer:
    tag = 'describer'

    def checker(self):
        class Checker(object):
            def __getattr__(self, attr, test=self):
                return (attr, getattr(test, 'tag', test))

            def __getattribute__(self, attr, test=self):
                if attr == 'z':
                    return ('getattribute', test.tag)
                return object.__getattribute__(self, attr)

        c = Checker()
        return c.z, c.__getattr__('q'), c.__getattr__('q', 'explicit')


record('default_reads_enclosing_self', Describer().checker)


# --- method:selfDeleted --------------------------------------------------------

class Deleter:
    def m(self):
        before = type(self).__name__
        del self
        try:
            return before, self
        except NameError as e:
            return before, type(e).__name__

    def rebind_after_del(self):
        del self
        self = 'rebound'
        return self


record('del_self_then_read', Deleter().m)
record('del_self_then_rebind', Deleter().rebind_after_del)


# --- LambdaAst:yield -----------------------------------------------------------
# test_generators' test_lambda_generator.

def lambda_generators():
    f = lambda: (yield 1)

    def g():
        return (yield 1)

    f2 = lambda: (yield from g())
    out = [type(f()).__name__, next(f())]
    for gen_fun in (f, f2):
        gen = gen_fun()
        out.append(next(gen))
        try:
            gen.send(2)
        except StopIteration as e:
            out.append(('stop', e.value))
    return out


def lambda_generator_with_args():
    f = lambda a, b=10: (yield a + b)
    return list(f(1)), list(f(1, 2))


record('lambda_generator', lambda_generators)
record('lambda_generator_with_args', lambda_generator_with_args)


# --- LambdaAst:walrus ----------------------------------------------------------
# PEP 572: the target binds in the LAMBDA's scope.

def lambda_walrus():
    h = lambda: (x := 5)
    return h()


def lambda_walrus_reads_enclosing(y):
    h = lambda a: (z := a + y, z * 2)
    return h(3)


def lambda_walrus_does_not_leak():
    x = 'outer'
    (lambda: (x := 'inner'))()
    return x


def lambda_walrus_read_before_bind():
    h = lambda: x + (x := 1)
    return h()


def lambda_walrus_rebinds_parameter():
    h = lambda n: (n := n * 3) + 1
    return h(2)


record('lambda_walrus', lambda_walrus)
record('lambda_walrus_reads_enclosing', lambda: lambda_walrus_reads_enclosing(1))
record('lambda_walrus_does_not_leak', lambda_walrus_does_not_leak)
record('lambda_walrus_read_before_bind', lambda_walrus_read_before_bind)
record('lambda_walrus_rebinds_parameter', lambda_walrus_rebinds_parameter)


# --- nestedDef:decoratorReadsOwnName -------------------------------------------

def decorator_reads_own_unbound_name():
    try:
        @g.register
        def g():
            pass
    except NameError as e:
        return type(e).__name__
    return 'no error'


def decorator_lambda_parameter_spelled_like_the_def():
    # test_grammar test_funcdef: the predicate sees ``f'' in the decorator.
    def null(x):
        return x

    @lambda f: null(f)
    def f(x):
        return ('f', x)

    return f(1)


def decorator_is_a_property_of_the_name():
    alias = property(lambda self: 'got')

    @alias.setter
    def alias(self, v):
        pass

    return type(alias).__name__, alias.fset.__name__, alias.fget(None)


def decorator_bare_name_is_the_def():
    def deco(fn):
        return lambda: 'old h wrapped ' + fn()

    h = deco

    @h
    def h():
        return 'new h'

    return h()


def decorator_chain_reads_own_name():
    order = []

    def mark(tag):
        def deco(fn):
            order.append(tag)
            return fn
        return deco

    h = mark('previous h')

    @mark('outer')
    @h
    def h():
        return 'h'

    return h(), order


record('decorator_reads_own_unbound_name', decorator_reads_own_unbound_name)
record('decorator_lambda_parameter', decorator_lambda_parameter_spelled_like_the_def)
record('decorator_is_a_property_of_the_name', decorator_is_a_property_of_the_name)
record('decorator_bare_name_is_the_def', decorator_bare_name_is_the_def)
record('decorator_chain_reads_own_name', decorator_chain_reads_own_name)


# --- nestedDef:moduleScopeTargetDecorated --------------------------------------

def tagged(fn):
    fn.tag = 'tagged'
    return fn


def wrapped(fn):
    def w():
        return 'wrapped ' + fn()
    w.inner_tag = getattr(fn, 'tag', None)
    return w


def bind_decorated_global():
    global decorated_global

    @tagged
    def decorated_global():
        return 'g'

    return decorated_global is globals()['decorated_global']


def bind_chain_decorated_global():
    global chain_global

    @wrapped
    @tagged
    def chain_global():
        return 'c'

    return chain_global(), chain_global.inner_tag


record('decorated_global', lambda: (bind_decorated_global(),
                                    decorated_global(), decorated_global.tag))
record('chain_decorated_global', bind_chain_decorated_global)


# --- nestedDef:super -----------------------------------------------------------
# A bare super() in a nested def that ALSO nests a lambda or a def.

class Base:
    def who(self):
        return 'Base'


class Derived(Base):
    def who(self):
        return 'Derived'

    def nested_super_beside_a_lambda(self):
        def g(x):
            h = lambda: 'lambda'
            return super().who(), h()
        return g(self)

    def nested_super_beside_a_def(self):
        def g(x):
            def k():
                return 'k'
            return super().who(), k()
        return g(self)


record('nested_super_beside_a_lambda', Derived().nested_super_beside_a_lambda)
record('nested_super_beside_a_def', Derived().nested_super_beside_a_def)


# --- nestedDef:decorator -------------------------------------------------------
# A bare decorator name nothing static binds: bound at run time.

globals().update({'late_bound_deco': lambda fn: (lambda: 'late ' + fn())})


def late_bound_decorator():
    @late_bound_deco
    def g():
        return 'g'
    return g()


def missing_decorator():
    try:
        @never_bound_anywhere
        def g():
            pass
    except NameError as e:
        return type(e).__name__, str(e)
    return 'no error'


record('late_bound_decorator', late_bound_decorator)
record('missing_decorator', missing_decorator)


# --- NonlocalAst:del -----------------------------------------------------------

def nonlocal_del_local():
    x = 1

    def g():
        nonlocal x
        del x

    g()
    try:
        return x
    except NameError as e:
        return type(e).__name__


def nonlocal_del_parameter(x):
    def g():
        nonlocal x
        del x

    before = x
    g()
    try:
        return before, x
    except NameError as e:
        return before, type(e).__name__


def nonlocal_del_then_rebind():
    x = 1

    def g():
        nonlocal x
        del x

    def h():
        nonlocal x
        x = 'again'

    g()
    h()
    return x


record('nonlocal_del_local', nonlocal_del_local)
record('nonlocal_del_parameter', lambda: nonlocal_del_parameter('p'))
record('nonlocal_del_then_rebind', nonlocal_del_then_rebind)


EXPECTED = {
    'no_positional_reads_enclosing_self':
        "(('the host', 1, 'C'), ('reduce_ex', 2, 'C'))",
    'kwargs_only_reads_enclosing_self': "('the host', 1, ['a'])",
    'default_reads_enclosing_self':
        "(('getattribute', 'describer'), ('q', 'describer'), ('q', 'explicit'))",
    'del_self_then_read': "('Deleter', 'UnboundLocalError')",
    'del_self_then_rebind': "'rebound'",
    'lambda_generator': "['generator', 1, 1, ('stop', 2), 1, ('stop', 2)]",
    'lambda_generator_with_args': '([11], [3])',
    'lambda_walrus': '5',
    'lambda_walrus_reads_enclosing': '(4, 8)',
    'lambda_walrus_does_not_leak': "'outer'",
    'lambda_walrus_read_before_bind':
        "UnboundLocalError: cannot access local variable 'x' where it is not "
        "associated with a value",
    'lambda_walrus_rebinds_parameter': '7',
    'decorator_reads_own_unbound_name': "'UnboundLocalError'",
    'decorator_lambda_parameter': "('f', 1)",
    'decorator_is_a_property_of_the_name': "('property', 'alias', 'got')",
    'decorator_bare_name_is_the_def': "'old h wrapped new h'",
    'decorator_chain_reads_own_name': "('h', ['previous h', 'outer'])",
    'decorated_global': '(True, \'g\', \'tagged\')',
    'chain_decorated_global': "('wrapped c', 'tagged')",
    'nested_super_beside_a_lambda': "('Base', 'lambda')",
    'nested_super_beside_a_def': "('Base', 'k')",
    'late_bound_decorator': "'late g'",
    'missing_decorator': "('NameError', \"name 'never_bound_anywhere' is not defined\")",
    'nonlocal_del_local': "'UnboundLocalError'",
    'nonlocal_del_parameter': "('p', 'UnboundLocalError')",
    'nonlocal_del_then_rebind': "'again'",
}


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-40s %s %s' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
