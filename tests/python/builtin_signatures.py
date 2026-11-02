"""Fixture: inspect.signature reads a builtin's parameters from the text CPython
gives it, and refuses one CPython gives none.

A C-implemented callable carries its parameter list as text
(``__text_signature__``), and inspect.signature parses it: ``len`` is
``(obj, /)``, ``str.split`` ``(self, /, sep=None, maxsplit=-1)``, ``list``
``(iterable=(), /)``.  Some have none -- ``dict``, ``int``, ``dir``, ``max`` --
and for those signature() raises ``ValueError: no signature found for builtin``.
Grail's builtins are Smalltalk methods with no such text, so signature()
answered ``()`` for every one of them, and rlcompleter, which decides between
``f(`` and ``f()`` by it, completed ``dict()`` and ``str.split()``.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import inspect
import rlcompleter

r = {}


def text(obj):
    try:
        return str(inspect.signature(obj))
    except ValueError as e:
        return 'ValueError: %s' % e


def defined(a, b=1, *args, key=None):
    pass


class Made:
    def __init__(self, x):
        pass


r['functions'] = [text(len), text(sorted), text(print), text(divmod)]
r['unbound_methods'] = [text(str.split), text(list.append), text(int.__add__), text(object.__init__)]
r['bound_methods'] = [text('abc'.split), text([].append), text(dict.fromkeys)]
r['types'] = [text(list), text(bool), text(object)]
r['none_found'] = [text(dict), text(int), text(dir), text(max)]
r['python_unchanged'] = [text(defined), text(Made)]
completer = rlcompleter.Completer()
r['completions'] = [completer._callable_postfix(value, name)
                    for name, value in (('dict', dict), ('len', len), ('str.split', str.split), ('globals', globals))]

EXPECTED = {
    'functions': ['(obj, /)', '(iterable, /, *, key=None, reverse=False)',
                  "(*args, sep=' ', end='\\n', file=None, flush=False)", '(x, y, /)'],
    'unbound_methods': ['(self, /, sep=None, maxsplit=-1)', '(self, object, /)', '(self, value, /)',
                        '(self, /, *args, **kwargs)'],
    'bound_methods': ['(sep=None, maxsplit=-1)', '(object, /)', '(iterable, value=None, /)'],
    'types': ['(iterable=(), /)', '(object=False, /)', '()'],
    'none_found': ["ValueError: no signature found for builtin type <class 'dict'>",
                   "ValueError: no signature found for builtin type <class 'int'>",
                   'ValueError: no signature found for builtin <built-in function dir>',
                   'ValueError: no signature found for builtin <built-in function max>'],
    'python_unchanged': ['(a, b=1, *args, key=None)', '(x)'],
    'completions': ['dict(', 'len(', 'str.split(', 'globals()'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-32s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
