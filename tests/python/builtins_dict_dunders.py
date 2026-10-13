"""Fixture: builtins.__dict__ holds the module's own dunders (#1527).

CPython's builtins namespace holds __name__, __doc__, __package__, __loader__
and __spec__ like any other builtin, so a name lookup that falls through to
builtins finds them: ``eval('__name__', {})'' is 'builtins', and a snippet
run with ``exec(src, {})'' that tests ``if __name__ == '__main__':'' reads
'builtins' rather than raising NameError.  Grail's dict held only __spec__.

__loader__ is the one value that differs: CPython's is BuiltinImporter, which
Grail does not have (sys.__loader__ is None too), so it is pinned as a known
divergence rather than left out.

Every EXPECTED check holds under CPython 3.14, which is what makes it
evidence.
"""

import builtins

r = {}


def _err(thunk):
    try:
        return thunk()
    except Exception as e:
        return type(e).__name__ + ': ' + str(e)


DUNDERS = ('__name__', '__doc__', '__package__', '__loader__', '__spec__')

r['in_the_dict'] = tuple(k in builtins.__dict__ for k in DUNDERS)
d = builtins.__dict__
r['values'] = _err(lambda: (d['__name__'], d['__package__'],
                            d['__doc__'].split('\n')[0], d['__doc__'] == builtins.__doc__))
r['eval_falls_through_to_builtins'] = _err(lambda: (
    eval('__name__', {}), eval('__package__', {}),
    eval('__doc__', {}) == builtins.__doc__, eval('__spec__', {}).name))


def _exec_snippet():
    ns = {}
    exec("main = __name__ == '__main__'\nname = __name__", ns)
    return ns['main'], ns['name']


r['exec_snippet'] = _err(_exec_snippet)


def _exec_def():
    ns = {}
    exec("def f():\n    return __name__, __package__\nr = f()", ns)
    return ns['r']


r['exec_def_reads_builtins'] = _err(_exec_def)
r['own_globals_win'] = (eval('__name__', {'__name__': 'mine'}), __name__ == 'builtins')
r['attributes_agree'] = (builtins.__name__, builtins.__package__)
r['vars_agrees'] = _err(lambda: vars(builtins)['__name__'])
r['loader'] = _err(lambda: repr(builtins.__dict__['__loader__']))


EXPECTED = {
    'in_the_dict': (True, True, True, True, True),
    'values': ('builtins', '',
               'Built-in functions, types, exceptions, and other objects.', True),
    'eval_falls_through_to_builtins': ('builtins', '', True, 'builtins'),
    'exec_snippet': (False, 'builtins'),
    'exec_def_reads_builtins': ('builtins', ''),
    'own_globals_win': ('mine', False),
    'attributes_agree': ('builtins', ''),
    'vars_agrees': 'builtins',
}

KNOWN_DIVERGENCES = {
    # CPython: "<class '_frozen_importlib.BuiltinImporter'>"; Grail has none.
    'loader': 'None',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS,
    sorted(r) == sorted(list(EXPECTED) + list(KNOWN_DIVERGENCES)))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-32s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    for key, expected in KNOWN_DIVERGENCES.items():
        actual = r[key]
        print('%-5s %-32s -> %r' % ('OK' if actual == expected else 'XFAIL',
                                    key, actual))
    print(SUMMARY)
