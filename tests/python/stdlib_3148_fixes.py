"""CPython 3.14.8 fixes in stdlib modules Grail REWRITES rather than vendors.

A vendored module takes upstream's fixes by re-vendoring.  A rewrite has to
be patched by hand, so each fix below was ported deliberately and is pinned
here, one check per fix:

* subprocess.CalledProcessError.__str__ formats a returncode that is not an
  int (None, a float) instead of raising TypeError; the command is quoted
  with '%s' and the sentence ends in a period.
* logging.Logger.removeHandler replaces the handler list, so a handler that
  removes itself in emit() no longer makes the next one miss the record
  (gh-79366).
* isinstance() against an ABC falls back to type(instance) when reading
  __class__ raises AttributeError (gh-153772).
* warn_explicit with the globals of a __main__ whose __spec__ is None asks
  its __loader__, without a ValueError or DeprecationWarning (gh-123011).
* configparser.write() folds \\r\\n and \\r, as well as \\n, into a
  continuation line -- and folds [DEFAULT] values at all.
* http.client stops after 100 interim (1xx) responses, and after 100
  trailer lines.
* http.cookies.Morsel.js_output percent-encodes the cookie, so a value
  holding </script> cannot break out of the script element.

Every EXPECTED value was produced by running these functions under CPython
3.14.8 (``--emit``), not written by hand.
"""

import io
import sys


def _outcome(fn):
    try:
        return ('ok', fn())
    except BaseException as exc:
        return (type(exc).__name__, str(exc))


def called_process_error_text():
    from subprocess import CalledProcessError
    return tuple(_outcome(lambda rc=rc: str(CalledProcessError(rc, cmd)))
                 for rc, cmd in ((None, 'cmd'), (1, 'cmd'), (2.5, 'cmd'),
                                 (1, ['ls', '-l'])))


def a_handler_removing_itself_spares_the_next():
    import logging
    log = logging.getLogger('stdlib_3148_fixes.remove')
    log.propagate = False
    ran = []

    class First(logging.Handler):
        def emit(self, record):
            ran.append('first')
            log.removeHandler(self)

    class Second(logging.Handler):
        def emit(self, record):
            ran.append('second')

    first, second = First(), Second()
    log.addHandler(first)
    log.addHandler(second)
    before = log.handlers
    log.warning('x')
    replaced = log.handlers is not before
    log.removeHandler(second)
    return ran, replaced, len(before)


def isinstance_without_a_class_attribute():
    import collections.abc

    class NoClass:
        def __getattribute__(self, name):
            if name == '__class__':
                raise AttributeError('__class__')
            return object.__getattribute__(self, name)

    return (_outcome(lambda: isinstance(NoClass(), collections.abc.Sized)),
            _outcome(lambda: isinstance(NoClass(), collections.abc.Iterable)))


def warn_explicit_with_main_globals():
    import warnings
    out = []
    for loader in (None, 'L'):
        g = {'__name__': '__main__', '__spec__': None, '__loader__': loader}
        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter('always')
            r = _outcome(lambda: warnings.warn_explicit(
                'msg', UserWarning, 'f.py', 1, module_globals=g))
        out.append((r, [(x.category.__name__, str(x.message)) for x in w]))
    return out


def configparser_folds_every_line_ending():
    import configparser
    p = configparser.ConfigParser(interpolation=None)
    p.read_string("[s]\nk = v\n")
    p.set('s', 'crlf', 'a\r\nb')
    p.set('s', 'cr', 'c\rd')
    buf = io.StringIO()
    p.write(buf)
    q = configparser.ConfigParser(interpolation=None)
    q.read_string(buf.getvalue())
    d = configparser.ConfigParser(defaults={'dk': 'x\ny'}, interpolation=None)
    dbuf = io.StringIO()
    d.write(dbuf)
    return buf.getvalue(), q.get('s', 'crlf'), q.get('s', 'cr'), dbuf.getvalue()


def _response(data):
    import http.client

    class Sock:
        def makefile(self, *args, **kwargs):
            return io.BytesIO(data)

    return http.client.HTTPResponse(Sock())


def http_client_bounds_interim_responses():
    def run(n):
        r = _response(b"HTTP/1.1 100 Continue\r\n\r\n" * n
                      + b"HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n")
        return _outcome(lambda: (r.begin(), r.status)[1])
    return run(99), run(100), run(101)


def http_client_bounds_trailers():
    def run(n):
        r = _response(b"HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n"
                      b"3\r\nabc\r\n0\r\n" + b"X-T: v\r\n" * n + b"\r\n")
        return _outcome(lambda: (r.begin(), r.read())[1])
    return run(100), run(101)


def cookie_js_output_is_percent_encoded():
    from http.cookies import SimpleCookie
    c = SimpleCookie()
    c['k'] = '</script><script>alert(1)</script>'
    return c['k'].js_output()


CHECKS = [
    called_process_error_text,
    a_handler_removing_itself_spares_the_next,
    isinstance_without_a_class_attribute,
    warn_explicit_with_main_globals,
    configparser_folds_every_line_ending,
    http_client_bounds_interim_responses,
    http_client_bounds_trailers,
    cookie_js_output_is_percent_encoded,
]

EXPECTED = {
    'called_process_error_text': (('ok', "Command 'cmd' returned non-zero exit status None."), ('ok', "Command 'cmd' returned non-zero exit status 1."), ('ok', "Command 'cmd' returned non-zero exit status 2.5."), ('ok', "Command '['ls', '-l']' returned non-zero exit status 1.")),
    'a_handler_removing_itself_spares_the_next': (['first', 'second'], True, 2),
    'isinstance_without_a_class_attribute': (('ok', False), ('ok', False)),
    'warn_explicit_with_main_globals': [(('ok', None), [('UserWarning', 'msg')]), (('ok', None), [('UserWarning', 'msg')])],
    'configparser_folds_every_line_ending': ('[s]\nk = v\ncrlf = a\n\tb\ncr = c\n\td\n\n', 'a\nb', 'c\nd', '[DEFAULT]\ndk = x\n\ty\n\n'),
    'http_client_bounds_interim_responses': (('ok', 200), ('HTTPException', 'got more than 100 interim responses'), ('HTTPException', 'got more than 100 interim responses')),
    'http_client_bounds_trailers': (('ok', b'abc'), ('HTTPException', 'got more than 100 trailers')),
    'cookie_js_output_is_percent_encoded': '\n        <script type="text/javascript">\n        <!-- begin hiding\n        document.cookie = decodeURIComponent("k%3D%22%3C%2Fscript%3E%3Cscript%3Ealert%281%29%3C%2Fscript%3E%22");\n        // end hiding -->\n        </script>\n        ',
}

RESULTS = {}
for _fn in CHECKS:
    _got = _outcome(_fn)
    _got = _got[1] if _got[0] == 'ok' else _got
    _want = EXPECTED.get(_fn.__name__)
    RESULTS[_fn.__name__] = (_got == _want) or 'got: %r' % (_got,)


if __name__ == '__main__':
    if sys.argv[1:] == ['--emit']:
        for _fn in CHECKS:
            print('    %r: %r,' % (_fn.__name__, _fn()))
    else:
        for _name in sorted(RESULTS):
            _v = RESULTS[_name]
            print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
                  '' if _v is True else _v)
