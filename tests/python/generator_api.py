"""Fixture: generator throw() arguments, names, and a genexpr's single __iter__.

* The deprecated ``throw(type, value, tb)'' signature normalises its
  arguments as CPython's _gen_throw does:
  - an exception class is called with the value as its argument, unless the
    value is already an instance of that class;
  - an instance may not come with a value of its own;
  - a traceback argument must be None or a traceback.
  Grail took any exception instance as the value and ignored the traceback,
  so ``throw(ValueError, TypeError(1))'' raised the TypeError.  That killed
  the generator, and everything after it in test_generators' coroutine
  doctest failed with it.
* A generator's __name__ and __qualname__ take only a string and cannot be
  deleted.  Grail accepted 123 and let ``del'' remove the name altogether.
* A generator expression calls __iter__ on its outermost iterable once, at
  creation.  Grail's body called it again, which fails on an iterator that
  has only __next__.  The same functions run again through exec(), which
  compiles on Grail's other code path.

What Grail still does differently is pinned in KNOWN_DIVERGENCES.

Every EXPECTED check holds under CPython 3.14, which is what makes it
evidence.
"""

import sys
import warnings

r = {}


def _try(thunk):
    try:
        return ('ok', thunk())
    except BaseException as e:
        return (type(e).__name__, str(e))


# --- throw() arguments -------------------------------------------------------

_caught = []


def _catcher():
    while True:
        try:
            _caught.append(('got', (yield)))
        except ValueError as v:
            _caught.append((type(v).__name__, str(v),
                            type(v.args[0]).__name__ if v.args else None))


def _throw_cases():
    g = _catcher()
    next(g)
    out = {}

    def t(*a):
        try:
            g.throw(*a)
            return 'ok'
        except BaseException as e:
            return (type(e).__name__, str(e))

    with warnings.catch_warnings():
        warnings.simplefilter('ignore', DeprecationWarning)
        out['type'] = t(ValueError)
        out['instance'] = t(ValueError('xyz'))
        out['type and its own instance'] = t(ValueError, ValueError(1))
        out['type and another instance'] = t(ValueError, TypeError(1))
        out['None traceback'] = t(ValueError, ValueError(1), None)
        out['type and tuple'] = t(ValueError, (1, 2))
        out['type and str'] = t(ValueError, 'foo')
        out['instance and value'] = t(ValueError(1), 'foo')
        out['instance and None'] = t(ValueError(1), None)
        out['bad traceback'] = t(ValueError, 'foo', 23)
        out['str'] = t('abc')
        out['int'] = t(0)
        out['non-exception class'] = t(list)

        def rethrow(exc):
            try:
                raise exc
            except:
                g.throw(*sys.exc_info())
        out['exc_info'] = _try(lambda: rethrow(ValueError))[0]
        out['still alive'] = _try(lambda: g.send(1))
    return out, list(_caught)


_out, _seen = _throw_cases()
for _k, _v in _out.items():
    r['throw ' + _k] = _v
r['throw caught'] = _seen


def _throw_warns():
    def g():
        yield
    x = g()
    next(x)
    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter('always')
        try:
            x.throw(ValueError, 'foo', 23)
        except TypeError:
            pass
    return [type(m.message).__name__ for m in w]


r['a bad traceback still warns first'] = _try(_throw_warns)


# --- names -------------------------------------------------------------------

def _func():
    yield 1


def _names():
    gen = _func()
    out = [(gen.__name__, gen.__qualname__)]
    gen.__name__ = 'name'
    gen.__qualname__ = 'qualname'
    out.append((gen.__name__, gen.__qualname__))
    out.append(_try(lambda: setattr(gen, '__name__', 123)))
    out.append(_try(lambda: setattr(gen, '__qualname__', 123)))
    out.append(_try(lambda: delattr(gen, '__name__')))
    out.append(_try(lambda: delattr(gen, '__qualname__')))
    out.append((gen.__name__, gen.__qualname__))
    return out


r['names'] = _try(_names)


async def _co():
    pass


def _coroutine_names():
    c = _co()
    try:
        return [_try(lambda: setattr(c, '__name__', 1)),
                _try(lambda: delattr(c, '__qualname__'))]
    finally:
        c.close()


r['coroutine names'] = _try(_coroutine_names)


def _renamed_function():
    def func():
        yield 1
    func.__qualname__ = 'func_qualname'
    func.__name__ = 'func_name'
    g = func()
    return (g.__name__, g.__qualname__)


r['a generator takes its function\'s current names'] = _try(_renamed_function)


# --- a genexpr calls __iter__ once ---------------------------------------------

# The same definitions, at module level below and compiled by exec() here.
ITER_SOURCE = '''
class Iterator:
    def __init__(self):
        self.val = 0
    def __next__(self):
        if self.val == 2:
            raise StopIteration
        self.val += 1
        return self.val

class C:
    calls = 0
    def __iter__(self):
        C.calls += 1
        return Iterator()

def genexpr():
    return list(i for i in C())
def listcomp():
    return [i for i in C()]
def setcomp():
    return sorted({i for i in C()})
def nested():
    return list((i, j) for i in C() for j in C())
'''


def _iter_once(ns):
    out = {}
    for name in ('genexpr', 'listcomp', 'setcomp', 'nested'):
        ns['C'].calls = 0
        out[name] = (_try(ns[name]), ns['C'].calls)
    return out


class Iterator:
    def __init__(self):
        self.val = 0

    def __next__(self):
        if self.val == 2:
            raise StopIteration
        self.val += 1
        return self.val


class C:
    calls = 0

    def __iter__(self):
        C.calls += 1
        return Iterator()


def genexpr():
    return list(i for i in C())


def listcomp():
    return [i for i in C()]


def setcomp():
    return sorted({i for i in C()})


def nested():
    return list((i, j) for i in C() for j in C())


_mod = globals()
_text = {}
exec(compile(ITER_SOURCE, '<iter>', 'exec'), _text)
for _k, _v in _try(lambda: _iter_once(_mod))[1].items():
    r['module ' + _k] = _v
for _k, _v in _try(lambda: _iter_once(_text))[1].items():
    r['exec ' + _k] = _v


def _async_sync_clause():
    import asyncio

    class Counted:
        n = 0

        def __iter__(self):
            Counted.n += 1
            return iter([1, 2])

    async def ait():
        for i in (10, 20):
            yield i

    async def main():
        out = []
        try:
            ((a, b) for a in None async for b in ait())
            out.append('built')
        except TypeError as e:
            out.append(('at construction', str(e)))
        g = ((a, b) for a in Counted() async for b in ait())
        out.append(('after build', Counted.n))
        out.append([x async for x in g])
        out.append(('after drive', Counted.n))
        return out

    return asyncio.run(main())


r['an async genexpr iterates a sync first clause once, at creation'] = _try(
    _async_sync_clause)


_ITER_EXPECTED = {
    'genexpr': (('ok', [1, 2]), 1),
    'listcomp': (('ok', [1, 2]), 1),
    'setcomp': (('ok', [1, 2]), 1),
    'nested': (('ok', [(1, 1), (1, 2), (2, 1), (2, 2)]), 3),
}

_STR = 'must be set to a string object'

EXPECTED = {
    'throw type': 'ok',
    'throw instance': 'ok',
    'throw type and its own instance': 'ok',
    'throw type and another instance': 'ok',
    'throw None traceback': 'ok',
    'throw type and tuple': 'ok',
    'throw type and str': 'ok',
    'throw instance and value': (
        'TypeError', 'instance exception may not have a separate value'),
    'throw instance and None': 'ok',
    'throw bad traceback': (
        'TypeError', 'throw() third argument must be a traceback object'),
    'throw str': ('TypeError', 'exceptions must be classes or instances '
                  'deriving from BaseException, not str'),
    'throw int': ('TypeError', 'exceptions must be classes or instances '
                  'deriving from BaseException, not int'),
    'throw non-exception class': ('TypeError', 'exceptions must be classes '
                                  'or instances deriving from BaseException, not type'),
    'throw exc_info': 'ok',
    'throw still alive': ('ok', None),
    'throw caught': [
        ('ValueError', '', None), ('ValueError', 'xyz', 'str'),
        ('ValueError', '1', 'int'), ('ValueError', '1', 'TypeError'),
        ('ValueError', '1', 'int'), ('ValueError', '(1, 2)', 'int'),
        ('ValueError', 'foo', 'str'), ('ValueError', '1', 'int'),
        ('ValueError', '', None), ('got', 1)],
    'a bad traceback still warns first': ('ok', ['DeprecationWarning']),
    'names': ('ok', [
        ('_func', '_func'), ('name', 'qualname'),
        ('TypeError', '__name__ ' + _STR), ('TypeError', '__qualname__ ' + _STR),
        ('TypeError', '__name__ ' + _STR), ('TypeError', '__qualname__ ' + _STR),
        ('name', 'qualname')]),
    'an async genexpr iterates a sync first clause once, at creation': ('ok', [
        ('at construction', "'NoneType' object is not iterable"),
        ('after build', 1), [(1, 10), (1, 20), (2, 10), (2, 20)],
        ('after drive', 1)]),
    'coroutine names': ('ok', [
        ('TypeError', '__name__ ' + _STR), ('TypeError', '__qualname__ ' + _STR)]),
}
for _k, _v in _ITER_EXPECTED.items():
    EXPECTED['module ' + _k] = _v
    EXPECTED['exec ' + _k] = _v

KNOWN_DIVERGENCES = {
    # CPython: ('ok', ('func_name', 'func_qualname')).  A generator is stamped
    # with the names its def was compiled with; the body has no handle on its
    # function object, so a later ``func.__name__ = ...'' does not reach it.
    "a generator takes its function's current names": (
        'ok', ('func', '_renamed_function.<locals>.func')),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS,
    sorted(r) == sorted(list(EXPECTED) + list(KNOWN_DIVERGENCES)))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-48s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    for key, expected in KNOWN_DIVERGENCES.items():
        actual = r[key]
        print('%-5s %-48s -> %r' % ('OK' if actual == expected else 'XFAIL',
                                    key, actual))
    print(SUMMARY)
