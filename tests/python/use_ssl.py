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


def trust_store_defaults():
    """The default-context trust store, resolved without touching the net.

    A verifying context must come with CA anchors loaded, or every real
    HTTPS request fails the handshake with 'certificate verify failed'."""
    import os
    paths = ssl.get_default_verify_paths()
    default_ctx = ssl.create_default_context()
    unverified = ssl._create_unverified_context()

    try:
        ssl.SSLContext().load_verify_locations()
        omitted_raises = False
    except TypeError:
        omitted_raises = True

    explicit = ssl.create_default_context(cafile=paths.cafile) \
        if paths.cafile else None

    return {
        'has_cafile': paths.cafile is not None,
        'cafile_exists': bool(paths.cafile) and os.path.isfile(paths.cafile),
        'default_verifies': default_ctx.verify_mode == ssl.CERT_REQUIRED,
        'default_checks_hostname': default_ctx.check_hostname is True,
        'default_loaded_anchors': default_ctx._cafile is not None
                                  or default_ctx._capath is not None,
        'unverified_off': unverified.verify_mode == ssl.CERT_NONE,
        'unverified_has_no_anchors': unverified._cafile is None,
        'omitted_args_raise': omitted_raises,
        'explicit_cafile_kept': explicit is not None
                                and explicit._cafile == paths.cafile,
    }


# --- OpenSSL identity --------------------------------------------------------
# ssl.OPENSSL_VERSION / _INFO / _NUMBER.  CPython gets them from the ``_ssl''
# extension's link line; Grail has no ``_ssl'' and reads them from the OpenSSL
# GemStone loaded into the gem.  Either way the three must agree with each
# other, which is what these check -- and they check it by INVERTING the
# derivation (number -> tuple -> dotted string), so a bug in Grail's forward
# parse cannot also write the expectation.  The same functions run under CPython
# from the __main__ block below, where they are measured against a real
# OpenSSL-linked build.


def _info_from_number(number):
    """CPython's decomposition of OPENSSL_VERSION_NUMBER, from _ssl.c."""
    n = number
    status = n & 0xF
    n >>= 4
    patch = n & 0xFF
    n >>= 8
    fix = n & 0xFF
    n >>= 8
    minor = n & 0xFF
    n >>= 8
    major = n & 0xFF
    return (major, minor, fix, patch, status)


def _dotted_from_info(info):
    """Rebuild the version as OpenSSL spells it in its own banner.

    Pre-3.0 packs the third component as FIX and the release letter as PATCH
    (1.1.1w -> (1, 1, 1, 23, 15)); 3.0+ dropped FIX, so the third component is
    PATCH (3.0.19 -> (3, 0, 0, 19, 0))."""
    major, minor, fix, patch, status = info
    if major >= 3:
        return '%d.%d.%d' % (major, minor, patch)
    letter = '' if patch == 0 else chr(ord('a') + patch - 1)
    return '%d.%d.%d%s' % (major, minor, fix, letter)


def _is_openssl_build():
    return isinstance(ssl.OPENSSL_VERSION, str) \
        and ssl.OPENSSL_VERSION.startswith('OpenSSL ')


def constants_have_cpython_types():
    """str, a 5-tuple of ints, and an int -- the shapes CPython publishes."""
    info = ssl.OPENSSL_VERSION_INFO
    return (isinstance(ssl.OPENSSL_VERSION, str)
            and isinstance(info, tuple)
            and len(info) == 5
            and all(isinstance(x, int) for x in info)
            and isinstance(ssl.OPENSSL_VERSION_NUMBER, int))


def info_is_decomposition_of_number():
    """OPENSSL_VERSION_INFO is exactly the bit-decomposition of _NUMBER."""
    return tuple(ssl.OPENSSL_VERSION_INFO) \
        == _info_from_number(ssl.OPENSSL_VERSION_NUMBER)


def info_matches_banner():
    """The numbers agree with the version the banner names.

    This is the check with teeth: it recomputes the dotted version from the
    tuple and compares it with the second word of OPENSSL_VERSION, so a tuple
    that does not describe the library actually loaded fails here."""
    return _dotted_from_info(tuple(ssl.OPENSSL_VERSION_INFO)) \
        == ssl.OPENSSL_VERSION.split()[1]


def passes_urllib3_openssl_gate():
    """urllib3 2.x refuses to import below OpenSSL 1.1.1 (urllib3/__init__.py).

    It tests the banner prefix first and only then compares the tuple, so both
    halves have to hold."""
    return ssl.OPENSSL_VERSION.startswith('OpenSSL ') \
        and tuple(ssl.OPENSSL_VERSION_INFO) >= (1, 1, 1)


def openssl_constants():
    """The three constants, for the Smalltalk test to assert against."""
    return {
        'version': ssl.OPENSSL_VERSION,
        'info': tuple(ssl.OPENSSL_VERSION_INFO),
        'number': ssl.OPENSSL_VERSION_NUMBER,
        'types_ok': constants_have_cpython_types(),
        'info_is_decomposition': info_is_decomposition_of_number(),
        'info_matches_banner': info_matches_banner(),
        'urllib3_gate': passes_urllib3_openssl_gate(),
    }


if __name__ == '__main__':
    # Only the OpenSSL-constant checks are self-running: the TLS functions above
    # need a GemStone example certificate and a second green thread.
    always = [constants_have_cpython_types, info_is_decomposition_of_number]
    openssl_only = [info_matches_banner, passes_urllib3_openssl_gate]
    print('OPENSSL_VERSION        %r' % (ssl.OPENSSL_VERSION,))
    print('OPENSSL_VERSION_INFO   %r' % (tuple(ssl.OPENSSL_VERSION_INFO),))
    print('OPENSSL_VERSION_NUMBER 0x%x' % (ssl.OPENSSL_VERSION_NUMBER,))
    for fn in always:
        print('%-6s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
    for fn in openssl_only:
        if not _is_openssl_build():
            # A LibreSSL-linked CPython cannot satisfy these, and says so in its
            # banner; Grail always runs OpenSSL, so this branch is CPython-only.
            print('%-6s %s (not an OpenSSL build: %r)'
                  % ('XFAIL', fn.__name__, ssl.OPENSSL_VERSION))
            continue
        print('%-6s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
