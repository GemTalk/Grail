"""Fixture: ``__class__'' assignment on a CLASS changes its type (G12).

h11's Sentinel metaclass ends __new__ with ``v.__class__ = v'', so that every
sentinel (CLIENT, IDLE, NEED_DATA, ...) is its own type and ``type(event)''
dispatches uniformly over events and sentinels.  Grail refused that as a
layout mismatch, so h11 and httpcore did not import (docs/Package_Census.md,
G12).  Worse, the refusal was signalled from inside changeClassTo:'s handler,
on top of kernel frames that run in protected mode, so the first thing an
``except'' that caught it did that could switch process -- an import -- killed
the session with InternalError 2261, which is why the census recorded h11 as a
CRASH.  The ``failed_then_import'' check keeps that shape: a refused class
assignment, then an import inside the ``except''.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def _err(thunk):
    try:
        return thunk()
    except Exception as e:
        return type(e).__name__ + ': ' + str(e)


class Sentinel(type):
    def __new__(cls, name, bases, namespace, **kwds):
        assert bases == (Sentinel,)
        v = super().__new__(cls, name, bases, namespace, **kwds)
        v.__class__ = v
        return v

    def __repr__(self):
        return self.__name__


class CLIENT(Sentinel, metaclass=Sentinel):
    pass


class SERVER(Sentinel, metaclass=Sentinel):
    pass


r['sentinel_is_its_own_type'] = (type(CLIENT) is CLIENT, CLIENT.__class__ is CLIENT,
                                 isinstance(CLIENT, CLIENT), isinstance(CLIENT, Sentinel),
                                 isinstance(CLIENT, SERVER), type(SERVER) is SERVER)
r['sentinel_repr_and_identity'] = (repr(CLIENT), str(SERVER), CLIENT is not SERVER,
                                   {CLIENT: 1, SERVER: 2}[SERVER])
r['type_dispatch'] = [{CLIENT: 'c', SERVER: 's'}[type(x)] for x in (SERVER, CLIENT)]


class M(type):
    pass


class N(type):
    pass


def _meta_to_meta():
    class C(metaclass=M):
        pass
    C.__class__ = N
    return (type(C) is N, isinstance(C, N), isinstance(C, M))


def _plain_class():
    class C:
        pass
    C.__class__ = M


def _to_type():
    class C(metaclass=M):
        pass
    C.__class__ = type


def _not_a_metaclass():
    class C(metaclass=M):
        pass

    class Plain:
        pass
    C.__class__ = Plain


def _builtin():
    int.__class__ = M


def _not_a_class():
    class C:
        pass
    C.__class__ = 5


r['metaclass_to_metaclass'] = _err(_meta_to_meta)
r['plain_class_refused'] = _err(_plain_class)
r['to_type_refused'] = _err(_to_type)
r['not_a_metaclass_refused'] = _err(_not_a_metaclass)[:44]
r['builtin_refused'] = _err(_builtin)
r['not_a_class_refused'] = _err(_not_a_class)


def _failed_then_import():
    class C:
        pass
    try:
        C.__class__ = M        # refused: a plain class's type is ``type''
    except TypeError:
        import textwrap        # anything that can switch process
        return 'survived', textwrap.dedent('  x')


r['failed_then_import'] = _failed_then_import()


class Event:
    __hash__ = None            # h11's events: instances unhashable


# h11's state tables key on tuples of an event CLASS and a sentinel.
r['class_with_unhashable_instances_in_a_tuple_key'] = (
    {(Event, CLIENT): 'x'}[(Event, CLIENT)], hash((Event,)) == hash((Event,)),
    _err(lambda: hash(Event())))


EXPECTED = {
    'sentinel_is_its_own_type': (True, True, True, True, False, True),
    'sentinel_repr_and_identity': ('CLIENT', 'SERVER', True, 2),
    'type_dispatch': ['s', 'c'],
    'metaclass_to_metaclass': (True, True, False),
    'plain_class_refused':
        'TypeError: __class__ assignment only supported for mutable types or ModuleType subclasses',
    'to_type_refused':
        'TypeError: __class__ assignment only supported for mutable types or ModuleType subclasses',
    'not_a_metaclass_refused': "TypeError: __class__ assignment: 'Plain' obj",
    'builtin_refused': "TypeError: cannot set '__class__' attribute of immutable type 'int'",
    'not_a_class_refused': "TypeError: __class__ must be set to a class, not 'int' object",
    'failed_then_import': ('survived', 'x'),
    'class_with_unhashable_instances_in_a_tuple_key': ('x', True, "TypeError: unhashable type: 'Event'"),
}

KNOWN_DIVERGENCES = {}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS,
    sorted(r) == sorted(list(EXPECTED) + list(KNOWN_DIVERGENCES)))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-28s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    print(SUMMARY)
