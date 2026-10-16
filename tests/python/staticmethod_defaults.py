"""A @staticmethod's defaults are evaluated once, at def time, and readable (#1575).

A class-body method's defaults are evaluated once, in the class body, and kept
in a per-class store; __defaults__ reads them through the class's key table.
A @staticmethod was left out of both.  Its default expression stayed inline in
the method, so it was evaluated again on every call that omitted the argument
(``def f(acc=[])`` got a new list each time), and __defaults__ /
__kwdefaults__ read None because the key table had no entry for it.

The classmethod and plain-method rows are controls.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

import inspect

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


evaluations = []


def make(tag):
    evaluations.append(tag)
    return []


CONDITIONAL = True


class H:
    D = 9

    @staticmethod
    def f(w, v=4, *, k=5):
        return (w, v, k)

    @staticmethod
    def acc(item, bucket=make('acc'), *, seen=make('seen')):
        bucket.append(item)
        seen.append(item)
        return (len(bucket), len(seen))

    @staticmethod
    def body_name(v=D):
        return v

    @staticmethod
    def posonly(a, b=2, /):
        return (a, b)

    @staticmethod
    def none_default(x=None):
        return x

    @staticmethod
    def required(x):
        return x

    @classmethod
    def c(cls, q=7):
        return q

    def m(self, z=8):
        return z

    if CONDITIONAL:
        @staticmethod
        def conditional(x=make('conditional')):
            x.append(1)
            return len(x)


class K(H):
    @staticmethod
    def f(w, v=40, *, k=50):
        return (w, v, k)


class Sub(H):
    pass


t('defaults', lambda: H.f.__defaults__)
t('kwdefaults', lambda: H.f.__kwdefaults__)
t('instance_defaults', lambda: H().f.__defaults__)
t('dict_func_defaults', lambda: H.__dict__['f'].__func__.__defaults__)
t('signature', lambda: str(inspect.signature(H.f)))
t('call_defaults', lambda: H.f(1))
t('call_override', lambda: H.f(1, 2, k=3))
t('acc_class', lambda: [H.acc(1), H.acc(2)])
t('acc_instance', lambda: H().acc(3))
t('acc_subclass', lambda: Sub.acc(4))
t('acc_evaluated_once', lambda: sorted(evaluations))
t('acc_default_is_store', lambda: H.acc.__defaults__[0] is H.acc.__defaults__[0])
t('acc_default_contents', lambda: H.acc.__defaults__[0])
t('acc_kw_contents', lambda: H.acc.__kwdefaults__['seen'])
t('body_name', lambda: H.body_name())
t('body_name_defaults', lambda: H.body_name.__defaults__)
t('posonly', lambda: (H.posonly(1), H.posonly.__defaults__))
t('none_default', lambda: (H.none_default(), H.none_default.__defaults__))
t('required_defaults', lambda: (H.required.__defaults__, H.required.__kwdefaults__))
t('conditional', lambda: [H.conditional(), H.conditional(), H.conditional.__defaults__])
t('subclass_override', lambda: (K.f(1), K.f.__defaults__, K.f.__kwdefaults__))
t('subclass_parent', lambda: (H.f(1), Sub.f(1), Sub.f.__defaults__))
t('classmethod_control', lambda: (H.c(), H.c.__defaults__))
t('method_control', lambda: (H().m(), H.m.__defaults__))


def local_class():
    seed = make('local')

    class L:
        @staticmethod
        def g(x=seed):
            x.append(1)
            return len(x)
    return L


L = local_class()
t('local_class', lambda: [L.g(), L.g(), L.g.__defaults__[0] is L.g.__defaults__[0]])


class Outer:
    class Inner:
        @staticmethod
        def g(x=make('inner')):
            x.append(1)
            return len(x)


t('nested_class', lambda: [Outer.Inner.g(), Outer.Inner.g(), Outer.Inner.g.__defaults__])


EXPECTED = {
    'acc_class': '[(1, 1), (2, 2)]',
    'acc_default_contents': '[1, 2, 3, 4]',
    'acc_default_is_store': 'True',
    'acc_evaluated_once': "['acc', 'conditional', 'seen']",
    'acc_instance': '(3, 3)',
    'acc_kw_contents': '[1, 2, 3, 4]',
    'acc_subclass': '(4, 4)',
    'body_name': '9',
    'body_name_defaults': '(9,)',
    'call_defaults': '(1, 4, 5)',
    'call_override': '(1, 2, 3)',
    'classmethod_control': '(7, (7,))',
    'conditional': '[1, 2, ([1, 1],)]',
    'defaults': '(4,)',
    'dict_func_defaults': '(4,)',
    'instance_defaults': '(4,)',
    'kwdefaults': "{'k': 5}",
    'local_class': '[1, 2, True]',
    'method_control': '(8, (8,))',
    'nested_class': '[1, 2, ([1, 1],)]',
    'none_default': '(None, (None,))',
    'posonly': '((1, 2), (2,))',
    'required_defaults': '(None, None)',
    'signature': "'(w, v=4, *, k=5)'",
    'subclass_override': "((1, 40, 50), (40,), {'k': 50})",
    'subclass_parent': '((1, 4, 5), (1, 4, 5), (4,))',
}


def mismatches():
    return sorted(k for k in EXPECTED if r.get(k) != EXPECTED[k])


def mismatches_when_run_by_path():
    """mismatches() of a copy run by runpy.run_path."""
    import runpy
    g = runpy.run_path(__file__, run_name='_staticmethod_defaults_by_path')
    return g['mismatches']()


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
