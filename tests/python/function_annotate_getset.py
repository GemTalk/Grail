"""Fixture: a function's and a module's ``__annotate__`` and ``__annotations__``
behave as CPython 3.14's getsets do (Objects/funcobject.c,
Objects/moduleobject.c).

  * ``__annotate__`` is None until something is assigned -- a module-level
    def answered AttributeError;
  * it takes None or a callable -- Grail stored anything, 42 included;
  * a callable assigned to it is what the next ``__annotations__`` read calls,
    and what it answers must be a dict -- Grail kept answering the cached
    dict, or answered the callable's non-dict result;
  * None keeps the cached dict, a callable drops it;
  * assigning ``__annotations__`` makes ``__annotate__`` None; a function takes
    only a dict or None, and None, like ``del``, empties it;
  * ``del f.__annotate__`` is a TypeError, ``del f.__annotations__`` is not.

Every kind of function Grail has is checked: a module-level def, a nested
def, a lambda and a method reached through its class.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import types


def outcome(thunk):
    try:
        return thunk()
    except (TypeError, AttributeError) as e:
        return '%s: %s' % (type(e).__name__, e)


def assign(obj, name, value):
    def run():
        setattr(obj, name, value)
    return outcome(run)


def delete(obj, name):
    def run():
        delattr(obj, name)
    return outcome(run)


def protocol(f):
    """test_type_annotations' check_annotations, step by step, as values."""
    steps = [outcome(lambda: f.__annotations__), outcome(lambda: f.__annotate__),
             assign(f, '__annotate__', 42)]
    assign(f, '__annotate__', lambda: 42)
    steps.append(outcome(lambda: f.__annotations__).split(' takes ')[-1])
    assign(f, '__annotate__', lambda x: 42)
    steps.append(outcome(lambda: f.__annotations__))
    assign(f, '__annotate__', lambda x: {'x': x})
    steps.append(outcome(lambda: f.__annotations__))
    assign(f, '__annotate__', None)
    steps.append(outcome(lambda: f.__annotations__))
    assign(f, '__annotate__', lambda x: {'y': x})
    steps.append(outcome(lambda: f.__annotations__))
    assign(f, '__annotations__', {'z': 43})
    steps.append(outcome(lambda: f.__annotate__))
    steps.append(delete(f, '__annotate__'))
    return steps


def deletes(f):
    """A function's own rules for ``__annotations__``: a dict or None, and a
    delete that empties it and never raises."""
    return [assign(f, '__annotations__', 5), delete(f, '__annotations__'),
            outcome(lambda: f.__annotations__), outcome(lambda: f.__annotate__),
            delete(f, '__annotations__'), assign(f, '__annotations__', {'w': 1}),
            assign(f, '__annotations__', None), outcome(lambda: f.__annotations__)]


def top_level():
    pass


def outer():
    def nested():
        pass
    return nested


class Holder:
    def method(self):
        pass


FUNCTIONS = {
    'top_level': top_level,
    'nested': outer(),
    'lambda': lambda: None,
    'method': Holder.method,
}
r = {}
for name, fn in FUNCTIONS.items():
    r[name] = protocol(fn)
    r[name + '_deletes'] = deletes(FUNCTIONS[name] if name != 'lambda' else (lambda: None))

module = types.ModuleType('mod')
r['module'] = protocol(module)
module.__annotations__ = {'m': 1}
r['module_deletes'] = [delete(module, '__annotations__'), outcome(lambda: module.__annotate__),
                       delete(module, '__annotations__')]

PROTOCOL = [{}, None, 'TypeError: __annotate__ must be callable or None',
            '0 positional arguments but 1 was given',
            "TypeError: __annotate__ returned non-dict of type 'int'",
            {'x': 1}, {'x': 1}, {'y': 1}, None, 'TypeError: __annotate__ cannot be deleted']
DELETES = ['TypeError: __annotations__ must be set to a dict object', None, {}, None, None, None, None, {}]
EXPECTED = {}
for name in FUNCTIONS:
    EXPECTED[name] = PROTOCOL
    EXPECTED[name + '_deletes'] = DELETES
EXPECTED['module'] = PROTOCOL[:-1] + ['TypeError: cannot delete __annotate__ attribute']
EXPECTED['module_deletes'] = [None, None, 'AttributeError: __annotations__']

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        ok = r.get(key, '<missing>') == EXPECTED[key]
        print('%-20s %s' % (key, 'OK' if ok else 'FAIL'))
        if not ok:
            print('    got  %r' % (r.get(key, '<missing>'),))
            print('    want %r' % (EXPECTED[key],))
    print(SUMMARY)
