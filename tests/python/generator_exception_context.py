"""Fixture: the handled exception a generator body sees, and what throw() chains.

CPython gives each generator its own handled-exception slot and stacks it on
its resumer's while the body runs.  sys.exception() in the body answers the
generator's own exception if it is handling one, and the resumer's otherwise.
Grail saved and restored only the body's own value across a suspension, so:

* a body resumed from inside ``except ValueError'' saw nothing, and an
  exception it raised there got no __context__ (test_except_gen_except);
* after its own except clause ended, it saw nothing, where CPython falls back
  to the resumer's (test_except_throw_exception_context).

throw() chains differently from a raise.  It reads only the generator's OWN
slot, so a thrown exception takes the body's handled exception as
__context__ and never the caller's (test_exception_context_with_yield and its
two neighbours).  A thrown CLASS is called at the injection point, so a
__new__ that answers a non-exception raises its TypeError inside the
generator (test_except_throw_bad_exception).

Every check holds under CPython 3.14, which is what makes it evidence.
"""

import sys

r = {}


def _name(e):
    return type(e).__name__


def _ctx(e):
    c = e.__context__
    return None if c is None else (_name(c), c.args)


def _try(thunk):
    try:
        return thunk()
    except BaseException as e:
        return 'EXC ' + _name(e) + ': ' + str(e)


def _resumed_from_a_handler():
    out = []

    def gen():
        try:
            out.append(('start', _name(sys.exception())))
            yield
            raise TypeError()
        except TypeError as exc:
            out.append(('in', _name(sys.exception()), _name(exc.__context__)))
        out.append(('after', _name(sys.exception())))
        yield
        out.append(('end', _name(sys.exception())))
        yield 'done'

    g = gen()
    next(g)
    try:
        raise ValueError
    except Exception:
        next(g)
    out.append(next(g))
    out.append(_name(sys.exception()))
    return out


r['a_resume_from_a_handler_is_seen'] = _try(_resumed_from_a_handler)


def _thrown_from_a_handler():
    out = []

    def gen():
        try:
            try:
                out.append(('start', _name(sys.exception())))
                yield
            except ValueError:
                out.append(('handler', _name(sys.exception())))
                raise TypeError()
        except Exception as exc:
            out.append(('outer', _name(sys.exception()),
                        _name(exc.__context__)))
        out.append(('after', _name(sys.exception())))
        yield
        out.append(('end', _name(sys.exception())))
        yield 'done'

    g = gen()
    next(g)
    try:
        raise ValueError
    except Exception as exc:
        g.throw(exc)
    out.append(next(g))
    out.append(_name(sys.exception()))
    return out


r['the_resumers_exception_returns_after_a_handler'] = _try(
    _thrown_from_a_handler)


def _throw_into_a_handler(thrown):
    def f():
        try:
            raise KeyError('a')
        except Exception:
            yield

    gen = f()
    gen.send(None)
    try:
        gen.throw(thrown)
    except ValueError as e:
        return _ctx(e)


r['a_thrown_class_chains_to_the_body'] = _try(
    lambda: _throw_into_a_handler(ValueError))
r['a_thrown_instance_chains_to_the_body'] = _try(
    lambda: _throw_into_a_handler(ValueError('v')))


def _context_seen_inside():
    res = []

    def f():
        try:
            raise KeyError('a')
        except Exception:
            try:
                yield
            except Exception as exc:
                res.append((_name(exc), _ctx(exc)))
                yield 'b'

    gen = f()
    gen.send(None)
    res.append(gen.throw(ValueError))
    return res


r['the_context_is_seen_inside'] = _try(_context_seen_inside)


def _through_yield_from():
    def f():
        yield

    def g():
        try:
            raise KeyError('a')
        except Exception:
            yield from f()

    gen = g()
    gen.send(None)
    try:
        gen.throw(ValueError)
    except ValueError as e:
        return _ctx(e)


r['a_throw_through_yield_from_chains'] = _try(_through_yield_from)


def _no_context_cycle():
    has = []

    def f():
        yield

    def g(exc):
        try:
            raise exc
        except Exception:
            try:
                yield from f()
            except Exception as e:
                has.append(e is e.__context__)
        yield

    exc = KeyError('a')
    gen = g(exc)
    gen.send(None)
    gen.throw(exc)
    return has


r['a_throw_makes_no_context_cycle'] = _try(_no_context_cycle)


def _caller_handling(make, act):
    x = make()
    try:
        raise KeyError('caller')
    except KeyError:
        try:
            act(x)
        except Exception as e:
            return (_name(e), _ctx(e))


def _started():
    def g():
        yield
        yield
    x = g()
    next(x)
    return x


def _raises_on_resume():
    def h():
        yield
        raise ValueError('in body')
    x = h()
    next(x)
    return x


def _ignores_exit():
    def k():
        try:
            yield
        except GeneratorExit:
            yield
    x = k()
    next(x)
    return x


def _unstarted():
    def g():
        yield
    return g()


r['a_throw_ignores_the_callers_exception'] = _try(lambda: (
    _caller_handling(_started, lambda x: x.throw(ValueError('v'))),
    _caller_handling(_started, lambda x: x.throw(ValueError))))
r['a_raise_in_the_body_chains_to_the_caller'] = _try(
    lambda: _caller_handling(_raises_on_resume, next))
r['an_ignored_close_chains_to_the_caller'] = _try(
    lambda: _caller_handling(_ignores_exit, lambda x: x.close()))
r['an_unstarted_throw_chains_nothing'] = _try(lambda: (
    _caller_handling(_unstarted, lambda x: x.throw(ValueError('v'))),
    _caller_handling(_unstarted, lambda x: x.throw(ValueError))))


def _bad_new():
    class E(Exception):
        def __new__(cls, *a, **k):
            return cls

    out = []

    def boring():
        yield

    gen = boring()
    try:
        gen.throw(E)
    except BaseException as e:
        out.append((_name(e), 'should have returned an instance' in str(e)))
    try:
        next(gen)
    except BaseException as e:
        out.append(_name(e))

    def generator():
        try:
            yield
        except BaseException as e:
            out.append(('in', _name(e),
                        'should have returned an instance' in str(e)))

    gen = generator()
    next(gen)
    try:
        gen.throw(E)
    except BaseException as e:
        out.append(_name(e))
    return out


r['a_bad_new_raises_inside_the_body'] = _try(_bad_new)


def _thrown_exception_kept():
    out = []

    def g():
        try:
            out.append(_name(sys.exception()))
            yield
        except Exception as exc:
            out.append((_name(sys.exception()), exc.__context__))
            yield
            out.append(_name(sys.exception()))
            yield
            raise

    m = g()
    next(m)
    try:
        raise ValueError()
    except Exception as exc:
        try:
            m.throw(exc)
        except Exception:
            pass
    next(m)
    try:
        next(m)
    except ValueError as e:
        out.append(('reraised', e.__context__))
    out.append(_name(sys.exception()))
    return out


r['a_thrown_exception_is_kept_across_yields'] = _try(_thrown_exception_kept)


def _first_resume():
    out = []

    def gen():
        out.append(_name(sys.exception()))
        yield 'done'

    g = gen()
    try:
        raise ValueError
    except Exception:
        out.append(next(g))
    out.append(_name(sys.exception()))
    return out


r['a_first_resume_from_a_handler'] = _try(_first_resume)


def _nested_loop():
    def gen():
        for i in range(3):
            yield _name(sys.exception())

    def outer():
        try:
            raise TypeError
        except:
            for x in gen():
                yield x

    try:
        raise ValueError
    except Exception:
        xs = list(outer())
    return xs, _name(sys.exception())


r['a_nested_generator_sees_its_resumers'] = _try(_nested_loop)


EXPECTED = {
    'a_resume_from_a_handler_is_seen': [
        ('start', 'NoneType'), ('in', 'TypeError', 'ValueError'),
        ('after', 'ValueError'), ('end', 'NoneType'), 'done', 'NoneType'],
    'the_resumers_exception_returns_after_a_handler': [
        ('start', 'NoneType'), ('handler', 'ValueError'),
        ('outer', 'TypeError', 'ValueError'), ('after', 'ValueError'),
        ('end', 'NoneType'), 'done', 'NoneType'],
    'a_thrown_class_chains_to_the_body': ('KeyError', ('a',)),
    'a_thrown_instance_chains_to_the_body': ('KeyError', ('a',)),
    'the_context_is_seen_inside': [
        ('ValueError', ('KeyError', ('a',))), 'b'],
    'a_throw_through_yield_from_chains': ('KeyError', ('a',)),
    'a_throw_makes_no_context_cycle': [False],
    'a_throw_ignores_the_callers_exception': (
        ('ValueError', None), ('ValueError', None)),
    'a_raise_in_the_body_chains_to_the_caller': (
        'ValueError', ('KeyError', ('caller',))),
    'an_ignored_close_chains_to_the_caller': (
        'RuntimeError', ('KeyError', ('caller',))),
    'an_unstarted_throw_chains_nothing': (
        ('ValueError', None), ('ValueError', None)),
    'a_bad_new_raises_inside_the_body': [
        ('TypeError', True), 'StopIteration',
        ('in', 'TypeError', True), 'StopIteration'],
    'a_thrown_exception_is_kept_across_yields': [
        'NoneType', ('ValueError', None), 'ValueError', ('reraised', None),
        'NoneType'],
    'a_first_resume_from_a_handler': ['ValueError', 'done', 'NoneType'],
    'a_nested_generator_sees_its_resumers': (
        ['TypeError', 'TypeError', 'TypeError'], 'NoneType'),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS,
    sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-48s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    print(SUMMARY)
