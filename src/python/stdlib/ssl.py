# Grail ``ssl'' — TLS for the socket layer, backed by GemStone's
# ``GsSecureSocket'' (OpenSSL).  There is no CPython ``_ssl'' extension; instead
# the native ``socket`` module's ``PySocket`` grows TLS-upgrade hooks
# (``_sslWrapServerCert`` / ``_sslSecureAccept`` / ``_sslWrapClientSNI`` /
# ``_sslSecureConnect``), and this module presents the familiar ``SSLContext`` /
# ``SSLSocket`` API on top of them.
#
# Because ``GsSecureSocket`` IS a ``GsSocket``, once a connection is upgraded
# every recv/send/makefile/readiness call runs over TLS unchanged — so the whole
# socket/http.server/werkzeug.serving stack (keep-alive and chunked included)
# works over HTTPS with only the handshake added.
#
# Supported: a TLS server (``wrap_socket(server_side=True)`` over a listener,
# whose ``accept()`` performs the per-connection handshake) and a TLS client
# (``wrap_socket(server_hostname=...)`` over a connected socket).  Out of scope:
# mutual-TLS (requesting a client certificate), in-memory BIO / ``MemoryBIO``,
# certificate introspection (``getpeercert`` returns ``None``), and the SSL
# session / ALPN APIs.

# --- certificate verification modes ---
CERT_NONE = 0
CERT_OPTIONAL = 1
CERT_REQUIRED = 2

# --- protocol selectors (only the family matters; the OpenSSL build negotiates
#     the actual version) ---
PROTOCOL_TLS = 2
PROTOCOL_TLS_CLIENT = 16
PROTOCOL_TLS_SERVER = 17
PROTOCOL_TLSv1_2 = 5

# --- option / feature flags (accepted, mostly inert) ---
OP_ALL = 0
OP_NO_SSLv2 = 0
OP_NO_SSLv3 = 0
OP_NO_TLSv1 = 0
OP_NO_TLSv1_1 = 0
OP_NO_COMPRESSION = 0
OP_SINGLE_DH_USE = 0
OP_SINGLE_ECDH_USE = 0

VERIFY_DEFAULT = 0
VERIFY_CRL_CHECK_LEAF = 0

HAS_SNI = True
HAS_TLSv1_3 = True
HAS_ECDH = True

# GsSecureSocket reports the negotiated version as an OpenSSL macro name; map the
# common ones to the spellings CPython's ``SSLSocket.version()`` returns.
_VERSION_NAMES = {
    "TLS1_3_VERSION": "TLSv1.3",
    "TLS1_2_VERSION": "TLSv1.2",
    "TLS1_1_VERSION": "TLSv1.1",
    "TLS1_VERSION": "TLSv1",
    "SSL3_VERSION": "SSLv3",
}


class SSLError(OSError):
    pass


class SSLZeroReturnError(SSLError):
    pass


class SSLWantReadError(SSLError):
    pass


class SSLWantWriteError(SSLError):
    pass


class SSLSyscallError(SSLError):
    pass


class SSLEOFError(SSLError):
    pass


class SSLCertVerificationError(SSLError):
    pass


CertificateError = SSLCertVerificationError


class Purpose:
    SERVER_AUTH = "SERVER_AUTH"
    CLIENT_AUTH = "CLIENT_AUTH"


class SSLContext:
    """A holder for TLS settings (certificate, key, verification policy) that
    stamps out ``SSLSocket`` instances via ``wrap_socket``."""

    def __init__(self, protocol=PROTOCOL_TLS):
        self.protocol = protocol
        self._certfile = None
        self._keyfile = None
        self._password = None
        self._cafile = None
        self.options = OP_ALL
        if protocol == PROTOCOL_TLS_CLIENT:
            self.verify_mode = CERT_REQUIRED
            self.check_hostname = True
        else:
            self.verify_mode = CERT_NONE
            self.check_hostname = False

    def load_cert_chain(self, certfile, keyfile=None, password=None):
        self._certfile = certfile
        self._keyfile = keyfile if keyfile is not None else certfile
        self._password = password

    def load_verify_locations(self, cafile=None, capath=None, cadata=None):
        if cafile is not None:
            self._cafile = cafile

    def load_default_certs(self, purpose=Purpose.SERVER_AUTH):
        pass

    def set_ciphers(self, ciphers):
        pass

    def set_alpn_protocols(self, protocols):
        pass

    def wrap_socket(self, sock, server_side=False,
                    do_handshake_on_connect=True,
                    suppress_ragged_eofs=True,
                    server_hostname=None, session=None):
        if server_side:
            # Wrap a *listening* socket: TLS happens per-connection in accept().
            return SSLSocket(sock, self, server_side=True,
                             do_handshake_on_connect=do_handshake_on_connect,
                             server_hostname=None, _listener=True)
        # Wrap a *connected* socket as a client and (optionally) handshake now.
        return SSLSocket(sock, self, server_side=False,
                         do_handshake_on_connect=do_handshake_on_connect,
                         server_hostname=server_hostname)


def create_default_context(purpose=Purpose.SERVER_AUTH, cafile=None,
                           capath=None, cadata=None):
    if purpose == Purpose.CLIENT_AUTH:
        ctx = SSLContext(PROTOCOL_TLS_SERVER)
    else:
        ctx = SSLContext(PROTOCOL_TLS_CLIENT)
    if cafile is not None or capath is not None or cadata is not None:
        ctx.load_verify_locations(cafile, capath, cadata)
    return ctx


def _create_unverified_context(protocol=PROTOCOL_TLS, cert_reqs=CERT_NONE,
                               check_hostname=False, purpose=Purpose.SERVER_AUTH,
                               certfile=None, keyfile=None, cafile=None,
                               capath=None, cadata=None):
    ctx = SSLContext(protocol)
    ctx.verify_mode = CERT_NONE
    ctx.check_hostname = False
    if certfile is not None:
        ctx.load_cert_chain(certfile, keyfile)
    return ctx


_create_default_https_context = create_default_context
_create_stdlib_context = _create_unverified_context


class SSLSocket:
    """A TLS view over a plain ``socket.socket``.

    Three shapes, distinguished by how ``wrap_socket``/``accept`` build it:
      * listener  — ``_listener=True``: not itself secured; ``accept()`` upgrades
        and hands back secured connection ``SSLSocket``s;
      * client    — constructed over a connected socket, upgraded + handshaken
        in ``__init__``;
      * server-accepted — built with ``_secured=True`` after ``accept()`` has
        already upgraded the underlying socket.

    Every socket operation forwards to the wrapped ``PySocket``; once upgraded,
    that socket carries a ``GsSecureSocket``, so the I/O is encrypted.
    """

    def __init__(self, sock, context, server_side=False,
                 do_handshake_on_connect=True, server_hostname=None,
                 _listener=False, _secured=False):
        self._sock = sock
        self.context = context
        self.server_side = server_side
        self.server_hostname = server_hostname
        self._listener = _listener
        self._secured = _secured
        if _listener or _secured:
            return
        # Connection-mode wrap: upgrade the live socket now.
        if server_side:
            self._sock._sslWrapServerCert(context._certfile, context._keyfile,
                                          context._password or "")
            if do_handshake_on_connect:
                self._sock._sslSecureAccept()
        else:
            verify = context.verify_mode != CERT_NONE
            self._sock._sslWrapClientSNI(server_hostname or "", verify)
            if do_handshake_on_connect:
                self._sock._sslSecureConnect()
        self._secured = True

    # --- server listener ---
    def accept(self):
        conn, addr = self._sock.accept()
        conn._sslWrapServerCert(self.context._certfile, self.context._keyfile,
                                self.context._password or "")
        conn._sslSecureAccept()
        ssl_conn = SSLSocket(conn, self.context, server_side=True,
                             do_handshake_on_connect=False, _secured=True)
        return ssl_conn, addr

    def do_handshake(self):
        if self._secured:
            return
        if self.server_side:
            self._sock._sslSecureAccept()
        else:
            self._sock._sslSecureConnect()
        self._secured = True

    # --- TLS introspection ---
    def cipher(self):
        name = self._sock._sslCipherName()
        if not name:
            return None
        return (name, self.version(), None)

    def version(self):
        v = self._sock._sslVersionName()
        if not v:
            return None
        return _VERSION_NAMES.get(v, v)

    def getpeercert(self, binary_form=False):
        # Certificate introspection is not implemented; verification (when
        # enabled) is enforced during the handshake by OpenSSL itself.
        return None

    def selected_alpn_protocol(self):
        return None

    def unwrap(self):
        return self._sock

    # --- forwarded socket protocol ---
    def recv(self, bufsize=8192, flags=0):
        return self._sock.recv(bufsize)

    def read(self, length=8192, buffer=None):
        return self._sock.recv(length)

    def send(self, data, flags=0):
        return self._sock.send(data)

    def write(self, data):
        return self._sock.send(data)

    def sendall(self, data, flags=0):
        return self._sock.sendall(data)

    def makefile(self, mode="r", buffering=-1, encoding=None, errors=None,
                 newline=None):
        return self._sock.makefile(mode, buffering)

    def close(self):
        return self._sock.close()

    def detach(self):
        return self._sock.fileno()

    def getpeername(self):
        return self._sock.getpeername()

    def getsockname(self):
        return self._sock.getsockname()

    def fileno(self):
        return self._sock.fileno()

    def setblocking(self, flag):
        return self._sock.setblocking(flag)

    def settimeout(self, value):
        return self._sock.settimeout(value)

    def gettimeout(self):
        return self._sock.gettimeout()

    def shutdown(self, how):
        return self._sock.shutdown(how)

    def setsockopt(self, level, optname, value):
        return None

    def _readableNow(self):
        return self._sock._readableNow()

    def _readableWithin(self, ms):
        return self._sock._readableWithin(ms)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, tb):
        self._sock.close()
        return False


def wrap_socket(sock, keyfile=None, certfile=None, server_side=False,
                cert_reqs=CERT_NONE, ssl_version=PROTOCOL_TLS, ca_certs=None,
                do_handshake_on_connect=True, suppress_ragged_eofs=True,
                ciphers=None, server_hostname=None):
    """Module-level legacy wrapper: build a one-off context and wrap ``sock``."""
    ctx = SSLContext(ssl_version)
    ctx.verify_mode = cert_reqs
    if certfile is not None:
        ctx.load_cert_chain(certfile, keyfile)
    if ca_certs is not None:
        ctx.load_verify_locations(ca_certs)
    return ctx.wrap_socket(sock, server_side=server_side,
                           do_handshake_on_connect=do_handshake_on_connect,
                           suppress_ragged_eofs=suppress_ragged_eofs,
                           server_hostname=server_hostname)
