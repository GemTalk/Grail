"""The OpenSSL callbacks behind ssl: server-side ALPN selection, the message
callback, the keylog file and PSK.

In Grail these come from src/c/ssl/grail_ssl.c, a small C library _ssl.py
reaches through CCallout.  No Python runs inside OpenSSL: ALPN is chosen in C,
message records and keylog lines are queued in C and delivered after the
OpenSSL call returns, and a PSK callback pauses the handshake's ASYNC job so
that Python can answer it as ordinary code.  That last point is what
``psk_callback_may_run_a_generator'' pins: a generator is a GsProcess in
Grail, and running one from inside a user-action callback (the obvious
alternative design) crashed the gem.

Every connection here runs over memory BIOs in one thread, so the checks are
deterministic.  Every expectation was measured against CPython 3.14.
"""

import os
import ssl
import sys
import tempfile

RESULTS = {}

CERT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..',
                    'src', 'python', 'stdlib', 'test', 'certdata', 'keycert.pem')
PSK = bytes.fromhex('deadbeef')


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:300])


def handshake(cctx, sctx):
    """Handshake a client and a server over memory BIOs.  Answers (client,
    server, outcome): 'ok', or the name of the exception that ended it."""
    cin, cout, sin, sout = (ssl.MemoryBIO(), ssl.MemoryBIO(),
                            ssl.MemoryBIO(), ssl.MemoryBIO())
    client = cctx.wrap_bio(cin, cout, server_hostname='localhost')
    server = sctx.wrap_bio(sin, sout, server_side=True)
    done = set()
    try:
        for _ in range(20):
            for obj in (client, server):
                if obj in done:
                    continue
                try:
                    obj.do_handshake()
                    done.add(obj)
                except ssl.SSLWantReadError:
                    pass
            if cout.pending:
                sin.write(cout.read())
            if sout.pending:
                cin.write(sout.read())
            if len(done) == 2:
                return client, server, 'ok'
        return client, server, 'stuck'
    except Exception as exc:
        return client, server, type(exc).__name__


def contexts():
    cctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    cctx.check_hostname = False
    cctx.verify_mode = ssl.CERT_NONE
    sctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    sctx.load_cert_chain(CERT)
    return cctx, sctx


def psk_contexts(tls13=False):
    cctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    cctx.check_hostname = False
    cctx.verify_mode = ssl.CERT_NONE
    sctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    if tls13:
        cctx.minimum_version = sctx.minimum_version = ssl.TLSVersion.TLSv1_3
    else:
        cctx.maximum_version = sctx.maximum_version = ssl.TLSVersion.TLSv1_2
        cctx.set_ciphers('PSK')
        sctx.set_ciphers('PSK')
    return cctx, sctx


# ------------------------------------------------ ALPN selection (server side)

def _alpn(client_protocols, server_protocols):
    cctx, sctx = contexts()
    cctx.set_alpn_protocols(client_protocols)
    sctx.set_alpn_protocols(server_protocols)
    client, server, outcome = handshake(cctx, sctx)
    return (outcome, client.selected_alpn_protocol(),
            server.selected_alpn_protocol())


check('alpn_server_selects_its_preference',
      _alpn(['bar', 'foo', 'baz'], ['baz', 'foo']), ('ok', 'baz', 'baz'))
check('alpn_without_overlap_selects_nothing',
      _alpn(['foo'], ['bar']), ('ok', None, None))


# ------------------------------------------------ the message callback

def _msg_callback():
    cctx, sctx = contexts()
    seen = []

    def cb(conn, direction, version, content_type, msg_type, data):
        seen.append((conn, direction, content_type, msg_type, type(data)))

    sctx._msg_callback = cb
    client, server, outcome = handshake(cctx, sctx)
    records = [(d, ct, mt) for (conn, d, ct, mt, t) in seen]
    return (outcome,
            all(conn is server for (conn, *_rest) in seen),
            all(t is bytes for (*_rest, t) in seen),
            ('read', ssl._TLSContentType.HANDSHAKE,
             ssl._TLSMessageType.CLIENT_HELLO) in records,
            ('write', ssl._TLSContentType.HANDSHAKE,
             ssl._TLSMessageType.SERVER_HELLO) in records,
            ('read', ssl._TLSContentType.HANDSHAKE,
             ssl._TLSMessageType.FINISHED) in records)


check('msg_callback_sees_the_handshake', _msg_callback(),
      ('ok', True, True, True, True, True))


def _msg_callback_raises():
    cctx, sctx = contexts()

    def cb(*args):
        raise ZeroDivisionError('from the message callback')

    cctx._msg_callback = cb
    return handshake(cctx, sctx)[2]


check('msg_callback_exception_ends_the_call', _msg_callback_raises(),
      'ZeroDivisionError')


# ------------------------------------------------ the keylog file

def _keylog():
    path = os.path.join(tempfile.gettempdir(),
                        'grail_ssl_keylog_%d.txt' % os.getpid())
    if os.path.exists(path):
        os.unlink(path)
    try:
        cctx, sctx = contexts()
        cctx.keylog_filename = path
        outcome = handshake(cctx, sctx)[2]
        cctx.keylog_filename = None
        with open(path) as f:
            lines = f.read().splitlines()
        return (outcome, lines[0], sorted(line.split()[0] for line in lines[1:]))
    finally:
        if os.path.exists(path):
            os.unlink(path)


check('keylog_writes_a_header_and_the_tls13_secrets', _keylog(),
      ('ok', '# TLS secrets log file, generated by OpenSSL / Python',
       ['CLIENT_HANDSHAKE_TRAFFIC_SECRET', 'CLIENT_TRAFFIC_SECRET_0',
        'EXPORTER_SECRET', 'SERVER_HANDSHAKE_TRAFFIC_SECRET',
        'SERVER_TRAFFIC_SECRET_0']))


# ------------------------------------------------ PSK

def _psk(tls13, hint, client_answer):
    cctx, sctx = psk_contexts(tls13)
    asked = []

    def client_cb(h):
        asked.append(('client', h))
        return client_answer(h)

    def server_cb(identity):
        asked.append(('server', identity))
        return PSK

    cctx.set_psk_client_callback(client_cb)
    sctx.set_psk_server_callback(server_cb, hint)
    client, server, outcome = handshake(cctx, sctx)
    return (outcome, client.version() if outcome == 'ok' else None, asked)


check('psk_tls12_passes_the_hint_and_the_identity',
      _psk(False, 'the hint', lambda h: ('the id', PSK)),
      ('ok', 'TLSv1.2', [('client', 'the hint'), ('server', 'the id')]))
check('psk_without_a_hint_asks_with_none',
      _psk(False, None, lambda h: (None, PSK)),
      ('ok', 'TLSv1.2', [('client', None), ('server', None)]))
check('psk_tls13_handshakes',
      _psk(True, None, lambda h: ('the id', PSK)),
      ('ok', 'TLSv1.3', [('client', None), ('server', 'the id')]))
check('psk_callback_may_run_a_generator',
      _psk(False, None, lambda h: (None, bytes(b for b in PSK))),
      ('ok', 'TLSv1.2', [('client', None), ('server', None)]))
check('psk_wrong_key_fails_the_handshake',
      _psk(False, None, lambda h: (None, b'\x01\x02\x03\x04'))[0],
      'SSLError')


def _psk_raises():
    reported = []
    old = sys.unraisablehook
    sys.unraisablehook = lambda u: reported.append(
        (u.exc_type.__name__, u.err_msg.startswith(
            'Exception ignored in ssl PSK client callback')))
    try:
        def boom(hint):
            raise ValueError('from the PSK callback')
        outcome = _psk(False, None, boom)[0]
    finally:
        sys.unraisablehook = old
    return outcome, reported


check('psk_callback_exception_is_unraisable', _psk_raises(),
      ('SSLError', [('ValueError', True)]))


def refusals():
    """What each callback setter does, as 'msg:.. keylog:.. psk:..'.  Not a
    check: SslCallbacksTestCase calls it with the callback library switched
    off, where each must refuse with NotImplementedError rather than be
    silently ignored, and with it on, where each must take."""
    path = os.path.join(tempfile.gettempdir(),
                        'grail_ssl_refusals_%d.txt' % os.getpid())
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    out = []
    for name, set_it in (
            ('msg', lambda: setattr(ctx, '_msg_callback', print)),
            ('keylog', lambda: setattr(ctx, 'keylog_filename', path)),
            ('psk', lambda: ctx.set_psk_client_callback(print))):
        try:
            set_it()
            out.append(name + ':ok')
        except Exception as exc:
            out.append(name + ':' + type(exc).__name__)
    ctx.keylog_filename = None
    if os.path.exists(path):
        os.unlink(path)
    return ' '.join(out)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else ascii(_v))
