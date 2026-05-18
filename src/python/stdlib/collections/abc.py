# GRAIL minimal collections.abc stub.
#
# CPython's collections.abc has ~20 abstract base classes used
# pervasively for isinstance() checks and as type-annotation
# generics (e.g. `c.Callable[[int], str]`).  Grail uses *instances*
# of a single stub class as the exported names so subscripting
# (`Callable[args]`) resolves through `__getitem__` regardless of
# class-vs-instance dispatch.  isinstance() dispatch returns
# False (no registered virtual subclasses).


class _ABCStub:
    """Stand-in for any collections.abc ABC.  Constructor takes a
    name; `__getitem__` makes ``Callable[..., int]`` annotations
    work; the instance is also a class for isinstance fallbacks."""

    def __init__(self, name='_ABC'):
        self._name = name

    def __getitem__(self, item):
        return self

    def __class_getitem__(cls, item):
        return cls

    def __repr__(self):
        return self._name

    def __call__(self, *args, **kwargs):
        return self


Hashable = _ABCStub('Hashable')
Callable = _ABCStub('Callable')
Iterable = _ABCStub('Iterable')
Iterator = _ABCStub('Iterator')
Generator = _ABCStub('Generator')
Coroutine = _ABCStub('Coroutine')
Awaitable = _ABCStub('Awaitable')
Sequence = _ABCStub('Sequence')
MutableSequence = _ABCStub('MutableSequence')
Mapping = _ABCStub('Mapping')
MutableMapping = _ABCStub('MutableMapping')
Set = _ABCStub('Set')
MutableSet = _ABCStub('MutableSet')
Container = _ABCStub('Container')
Sized = _ABCStub('Sized')
Collection = _ABCStub('Collection')


__all__ = [
    'Hashable', 'Callable', 'Iterable', 'Iterator', 'Generator',
    'Coroutine', 'Awaitable', 'Sequence', 'MutableSequence',
    'Mapping', 'MutableMapping', 'Set', 'MutableSet', 'Container',
    'Sized', 'Collection',
]
