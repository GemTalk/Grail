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


# --- the OpenSSL this gem is actually running -------------------------------
# CPython publishes these from the ``_ssl'' extension's own link line.  Grail
# has no ``_ssl''; every handshake is run by the OpenSSL that GemStone loads
# into the gem, and GemStone will name it -- ``GsSecureSocket class >>
# sslLibraryVersionString'' answers the library's banner, reached here through
# ``_socket._sslLibraryVersionString()''.  So these constants are MEASURED, not
# declared: they change with the GemStone build (3.7.5 ships OpenSSL 3.0.19,
# 4.0.0 ships 3.5.7) and are read once, at import.
#
# WHAT A CALLER MAY CONCLUDE from them: which OpenSSL performs Grail's TLS, and
# therefore which protocol versions, ciphers and certificate checks are on the
# wire.  That is a true statement about this process.
#
# WHAT A CALLER MAY NOT CONCLUDE: that the CPython ``ssl'' API is present in
# proportion.  The version says nothing about the FACADE above it -- MemoryBIO,
# certificate introspection (``getpeercert'' returns None), ALPN, mutual TLS and
# per-context trust stores are unimplemented here whatever OpenSSL supports.
# Feature-test those with hasattr, never by comparing OPENSSL_VERSION_INFO.
#
# When GemStone will not name the library we say so, rather than inventing a
# plausible version: OPENSSL_VERSION is then a string that deliberately does NOT
# begin with "OpenSSL ", and the two numeric forms are zero.  Consumers that
# gate on OpenSSL (urllib3 is the one in the tree) test the prefix first and
# only compare numbers when it matches, so an honest "unknown" downgrades them
# to a warning instead of tripping a version comparison against a number we made
# up.

_OPENSSL_VERSION_UNKNOWN = 'GemStone TLS, OpenSSL version unavailable'


def _parse_openssl_version(banner):
    """Split an OpenSSL banner into CPython's ``(info, number)`` pair.

    ``banner`` is what OpenSSL's own ``OpenSSL_version(OPENSSL_VERSION)``
    returns, e.g. ``'OpenSSL 3.0.19 27 Jan 2026'`` or, pre-3.0,
    ``'OpenSSL 1.1.1w  11 Sep 2023'``.  Returns ``None`` if it is not an
    OpenSSL banner or does not carry a version we can read.

    The number is OpenSSL's ``OPENSSL_VERSION_NUMBER`` and the tuple is
    CPython's decomposition of it in ``_ssl.c``::

        status = n & 0xF;  n >>= 4
        patch  = n & 0xFF; n >>= 8
        fix    = n & 0xFF; n >>= 8
        minor  = n & 0xFF; n >>= 8
        major  = n & 0xFF

    Two encodings share that layout, which is why 3.x looks lopsided:

      * pre-3.0 ``MAJOR.MINOR.FIX<letter>`` packs FIX at bits 12-19 and the
        release letter (a=1) as PATCH, with status 0xF meaning "release" --
        1.1.1w is (1, 1, 1, 23, 15) / 0x1010117f.
      * 3.0+ ``MAJOR.MINOR.PATCH`` dropped FIX and the release nibble, so the
        third component lands in PATCH and status is 0 -- 3.0.19 is
        (3, 0, 0, 19, 0) / 0x30000130, and CPython reports exactly that.
    """
    if not isinstance(banner, str):
        return None
    parts = banner.split()
    if len(parts) < 2 or parts[0] != 'OpenSSL':
        return None
    token = parts[1]
    letter = ''
    if token and token[-1].isalpha():
        letter = token[-1]
        token = token[:-1]
    bits = token.split('.')
    if len(bits) < 2 or len(bits) > 3:
        return None
    numbers = []
    for bit in bits:
        if not bit.isdigit():
            return None
        numbers.append(int(bit))
    while len(numbers) < 3:
        numbers.append(0)
    major, minor, third = numbers[0], numbers[1], numbers[2]
    if major >= 3:
        fix, patch, status = 0, third, 0
    else:
        fix = third
        patch = (ord(letter) - ord('a') + 1) if letter else 0
        status = 0xF
    number = ((major << 28) | (minor << 20) | (fix << 12)
              | (patch << 4) | status)
    return (major, minor, fix, patch, status), number


def _read_openssl_version():
    """Ask GemStone which OpenSSL it loaded; fall back to an honest unknown."""
    try:
        import _socket
        banner = _socket._sslLibraryVersionString()
    except BaseException:
        banner = None
    if banner is None:
        return _OPENSSL_VERSION_UNKNOWN, (0, 0, 0, 0, 0), 0
    parsed = _parse_openssl_version(banner)
    if parsed is None:
        # Keep the banner verbatim -- it is what the library says about itself,
        # and reporting it unchanged beats discarding it -- but do not pretend
        # to a number we could not read.
        return banner, (0, 0, 0, 0, 0), 0
    info, number = parsed
    return banner, info, number


(OPENSSL_VERSION, OPENSSL_VERSION_INFO,
 OPENSSL_VERSION_NUMBER) = _read_openssl_version()

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


# --- default trust store -----------------------------------------------------
# CPython gets these from OpenSSL (SSL_CERT_FILE / SSL_CERT_DIR, else the
# OPENSSLDIR baked into the build).  GemStone's OpenSSL is compiled with its
# own OPENSSLDIR, so resolve the platform bundle here the same way
# GsSecureSocket class >> setCaCertLocation does, with the env vars honored
# first so a caller can point at their own bundle.
_CA_FILE_CANDIDATES = (
    '/etc/ssl/certs/ca-certificates.crt',                    # Debian/Ubuntu
    '/etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem',     # RHEL/CentOS
    '/etc/ssl/cert.pem',                                     # macOS/BSD
)
_CA_DIR_CANDIDATES = (
    '/etc/ssl/certs',
    '/etc/pki/tls/certs',
)


class DefaultVerifyPaths:
    def __init__(self, cafile, capath, openssl_cafile_env, openssl_cafile,
                 openssl_capath_env, openssl_capath):
        self.cafile = cafile
        self.capath = capath
        self.openssl_cafile_env = openssl_cafile_env
        self.openssl_cafile = openssl_cafile
        self.openssl_capath_env = openssl_capath_env
        self.openssl_capath = openssl_capath


def _first_existing(paths, isdir=False):
    import os
    for p in paths:
        if p and (os.path.isdir(p) if isdir else os.path.isfile(p)):
            return p
    return None


def get_default_verify_paths():
    """The trust store this build would use by default.

    Mirrors CPython's ssl.get_default_verify_paths(): SSL_CERT_FILE /
    SSL_CERT_DIR win, otherwise the platform bundle."""
    import os
    env_file = os.environ.get('SSL_CERT_FILE')
    env_dir = os.environ.get('SSL_CERT_DIR')
    cafile = env_file if env_file else _first_existing(_CA_FILE_CANDIDATES)
    capath = env_dir if env_dir else _first_existing(_CA_DIR_CANDIDATES,
                                                     isdir=True)
    return DefaultVerifyPaths(
        cafile if cafile and os.path.isfile(cafile) else None,
        capath if capath and os.path.isdir(capath) else None,
        'SSL_CERT_FILE', env_file, 'SSL_CERT_DIR', env_dir)


class SSLContext:
    """A holder for TLS settings (certificate, key, verification policy) that
    stamps out ``SSLSocket`` instances via ``wrap_socket``."""

    def __init__(self, protocol=PROTOCOL_TLS):
        self.protocol = protocol
        self._certfile = None
        self._keyfile = None
        self._password = None
        self._cafile = None
        self._capath = None
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
        if cafile is None and capath is None and cadata is None:
            raise TypeError("cafile, capath and cadata cannot be all omitted")
        if cadata is not None:
            # GsSecureSocket only takes a file or a hash directory.
            raise NotImplementedError(
                'Grail ssl: cadata (in-memory certificates) is not supported; '
                'pass cafile or capath')
        if cafile is not None:
            self._cafile = cafile
        if capath is not None:
            self._capath = capath

    def load_default_certs(self, purpose=Purpose.SERVER_AUTH):
        """Load the platform trust store, as CPython does for client contexts."""
        paths = get_default_verify_paths()
        if paths.cafile is not None:
            self._cafile = paths.cafile
        if paths.capath is not None:
            self._capath = paths.capath

    def _apply_verify_locations(self, sock):
        """Push this context's trust anchors down to GsSecureSocket.

        Class-side (session-global) in GemStone, so it is re-applied per
        handshake rather than once at load time."""
        if self._cafile is not None:
            sock._sslUseCAFile(self._cafile)
        elif self._capath is not None:
            sock._sslUseCADirectory(self._capath)

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
    elif ctx.verify_mode != CERT_NONE:
        # CPython: a verifying default context loads the system trust store.
        ctx.load_default_certs(purpose)
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
            if verify:
                context._apply_verify_locations(self._sock)
            self._sock._sslWrapClientSNI(server_hostname or "", verify)
            if do_handshake_on_connect:
                self._do_client_handshake()
        self._secured = True

    def _do_client_handshake(self):
        """Run the handshake, reporting failure as the CPython exception.

        GsSecureSocket raises a Smalltalk error carrying the OpenSSL message;
        surface a verification failure as SSLCertVerificationError (what
        callers catch) and anything else as SSLError."""
        try:
            self._sock._sslSecureConnect()
        except Exception as exc:
            detail = str(exc)
            reason = self._sock._sslLastVerifyError()
            if reason:
                detail = '%s (%s)' % (detail, reason)
            if 'certificate verify failed' in detail or reason:
                raise SSLCertVerificationError(
                    'certificate verify failed for %r: %s'
                    % (self.server_hostname, detail))
            raise SSLError('TLS handshake failed for %r: %s'
                           % (self.server_hostname, detail))

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
    # --- select() hand-off ---------------------------------------------------
    # select resolves what to wait on by asking each object for the socket it
    # wants watched.  Handing over the wrapped socket keeps `_sock' private --
    # select probing it directly raises an uncatchable DNU here rather than
    # answering a default -- and, because the wrapped socket carries a
    # GsSecureSocket once upgraded, readiness is then tested with
    # GsSecureSocket>>readWillNotBlock, which consults the SSL receive buffer.
    # Bytes already decrypted therefore count as readable, where the raw
    # descriptor would look idle.

    def _selectSocket(self):
        return self._sock

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
