"""Fixture: the ``_socket'' primitive layer, over GemStone's GsSocket.

CPython splits sockets in two -- ``_socket'' (C, raw syscalls) and ``socket.py''
(pure Python on top).  Grail's older ``socket'' module collapsed both into one
Smalltalk module and covered only the TCP/IPv4 subset the werkzeug dev server
needs.  ``_socket'' restores the real split, so that CPython's own socket.py can
eventually run unmodified: its whole coupling to C is ``import _socket'' plus
``from _socket import *''.

THIS FIXTURE RUNS UNDER REAL CPYTHON TOO, which is the point -- every check
below is a claim about what CPython's _socket does, measured rather than
asserted from Grail.  So it pins only behaviour the two genuinely share.

Deliberately NOT checked here, because CPython and Grail correctly differ:

  AF_UNIX / socketpair()   GsSocket has no Unix-domain sockets, so Grail raises
                           OSError where CPython (on Linux/macOS) succeeds.
  recvmsg / sendmsg        no ancillary-data interface in GsSocket.
  inet_pton(AF_INET6, ..)  no IPv6 literal parser is exposed.

Those raise a clear OSError in Grail rather than returning something wrong; the
Smalltalk test case is where that refusal is pinned, since it is Grail-specific.

``accept_fd_roundtrip'' is the subtle one.  CPython's socket.accept() is

    fd, addr = self._accept()
    sock = socket(self.family, self.type, self.proto, fileno=fd)

so an accepted connection makes a round trip through a bare integer fd.  Grail
cannot lean on GsSocket's fromFileHandle: for that -- it is documented for
descriptors inherited from a fork or made by non-GemStone C code, not for
re-adopting one GemStone itself created -- so _socket keeps a session-local
fd -> GsSocket map instead.  This check is what proves that path works.
"""

import os

import _socket


def tcp_roundtrip():
    """bind/listen/connect/_accept/sendall/recv over loopback."""
    srv = _socket.socket(_socket.AF_INET, _socket.SOCK_STREAM)
    srv.setsockopt(_socket.SOL_SOCKET, _socket.SO_REUSEADDR, 1)
    srv.bind(('127.0.0.1', 0))
    port = srv.getsockname()[1]
    srv.listen(5)

    cli = _socket.socket(_socket.AF_INET, _socket.SOCK_STREAM)
    cli.connect(('127.0.0.1', port))
    fd, addr = srv._accept()
    conn = _socket.socket(fileno=fd)

    cli.sendall(b'hello grail')
    got = conn.recv(64)
    conn.sendall(b'pong')
    back = cli.recv(64)

    out = [got.decode(), back.decode(), addr[0], cli.getpeername()[1] == port]
    for s in (conn, cli, srv):
        s.close()
    return out


def accept_fd_roundtrip():
    """The accepted fd must rebuild into a working socket."""
    srv = _socket.socket(_socket.AF_INET, _socket.SOCK_STREAM)
    srv.bind(('127.0.0.1', 0))
    port = srv.getsockname()[1]
    srv.listen(1)
    cli = _socket.socket(_socket.AF_INET, _socket.SOCK_STREAM)
    cli.connect(('127.0.0.1', port))
    fd, _addr = srv._accept()
    conn = _socket.socket(fileno=fd)
    same = conn.fileno() == fd
    cli.sendall(b'via-fd')
    got = conn.recv(16).decode()
    for s in (conn, cli, srv):
        s.close()
    return [same, got]


def recv_into_buffer():
    srv = _socket.socket(_socket.AF_INET, _socket.SOCK_STREAM)
    srv.bind(('127.0.0.1', 0))
    port = srv.getsockname()[1]
    srv.listen(1)
    cli = _socket.socket(_socket.AF_INET, _socket.SOCK_STREAM)
    cli.connect(('127.0.0.1', port))
    fd, _addr = srv._accept()
    conn = _socket.socket(fileno=fd)
    cli.sendall(b'abcdef')
    buf = bytearray(6)
    n = conn.recv_into(buf)
    for s in (conn, cli, srv):
        s.close()
    return [n, bytes(buf).decode()]


def shutdown_gives_eof():
    """SHUT_WR on one end must show up as EOF (b'') on the other."""
    srv = _socket.socket(_socket.AF_INET, _socket.SOCK_STREAM)
    srv.bind(('127.0.0.1', 0))
    port = srv.getsockname()[1]
    srv.listen(1)
    cli = _socket.socket(_socket.AF_INET, _socket.SOCK_STREAM)
    cli.connect(('127.0.0.1', port))
    fd, _addr = srv._accept()
    conn = _socket.socket(fileno=fd)
    conn.shutdown(_socket.SHUT_WR)
    eof = cli.recv(16)
    for s in (conn, cli, srv):
        s.close()
    return [eof.decode(), cli.fileno()]


def udp_roundtrip():
    """sendto/recvfrom on a datagram socket."""
    u1 = _socket.socket(_socket.AF_INET, _socket.SOCK_DGRAM)
    u1.bind(('127.0.0.1', 0))
    port = u1.getsockname()[1]
    u2 = _socket.socket(_socket.AF_INET, _socket.SOCK_DGRAM)
    u2.sendto(b'datagram!', ('127.0.0.1', port))
    data, frm = u1.recvfrom(64)
    out = [data.decode(), frm[0]]
    u1.close()
    u2.close()
    return out


def byte_order():
    """htons/htonl are a defined big-endian swap, not host-dependent."""
    return [_socket.htons(1), _socket.htonl(1),
            _socket.ntohs(_socket.htons(4660)) == 4660,
            _socket.ntohl(_socket.htonl(305419896)) == 305419896]


def inet_v4_conversions():
    return [list(_socket.inet_aton('127.0.0.1')),
            _socket.inet_ntoa(b'\x7f\x00\x00\x01'),
            list(_socket.inet_pton(_socket.AF_INET, '10.1.2.3')),
            _socket.inet_ntop(_socket.AF_INET, b'\n\x01\x02\x03')]


def timeout_states():
    """CPython's three states: None blocking, 0 non-blocking, n a timeout."""
    s = _socket.socket(_socket.AF_INET, _socket.SOCK_STREAM)
    out = [s.gettimeout(), s.getblocking()]
    s.settimeout(2.5)
    out += [s.gettimeout(), s.getblocking()]
    s.settimeout(0)
    out += [s.gettimeout(), s.getblocking()]
    s.settimeout(None)
    out += [s.gettimeout(), s.getblocking()]
    s.close()
    return out


def default_timeout():
    before = _socket.getdefaulttimeout()
    _socket.setdefaulttimeout(5.0)
    s = _socket.socket(_socket.AF_INET, _socket.SOCK_STREAM)
    inherited = s.gettimeout()
    s.close()
    _socket.setdefaulttimeout(None)
    return [before, inherited, _socket.getdefaulttimeout()]


def sockopt_roundtrip():
    """SO_REUSEADDR must actually reach the OS, not be swallowed."""
    s = _socket.socket(_socket.AF_INET, _socket.SOCK_STREAM)
    s.setsockopt(_socket.SOL_SOCKET, _socket.SO_REUSEADDR, 1)
    on = s.getsockopt(_socket.SOL_SOCKET, _socket.SO_REUSEADDR)
    s.close()
    return on != 0


def identity_attributes():
    """family/type/proto are DATA attributes, not callables."""
    s = _socket.socket(_socket.AF_INET, _socket.SOCK_STREAM)
    out = [s.family == _socket.AF_INET, s.type == _socket.SOCK_STREAM,
           s.proto == 0, s.fileno() > 0]
    s.close()
    out.append(s.fileno())
    return out


def closed_socket_raises():
    s = _socket.socket(_socket.AF_INET, _socket.SOCK_STREAM)
    s.close()
    try:
        s.recv(4)
        return 'no error'
    except OSError:
        return 'OSError'


def bad_host_raises_gaierror():
    try:
        _socket.gethostbyname('no-such-host.invalid.example')
        return 'no error'
    except _socket.gaierror:
        return 'gaierror'
    except OSError:
        return 'OSError'


def exception_hierarchy():
    return [_socket.error is OSError,
            issubclass(_socket.gaierror, OSError),
            issubclass(_socket.herror, OSError),
            _socket.timeout is TimeoutError]


def localhost_resolves():
    return _socket.gethostbyname('localhost')


def exports_list():
    """os._get_exports_list(_socket) -- obscure, but load-bearing.

    CPython's socket.py calls it at import time
    (``__all__.extend(os._get_exports_list(_socket))'') to republish the
    primitive layer's names, so socket.py cannot be imported without it.
    _socket has no __all__, so this takes the ``every public name'' branch.
    """
    names = list(os._get_exports_list(_socket))
    return ['AF_INET' in names, 'socket' in names, 'gaierror' in names,
            all(not n.startswith('_') for n in names)]


r = {
    'tcp_roundtrip': tcp_roundtrip(),
    'accept_fd_roundtrip': accept_fd_roundtrip(),
    'recv_into_buffer': recv_into_buffer(),
    'shutdown_gives_eof': shutdown_gives_eof(),
    'udp_roundtrip': udp_roundtrip(),
    'byte_order': byte_order(),
    'inet_v4_conversions': inet_v4_conversions(),
    'timeout_states': timeout_states(),
    'default_timeout': default_timeout(),
    'sockopt_roundtrip': sockopt_roundtrip(),
    'identity_attributes': identity_attributes(),
    'closed_socket_raises': closed_socket_raises(),
    'bad_host_raises_gaierror': bad_host_raises_gaierror(),
    'exception_hierarchy': exception_hierarchy(),
    'localhost_resolves': localhost_resolves(),
    'exports_list': exports_list(),
}


EXPECTED = {
    'tcp_roundtrip': ['hello grail', 'pong', '127.0.0.1', True],
    'accept_fd_roundtrip': [True, 'via-fd'],
    'recv_into_buffer': [6, 'abcdef'],
    'shutdown_gives_eof': ['', -1],
    'udp_roundtrip': ['datagram!', '127.0.0.1'],
    'byte_order': [256, 16777216, True, True],
    'inet_v4_conversions': [[127, 0, 0, 1], '127.0.0.1', [10, 1, 2, 3], '10.1.2.3'],
    'timeout_states': [None, True, 2.5, True, 0.0, False, None, True],
    'default_timeout': [None, 5.0, None],
    'sockopt_roundtrip': True,
    'identity_attributes': [True, True, True, True, -1],
    'closed_socket_raises': 'OSError',
    'bad_host_raises_gaierror': 'gaierror',
    'exception_hierarchy': [True, True, True, True],
    'localhost_resolves': '127.0.0.1',
    'exports_list': [True, True, True, True],
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-26s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-26s is not in EXPECTED' % ('FAIL', extra))
