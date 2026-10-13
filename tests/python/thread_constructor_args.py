"""Fixture: threading.Thread takes CPython's constructor arguments.

Grail's Thread named its keyword-arguments parameter ``kwds'', after a Grail
limitation -- a parameter literally named ``kwargs'' acting as **kwargs --
that no longer reproduces.  So ``Thread(target=f, kwargs={...})'', the
ordinary spelling, raised TypeError.  It turned up in the #1227 fixture, which
had to wrap serve_forever in a lambda to pass it poll_interval.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import threading

r = {}


def outcome(fn):
    try:
        return 'ok -> %r' % (fn(),)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def _run(**ctor):
    seen = []
    t = threading.Thread(target=lambda *a, **k: seen.append((a, k)), **ctor)
    t.start()
    t.join()
    return seen


r['kwargs_reach_the_target'] = outcome(lambda: _run(kwargs={'p': 1}))
r['args_and_kwargs_together'] = outcome(lambda: _run(args=(1, 2), kwargs={'p': 3}))
r['neither'] = outcome(lambda: _run())
r['kwargs_none_is_empty'] = outcome(lambda: _run(kwargs=None))
r['kwargs_positionally'] = outcome(
    lambda: len(threading.Thread(None, print, 'n', (), {'end': ''}).name))

# daemon and context are keyword-only, as in CPython.  Only the exception
# TYPE is compared: Grail's arity message does not count self ("0 to 5
# positional arguments but 6 were given" where CPython says "1 to 6 ... 7"),
# a separate defect (#1472) this fixture is not about.
def _sixth_positional():
    try:
        threading.Thread(None, print, 'n', (), {}, True)
    except TypeError:
        return 'TypeError'
    return 'accepted'


r['daemon_is_keyword_only'] = _sixth_positional()
r['daemon_by_keyword'] = outcome(lambda: threading.Thread(daemon=True).daemon)
r['kwds_is_not_a_parameter'] = outcome(lambda: threading.Thread(kwds={}))


EXPECTED = {
    'kwargs_reach_the_target': "ok -> [((), {'p': 1})]",
    'args_and_kwargs_together': "ok -> [((1, 2), {'p': 3})]",
    'neither': 'ok -> [((), {})]',
    'kwargs_none_is_empty': 'ok -> [((), {})]',
    'kwargs_positionally': 'ok -> 1',
    'daemon_is_keyword_only': 'TypeError',
    'daemon_by_keyword': 'ok -> True',
    'kwds_is_not_a_parameter':
        "TypeError: Thread.__init__() got an unexpected keyword argument 'kwds'",
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-26s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
