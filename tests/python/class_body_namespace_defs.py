"""Fixture: a class-body ``def`` and nested ``class`` reach the prepared
namespace, at their own source position.

CPython executes a class body against the mapping ``__prepare__`` returned, so
that mapping holds a function object for every ``def`` and the class object for
every nested ``class``, interleaved with the assignments in source order.

Grail scans a body for the names it binds and emits one accessor store per
name.  Stages 1-5 connected the ASSIGNMENTS to the mapping; a ``def`` and a
nested ``class`` still bypassed it, because neither produces a value where the
body binds the name -- a def compiles to a Smalltalk method, a nested class is
built and stored through its own path.  So a prepared namespace saw ``a``,
``b``, ``c`` and never ``f`` or ``Inner``.

``async def`` is deliberately NOT exercised here.  The emit binds it like any
other def, but Grail does not compile an ``async def`` in a class body to an
attribute at all (``hasattr(K, 'coro')`` is False), so there is nothing for the
namespace to be given -- a separate, pre-existing gap.

See docs/Class_Body_Namespace.md, which names this the load-bearing gap.
"""


class Recorder(dict):
    """A namespace that remembers the order it was written in."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.order = []

    def __setitem__(self, key, value):
        self.order.append(key)
        dict.__setitem__(self, key, value)


captured = {}


class Meta(type):
    @classmethod
    def __prepare__(mcls, name, bases, **kwargs):
        namespace = Recorder()
        captured[name] = namespace
        return namespace


class Body(metaclass=Meta):
    a = 1

    def f(self):
        return 'f'

    b = 2

    class Inner:
        pass

    c = 3

    @staticmethod
    def decorated():
        return 'decorated'


class OnlyAssignments(metaclass=Meta):
    x = 1
    y = 2


def report():
    body = captured['Body']
    plain = captured['OnlyAssignments']

    # Dunders the compiler injects (__module__, __qualname__, ...) differ
    # between CPython and Grail and are not what this fixture is about.
    order = [key for key in body.order if not key.startswith('__')]

    return {
        # The headline: every binding, in source order.
        'order': order,
        # A def arrives as something callable, and a nested class as a class.
        # NOT as a specific type: CPython holds a plain function here and Grail
        # an unbound method, which is a difference this fixture is not about.
        'f_callable': callable(body['f']),
        'inner_is_class': isinstance(body['Inner'], type),
        # A decorated def binds under its own name too, carrying the decorator.
        'decorated_present': 'decorated' in body,
        'decorated_callable': callable(body['decorated']),
        # A body of plain assignments is unchanged by any of this.
        'plain_order': [k for k in plain.order if not k.startswith('__')],
        # The class itself is still built correctly from that body.
        'f_result': Body().f(),
        'inner_name': Body.Inner.__name__,
        'decorated_result': Body.decorated(),
        'c_value': Body.c,
    }


EXPECTED = {
    'order': ['a', 'f', 'b', 'Inner', 'c', 'decorated'],
    'f_callable': True,
    'inner_is_class': True,
    'decorated_present': True,
    'decorated_callable': True,
    'plain_order': ['x', 'y'],
    'f_result': 'f',
    'inner_name': 'Inner',
    'decorated_result': 'decorated',
    'c_value': 3,
}


if __name__ == '__main__':
    got = report()
    for key, expected in EXPECTED.items():
        actual = got[key]
        print('%-4s %s -> %r' % ('OK' if actual == expected else 'FAIL',
                                 key, actual))
    for extra in sorted(set(got) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('FAIL', extra))
