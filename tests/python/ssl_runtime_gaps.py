"""The Grail gaps that CPython's ssl.py and test_ssl ran into, outside _ssl.

  * A @property defined inside an ``if'' in a class body was never applied, so
    ssl.py's ``if hasattr(_SSLContext, ...): @property ...'' failed to import.
  * ``super().prop'' answered a bound method rather than the parent's property
    value, and ``super(C, C).prop.__set__(inst, v)'' had no __set__.
  * enum._simple_enum returned the plain class unchanged, so TLSVersion and
    re.RegexFlag were not enums; global_enum exported nothing from a
    functional enum; enum._old_convert_ was missing.
  * os.fsencode / fsdecode echoed a non-path (None, an int) instead of raising
    TypeError -- ssl handed OpenSSL a NULL name from it and the gem crashed.
  * Socket addresses were lists; recv_into had no three-argument form and
    recvfrom_into did not exist; os.read and select() refused a socket's fd.
  * time.strptime and time._STRUCT_TM_ITEMS were missing; so was
    unittest.mock.patch.dict.

Every expectation was measured against CPython 3.14.
"""

import enum
import os
import select
import socket
import time
import types
from unittest import mock

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


def outcome(fn, *args, **kwargs):
    try:
        fn(*args, **kwargs)
    except Exception as exc:
        return type(exc).__name__
    return 'ok'


# ------------------------------------------------ @property inside an if

class _Guarded:
    if True:
        @property
        def value(self):
            return self._value * 2

        @value.setter
        def value(self, v):
            self._value = v


def _property_in_if():
    g = _Guarded()
    g.value = 21
    return (g.value, g._value)


check('a_property_defined_in_an_if_is_applied', _property_in_if(), (42, 21))


# ------------------------------------------------ super() and a property

class _Base:
    @property
    def flags(self):
        return self._flags

    @flags.setter
    def flags(self, v):
        self._flags = v


class _Derived(_Base):
    # ssl.SSLContext's shape: wrap the parent's property both ways.
    @property
    def flags(self):
        return ('wrapped', super().flags)

    @flags.setter
    def flags(self, v):
        super(_Derived, _Derived).flags.__set__(self, v + 1)


def _super_property():
    d = _Derived()
    d.flags = 4
    return (d.flags, d._flags)


check('super_reads_and_sets_the_parent_property', _super_property(),
      (('wrapped', 5), 5))


# ------------------------------------------------ enum._simple_enum

@enum._simple_enum(enum.IntEnum)
class _Planet:
    """A plain class made an enum."""
    MERCURY = 1
    VENUS = 2

    def label(self):
        return 'planet ' + self.name

    @property
    def inner(self):
        return self.value < 2


def _simple_enum_shape():
    return (isinstance(_Planet.VENUS, enum.IntEnum),
            [m.name for m in _Planet],
            _Planet(2) is _Planet.VENUS,
            _Planet.MERCURY.label(),
            (_Planet.MERCURY.inner, _Planet.VENUS.inner),
            _Planet.__doc__,
            sorted(_Planet.__members__))


check('simple_enum_makes_the_plain_class_an_enum', _simple_enum_shape(),
      (True, ['MERCURY', 'VENUS'], True, 'planet MERCURY', (True, False),
       'A plain class made an enum.', ['MERCURY', 'VENUS']))


def _regex_flags():
    import re
    return (isinstance(re.IGNORECASE, enum.IntFlag), re.I is re.IGNORECASE,
            repr(re.I), repr(re.I | re.M), int(re.S))


check('re_flags_are_a_global_int_flag', _regex_flags(),
      (True, True, 're.IGNORECASE', 're.IGNORECASE|re.MULTILINE', 16))


_PROBE_SOURCE = types.SimpleNamespace(PROBE_A=1, PROBE_B=2, OTHER=3)


def _old_convert():
    import sys
    before = set(vars(sys.modules[__name__]))
    cls = enum._old_convert_(enum.IntEnum, '_Probe', __name__,
                             lambda name: name.startswith('PROBE_'),
                             source=_PROBE_SOURCE)
    after = set(vars(sys.modules[__name__]))
    return ([m.name for m in cls], int(cls.PROBE_B), sorted(after - before))


check('old_convert_builds_without_exporting', _old_convert(),
      (['PROBE_A', 'PROBE_B'], 2, []))


# ------------------------------------------------ os.fsencode / fsdecode

check('fsencode_and_fsdecode_refuse_a_non_path',
      [outcome(os.fsencode, None), outcome(os.fsencode, 1),
       outcome(os.fsdecode, None), os.fsencode('a'), os.fsdecode(b'a')],
      ['TypeError', 'TypeError', 'TypeError', b'a', 'a'])


# ------------------------------------------------ sockets

def _connected_pair():
    srv = socket.socket()
    srv.bind(('127.0.0.1', 0))
    srv.listen()
    cli = socket.socket()
    cli.connect(srv.getsockname())
    conn, _ = srv.accept()
    return srv, cli, conn


def _addresses_are_tuples():
    srv, cli, conn = _connected_pair()
    try:
        return (type(srv.getsockname()).__name__,
                type(cli.getpeername()).__name__,
                cli.getpeername() == srv.getsockname())
    finally:
        cli.close(); conn.close(); srv.close()


check('socket_addresses_are_tuples', _addresses_are_tuples(),
      ('tuple', 'tuple', True))


def _recv_into_forms():
    srv, cli, conn = _connected_pair()
    try:
        cli.sendall(b'abcdef')
        buf = bytearray(8)
        got = []
        got.append(conn.recv_into(buf, 2, 0))
        got.append(bytes(buf[:2]))
        got.append(outcome(conn.recv_into, bytearray(2), 5))
        got.append(outcome(conn.recv_into, bytearray(2), -1))
        return got
    finally:
        cli.close(); conn.close(); srv.close()


check('recv_into_takes_nbytes_and_flags', _recv_into_forms(),
      [2, b'ab', 'ValueError', 'ValueError'])


def _socket_fd_is_usable():
    srv, cli, conn = _connected_pair()
    fd = conn.fileno()
    try:
        cli.sendall(b'x')
        r, _, _ = select.select([fd], [], [], 5.0)
        return (os.read(fd, 0), r == [fd])
    finally:
        cli.close(); conn.close(); srv.close()


check('a_socket_fd_reads_and_selects', _socket_fd_is_usable(), (b'', True))


def _closed_socket_fd_is_ebadf():
    s = socket.socket()
    fd = s.fileno()
    s.close()
    try:
        os.read(fd, 0)
    except OSError as exc:
        import errno
        return exc.errno == errno.EBADF
    return 'no error'


check('a_closed_socket_fd_is_ebadf', _closed_socket_fd_is_ebadf(), True)


# ------------------------------------------------ time.strptime

check('time_strptime_is_available',
      (tuple(time.strptime('Jan 05 2024', '%b %d %Y'))[:3],
       time._STRUCT_TM_ITEMS),
      ((2024, 1, 5), 11))


# ------------------------------------------------ mock.patch.dict

def _patch_dict():
    d = {'a': 1}
    with mock.patch.dict(d, {'b': 2}, c=3) as got:
        inside = (got is d, sorted(d.items()))

    @mock.patch.dict(d, clear=True)
    def cleared():
        return dict(d)

    return (inside, sorted(d.items()), cleared(), sorted(d.items()))


check('mock_patch_dict_patches_and_restores', _patch_dict(),
      ((True, [('a', 1), ('b', 2), ('c', 3)]), [('a', 1)], {}, [('a', 1)]))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else ascii(_v))
