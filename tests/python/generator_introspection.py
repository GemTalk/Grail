"""Fixture: what a generator shows to introspection.

test_generators' email doctest reads these, and Grail differed on four:

* dir(generator) listed ``withBlock'', the Smalltalk constructor;
* type(gen.gi_frame).__name__ was ``PyFrame'' and it had no __module__;
* ``gen.gi_running = 42'' was accepted.  So was every other gi_/cr_/ag_
  attribute; CPython refuses each, for a set and a delete, with one of two
  messages;
* gen.__next__.__doc__ was None (and test.support had no HAVE_DOCSTRINGS).

Every check holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def _try(thunk):
    try:
        return ('ok', thunk())
    except BaseException as e:
        return (type(e).__name__, str(e))


def gen():
    yield 1


async def coro():
    pass


async def agen():
    yield 1


r['public names'] = sorted(s for s in dir(gen()) if not s.startswith('_'))
r['no withBlock on any kind'] = [
    'withBlock' in dir(o) for o in (gen(), agen())] + ['withBlock' in dir(gen)]

_f = gen().gi_frame
r['frame type'] = (repr(type(_f)), type(_f).__name__, type(_f).__qualname__,
                   type(_f).__module__)

r['docstrings'] = (gen().__next__.__doc__, gen().__iter__.__doc__)
r['HAVE_DOCSTRINGS'] = _try(
    lambda: __import__('test.support', fromlist=['x']).HAVE_DOCSTRINGS)


def _readonly():
    out = []
    c = coro()
    objs = (gen(), c, agen())
    names = {
        'generator': ('gi_code', 'gi_frame', 'gi_running', 'gi_suspended',
                      'gi_yieldfrom'),
        'coroutine': ('cr_await', 'cr_code', 'cr_frame', 'cr_origin',
                      'cr_running', 'cr_suspended'),
        'async_generator': ('ag_await', 'ag_code', 'ag_frame', 'ag_running',
                            'ag_suspended'),
    }
    for o in objs:
        for n in names[type(o).__name__]:
            out.append((n, _try(lambda: setattr(o, n, 1)),
                        _try(lambda: delattr(o, n))))
    c.close()
    return out


r['read-only attributes'] = _try(_readonly)


def _still_readable():
    g = gen()
    try:
        g.gi_running = 42
    except AttributeError:
        pass
    return (g.gi_running, next(g), g.gi_suspended)


r['a refused write leaves the attribute alone'] = _try(_still_readable)


def _refusals():
    out = []
    for kind, names, member in (
            ('generator', ('gi_code', 'gi_frame', 'gi_running', 'gi_suspended',
                           'gi_yieldfrom'), ()),
            ('coroutine', ('cr_await', 'cr_code', 'cr_frame', 'cr_running',
                           'cr_suspended'), ('cr_origin',)),
            ('async_generator', ('ag_await', 'ag_code', 'ag_frame',
                                 'ag_suspended'), ('ag_running',))):
        for n in sorted(names + member):
            msg = ('readonly attribute' if n in member else
                   "attribute '%s' of '%s' objects is not writable" % (n, kind))
            out.append((n, ('AttributeError', msg), ('AttributeError', msg)))
    return out


EXPECTED = {
    'public names': ['close', 'gi_code', 'gi_frame', 'gi_running',
                     'gi_suspended', 'gi_yieldfrom', 'send', 'throw'],
    'no withBlock on any kind': [False, False, False],
    'frame type': ("<class 'frame'>", 'frame', 'frame', 'builtins'),
    'docstrings': ('Implement next(self).', 'Implement iter(self).'),
    'HAVE_DOCSTRINGS': ('ok', True),
    'read-only attributes': ('ok', _refusals()),
    'a refused write leaves the attribute alone': ('ok', (False, 1, True)),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS,
    sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-44s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    print(SUMMARY)
