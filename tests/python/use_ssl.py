# Fixtures for SslModuleTestCase — a TLS round-trip over GsSecureSocket.
#
# Unlike the plain-HTTP socket fixtures (where the client's request fits in the
# OS buffer before the server accepts, so one green thread suffices), a TLS
# handshake is bidirectional: server and client must both be live to exchange
# ClientHello/ServerHello.  The Smalltalk test therefore forks the client into
# its own GsProcess; GsSecureSocket's secureAccept/secureConnect suspend on
# readWillNotBlockWithin:, so the two green threads drive the handshake
# cooperatively.

import ssl
import socket


def make_https_listener(certfile, keyfile, password):
    """Bind a plain TCP listener, wrap it for TLS, and return ``[lsock, port]``."""
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain(certfile, keyfile, password)
    raw = socket.socket()
    raw.bind(("127.0.0.1", 0))
    raw.listen(1)
    port = raw.getsockname()[1]
    lsock = ctx.wrap_socket(raw, server_side=True)
    return [lsock, port]


def serve_one_echo(lsock):
    """Accept one TLS connection (server handshake), echo its bytes back."""
    conn, addr = lsock.accept()
    data = conn.recv(4096)
    conn.sendall(b"echo:" + data)
    conn.close()
    lsock.close()
    return True


def client_roundtrip(port, payload):
    """Connect over TLS (client handshake), send ``payload``, return
    ``[response_bytes, negotiated_version]``."""
    ctx = ssl._create_unverified_context()
    raw = socket.socket()
    raw.connect(("127.0.0.1", port))
    c = ctx.wrap_socket(raw, server_hostname="localhost")
    version = c.version()
    c.sendall(payload)
    resp = c.recv(4096)
    c.close()
    return [resp, version]
