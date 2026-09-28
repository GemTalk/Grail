"""io.Reader and io.Writer (PEP 3116's simple-I/O protocols, new in 3.14).

Grail's ``io`` is a Smalltalk module (io_module.gs), and CPython defines these
two in Lib/io.py rather than in _io or _pyio, so neither of the places Grail's
io draws its classes from has them.  They are CPython's own classes, verbatim,
and io_module.gs answers them as ``io.Reader`` / ``io.Writer``.
"""

import abc
from _collections_abc import _check_methods

GenericAlias = type(list[int])


class Reader(metaclass=abc.ABCMeta):
    """Protocol for simple I/O reader instances.

    This protocol only supports blocking I/O.
    """

    __slots__ = ()

    @abc.abstractmethod
    def read(self, size=..., /):
        """Read data from the input stream and return it.

        If *size* is specified, at most *size* items (bytes/characters) will be
        read.
        """

    @classmethod
    def __subclasshook__(cls, C):
        if cls is Reader:
            return _check_methods(C, "read")
        return NotImplemented

    __class_getitem__ = classmethod(GenericAlias)


class Writer(metaclass=abc.ABCMeta):
    """Protocol for simple I/O writer instances.

    This protocol only supports blocking I/O.
    """

    __slots__ = ()

    @abc.abstractmethod
    def write(self, data, /):
        """Write *data* to the output stream and return the number of items written."""

    @classmethod
    def __subclasshook__(cls, C):
        if cls is Writer:
            return _check_methods(C, "write")
        return NotImplemented

    __class_getitem__ = classmethod(GenericAlias)


Reader.__module__ = Writer.__module__ = 'io'
