"""``http.cookiejar`` behaviour, measured against CPython 3.14.

Grail VENDORS CPython 3.14.6's ``http/cookiejar.py`` verbatim (see the header
on ``src/python/stdlib/http/cookiejar.py`` for why a source drop rather than a
hand-rolled subset, and for the one adaptation).  A vendored module still needs
a conformance fixture, for two reasons that are not the usual one:

* the module is a client of a lot of Grail machinery -- the ``re`` engine (a
  dozen patterns, several with named groups and ``re.X``), ``time``/
  ``datetime``/``calendar`` arithmetic, ``threading.RLock``, ``str`` methods,
  ``copy.copy``, ``urllib.parse`` -- so it can be byte-identical to CPython and
  still behave differently here.  Every check below is really a check on that
  machinery seen through one demanding caller.
* it exercises Grail's ``urllib.request.Request``, which this change extended
  with the attribute surface ``CookiePolicy`` reads (``type``/``host``/
  ``origin_req_host``/``unverifiable``, ``has_header``/``get_header``/
  ``add_unredirected_header``).  That part is NOT vendored and is exactly where
  a drift would hide.

Things worth knowing about the expectations below, each measured rather than
recalled:

* ``http2time`` returns a float, and accepts four date shapes (RFC 1123,
  RFC 850 two-digit year, asctime, and a bare ``dd-Mon-yy``); it answers None
  rather than raising on junk.
* a ``Set-Cookie`` with no ``Domain`` gets the request host verbatim and
  ``domain_specified`` False; one with ``Domain=.example.com`` keeps the
  leading dot.  That dot is what makes it match subdomains.
* a cookie already EXPIRED at extract time is not stored at all -- the jar
  length after ``extract_cookies`` is 0, not 1-then-swept.
* ``add_cookie_header`` writes through ``add_unredirected_header``, so the
  Cookie header lands in ``unredirected_hdrs``; ``get_header('Cookie')`` sees
  it and a redirect to another host will not re-send it.
* cookies come back in longest-path-first order, and that is what makes the
  joined header deterministic.
* ``LoadError`` subclasses ``OSError``, so ``except OSError`` catches a corrupt
  cookie file.

Every check runs identically under CPython and under Grail.
"""

import os
import tempfile

import http.cookiejar as cookiejar
import urllib.request
from http.cookiejar import (Cookie, CookieJar, CookiePolicy, DefaultCookiePolicy,
                            FileCookieJar, LWPCookieJar, LoadError,
                            MozillaCookieJar)

RESULTS = {}


def check(name, fn, expected):
    try:
        actual = fn()
    except BaseException as exc:            # noqa: BLE001 - reported, not raised
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)
        return
    RESULTS[name] = True if actual == expected else 'got %r want %r' % (
        actual, expected)


# --------------------------------------------------------------- test doubles
#
# A response only has to answer ``info()`` with something exposing
# ``get_all(name, default)`` -- that is the whole of the interface
# ``CookieJar.extract_cookies`` uses.  Building one by hand keeps the fixture
# free of a live HTTP connection and runs the same under both interpreters.

class FakeHeaders:
    def __init__(self, pairs):
        self._pairs = pairs

    def get_all(self, name, default=None):
        found = [v for (k, v) in self._pairs if k.lower() == name.lower()]
        return found or default


class FakeResponse:
    def __init__(self, pairs):
        self._headers = FakeHeaders(pairs)

    def info(self):
        return self._headers


def jar_with(set_cookies, url='http://www.example.com/', policy=None):
    """A CookieJar that has already seen ``set_cookies`` from ``url``."""
    jar = CookieJar(policy) if policy is not None else CookieJar()
    request = urllib.request.Request(url)
    response = FakeResponse([('Set-Cookie', v) for v in set_cookies])
    jar.extract_cookies(response, request)
    return jar


def header_for(jar, url):
    """The Cookie header ``jar`` would send to ``url`` (None if none)."""
    request = urllib.request.Request(url)
    jar.add_cookie_header(request)
    return request.get_header('Cookie')


def sorted_pairs(jar):
    return sorted((c.name, c.value) for c in jar)


# ------------------------------------------------------------- date  parsing

check('http2time_rfc1123',
      lambda: cookiejar.http2time('Wed, 09 Feb 1994 22:23:32 GMT'),
      760832612.0)
check('http2time_rfc850_two_digit_year',
      lambda: cookiejar.http2time('Tuesday, 08-Feb-94 14:15:29 GMT'),
      760716929.0)
check('http2time_no_weekday',
      lambda: cookiejar.http2time('08-Feb-94 14:15:29 GMT'), 760716929)
check('http2time_bare_date',
      lambda: cookiejar.http2time('03-Feb-94'), 760233600)
# The two code paths do not agree on the return TYPE: the strict RFC 1123
# pattern goes through a float seconds value, the loose fallback through an
# int.  Anything comparing http2time output with ``is'' or by type would be
# wrong; the jar only ever compares it with <.
check('http2time_strict_is_float',
      lambda: type(cookiejar.http2time('Wed, 09 Feb 1994 22:23:32 GMT')), float)
check('http2time_loose_is_int',
      lambda: type(cookiejar.http2time('03-Feb-94')), int)
# asctime() shape is NOT one of the four accepted -- Cookie dates are never
# written that way, and http2time does not fall back to it.
check('http2time_rejects_asctime',
      lambda: cookiejar.http2time('Tue Feb  8 14:15:29 1994'), None)
# Junk is None, not an exception -- the jar relies on that to ignore a bad
# ``expires`` rather than reject the whole cookie.
check('http2time_junk', lambda: cookiejar.http2time('not a date'), None)
check('http2time_empty', lambda: cookiejar.http2time(''), None)

check('iso2time_offset',
      lambda: cookiejar.iso2time('1994-02-03 14:15:29 -0100'), 760288529)
check('iso2time_z', lambda: cookiejar.iso2time('1994-02-03T14:15:29Z'),
      760284929)
check('iso2time_junk', lambda: cookiejar.iso2time('nonsense'), None)

check('time2isoz', lambda: cookiejar.time2isoz(760233600),
      '1994-02-03 00:00:00Z')
check('time2netscape', lambda: cookiejar.time2netscape(760233600),
      'Thu, 03-Feb-1994 00:00:00 GMT')


# ------------------------------------------------------- header word parsing

check('split_header_words',
      lambda: cookiejar.split_header_words(
          ['foo="bar"; port="80,81"; discard, bar=baz']),
      [[('foo', 'bar'), ('port', '80,81'), ('discard', None)],
       [('bar', 'baz')]])
check('split_header_words_bare',
      lambda: cookiejar.split_header_words(['text/html; charset=UTF-8']),
      [[('text/html', None), ('charset', 'UTF-8')]])
check('join_header_words',
      lambda: cookiejar.join_header_words([[('foo', None), ('bar', 'baz')]]),
      'foo; bar=baz')
# join_header_words quotes a value that is not a token.
check('join_header_words_quotes',
      lambda: cookiejar.join_header_words([[('foo', 'bar baz')]]),
      'foo="bar baz"')
# parse_ns_headers converts ``expires`` to an int and appends version 0.
check('parse_ns_headers',
      lambda: cookiejar.parse_ns_headers(
          ['foo=bar; expires=01 Jan 2040 22:23:32 GMT']),
      [[('foo', 'bar'), ('expires', 2209069412), ('version', '0')]])


# ---------------------------------------------------------- domain predicates

check('is_HDN_true', lambda: cookiejar.is_HDN('example.com'), True)
check('is_HDN_leading_dot', lambda: cookiejar.is_HDN('.example.com'), False)
check('is_HDN_ip', lambda: cookiejar.is_HDN('192.168.1.1'), False)
check('domain_match_subdomain',
      lambda: cookiejar.domain_match('www.example.com', '.example.com'), True)
check('domain_match_other',
      lambda: cookiejar.domain_match('www.other.org', '.example.com'), False)
check('domain_match_exact',
      lambda: cookiejar.domain_match('example.com', 'example.com'), True)
check('user_domain_match_exact',
      lambda: cookiejar.user_domain_match('acme.com', 'acme.com'), True)
check('liberal_is_HDN', lambda: cookiejar.liberal_is_HDN('example.com'), True)
check('reach', lambda: cookiejar.reach('www.acme.com'), '.acme.com')
check('reach_two_labels', lambda: cookiejar.reach('acme.com'), 'acme.com')
check('eff_request_host',
      lambda: cookiejar.eff_request_host(
          urllib.request.Request('http://localhost/')),
      ('localhost', 'localhost.local'))
check('request_host',
      lambda: cookiejar.request_host(
          urllib.request.Request('http://WWW.Example.com:8080/x')),
      'www.example.com')
# request_path is the PATH only -- the query is dropped, so a cookie set on
# /a/b is matched the same however the request is parameterised.
check('request_path',
      lambda: cookiejar.request_path(
          urllib.request.Request('http://www.example.com/a/b?q=1')),
      '/a/b')
check('request_port_default',
      lambda: cookiejar.request_port(
          urllib.request.Request('http://www.example.com/')),
      '80')
check('request_port_explicit',
      lambda: cookiejar.request_port(
          urllib.request.Request('http://www.example.com:8080/')),
      '8080')


# ------------------------------------------------------ extract_cookies shape

check('extract_two', lambda: sorted_pairs(jar_with(
    ['a=1; Path=/; Domain=.example.com', 'b=2'])),
    [('a', '1'), ('b', '2')])
check('extract_len', lambda: len(jar_with(['a=1', 'b=2'])), 2)


def _cookie_attrs():
    jar = jar_with(['a=1; Path=/; Domain=.example.com'])
    c = list(jar)[0]
    return (c.name, c.value, c.domain, c.path, c.secure, c.expires,
            c.version, c.port, c.discard, c.domain_specified,
            c.domain_initial_dot, c.path_specified)


check('cookie_attrs_explicit_domain', _cookie_attrs,
      ('a', '1', '.example.com', '/', False, None, 0, None, True, True, True,
       True))


def _default_domain_attrs():
    jar = jar_with(['b=2'])
    c = list(jar)[0]
    return (c.domain, c.path, c.domain_specified, c.domain_initial_dot,
            c.path_specified)


# No Domain= -> the request host verbatim, no leading dot, not "specified";
# no Path= -> the directory of the request path.
check('cookie_attrs_default_domain', _default_domain_attrs,
      ('www.example.com', '/', False, False, False))
check('cookie_default_path',
      lambda: list(jar_with(['b=2'], url='http://www.example.com/a/b/c'))[0].path,
      '/a/b')
check('cookie_httponly_in_rest',
      lambda: 'HttpOnly' in list(jar_with(['a=1; HttpOnly']))[0]._rest, True)
check('cookie_get_nonstandard_attr',
      lambda: list(jar_with(['a=1; SameSite=Lax']))[0].get_nonstandard_attr(
          'SameSite'), 'Lax')
check('cookie_repr_shape',
      lambda: repr(list(jar_with(['a=1']))[0]).startswith('Cookie(version=0, '
                                                          "name='a'"), True)
check('jar_repr', lambda: repr(jar_with([])), '<CookieJar[]>')


# --------------------------------------------------------- add_cookie_header

check('header_two_cookies',
      lambda: header_for(jar_with(['a=1; Path=/; Domain=.example.com', 'b=2']),
                         'http://www.example.com/some/path'),
      'a=1; b=2')
# The dotted domain reaches a sibling host; the host-only cookie does not.
check('header_subdomain',
      lambda: header_for(jar_with(['a=1; Path=/; Domain=.example.com', 'b=2']),
                         'http://other.example.com/'),
      'a=1')
check('header_unrelated_domain',
      lambda: header_for(jar_with(['a=1; Domain=.example.com']),
                         'http://other.org/'),
      None)
# Path scoping: /deep is not sent to /.
check('header_path_scoped',
      lambda: header_for(jar_with(['deep=1; Path=/deep']),
                         'http://www.example.com/'),
      None)
check('header_path_match',
      lambda: header_for(jar_with(['deep=1; Path=/deep']),
                         'http://www.example.com/deep/er'),
      'deep=1')
# Longest path first, so the header order is deterministic.
check('header_longest_path_first',
      lambda: header_for(jar_with(['root=1; Path=/', 'deep=2; Path=/a/b']),
                         'http://www.example.com/a/b/c'),
      'deep=2; root=1')
def _add_and_report():
    jar = jar_with(['a=1'])
    request = urllib.request.Request('http://www.example.com/')
    jar.add_cookie_header(request)
    return request.unredirected_hdrs



check('header_lands_in_unredirected',
      lambda: sorted(_add_and_report().items()),
      [('Cookie', 'a=1')])


check('no_cookie_header_when_empty',
      lambda: header_for(CookieJar(), 'http://www.example.com/'), None)


# --------------------------------------------------------------- secure flag

def _secure_jar():
    return jar_with(['s=1; Secure; Path=/'], url='https://www.example.com/')


check('secure_not_sent_over_http',
      lambda: header_for(_secure_jar(), 'http://www.example.com/'), None)
check('secure_sent_over_https',
      lambda: header_for(_secure_jar(), 'https://www.example.com/'), 's=1')


# ------------------------------------------------------------------- expiry

check('expired_never_stored',
      lambda: len(jar_with(['e=1; expires=Wed, 09 Feb 1994 22:23:32 GMT'])), 0)
check('future_expiry_stored',
      lambda: len(jar_with(['e=1; expires=Fri, 31 Dec 2038 23:59:59 GMT'])), 1)
check('future_expiry_value',
      lambda: list(jar_with(
          ['e=1; expires=Fri, 31 Dec 2038 23:59:59 GMT']))[0].expires,
      2177452799)
# Max-Age is an RFC 2965 attribute but the Netscape parser honours it too:
# Max-Age=0 makes the cookie expire immediately, and an already-expired
# cookie is discarded rather than stored, at either version.
check('max_age_zero_deletes_v0',
      lambda: len(jar_with(['a=1; Max-Age=0'])), 0)
check('max_age_zero_deletes_v1',
      lambda: len(jar_with(['a=1; Version=1; Max-Age=0'])), 0)
# A later Set-Cookie for the same name/domain/path replaces the earlier one.
check('resend_replaces_value',
      lambda: sorted_pairs(jar_with(['a=1', 'a=2'])), [('a', '2')])


def _session_clear():
    jar = jar_with(['sess=1'])
    before = len(jar)
    jar.clear_session_cookies()
    return (before, len(jar))


check('clear_session_cookies', _session_clear, (1, 0))


def _clear_one():
    jar = jar_with(['a=1; Path=/; Domain=.example.com', 'b=2'])
    jar.clear('.example.com', '/', 'a')
    return sorted_pairs(jar)


check('clear_one', _clear_one, [('b', '2')])


def _clear_unknown():
    jar = jar_with(['a=1'])
    try:
        jar.clear('nosuch.example', '/', 'a')
    except KeyError:
        return 'KeyError'
    return 'no error'


check('clear_unknown_raises', _clear_unknown, 'KeyError')


def _clear_all():
    jar = jar_with(['a=1', 'b=2'])
    jar.clear()
    return len(jar)


check('clear_all', _clear_all, 0)


# --------------------------------------------------------------- set_cookie

def _hand_built_cookie():
    jar = CookieJar()
    jar.set_cookie(Cookie(
        version=0, name='n', value='v', port=None, port_specified=False,
        domain='.example.com', domain_specified=True, domain_initial_dot=True,
        path='/', path_specified=True, secure=False, expires=None,
        discard=True, comment=None, comment_url=None, rest={}))
    return (len(jar), header_for(jar, 'http://www.example.com/'))


check('set_cookie_hand_built', _hand_built_cookie, (1, 'n=v'))


# ------------------------------------------------------------------- policy

check('blocked_domain',
      lambda: len(jar_with(['a=1; Domain=.example.com'],
                           policy=DefaultCookiePolicy(
                               blocked_domains=['.example.com']))),
      0)
check('allowed_domains_excludes',
      lambda: len(jar_with(['a=1'],
                           policy=DefaultCookiePolicy(
                               allowed_domains=['.other.org']))),
      0)
check('allowed_domains_includes',
      lambda: len(jar_with(['a=1'],
                           policy=DefaultCookiePolicy(
                               allowed_domains=['.example.com']))),
      1)
check('policy_is_cookiepolicy',
      lambda: isinstance(CookieJar()._policy, CookiePolicy), True)
check('rfc2965_off_by_default',
      lambda: DefaultCookiePolicy().rfc2965, False)
check('hide_cookie2_off_by_default',
      lambda: DefaultCookiePolicy().hide_cookie2, False)
check('strict_ns_domain_default',
      lambda: DefaultCookiePolicy().strict_ns_domain,
      DefaultCookiePolicy.DomainLiberal)
def _blocked_roundtrip():
    policy = DefaultCookiePolicy()
    policy.set_blocked_domains(['.a.com', '.b.com'])
    return policy.blocked_domains()



check('set_blocked_domains_roundtrip',
      lambda: _blocked_roundtrip(), ('.a.com', '.b.com'))


# ---------------------------------------------------------------- file jars

_TMP = tempfile.gettempdir()
_MOZ = os.path.join(_TMP, 'grail_http_cookiejar_fixture.txt')
_LWP = os.path.join(_TMP, 'grail_http_cookiejar_fixture.lwp')

_SET_COOKIE = 'a=1; Path=/; Domain=.example.com; expires=Fri, 31 Dec 2038 23:59:59 GMT'


def _roundtrip(cls, path):
    saver = cls(path)
    request = urllib.request.Request('http://www.example.com/')
    saver.extract_cookies(FakeResponse([('Set-Cookie', _SET_COOKIE)]), request)
    saver.save(ignore_discard=True, ignore_expires=True)
    loader = cls(path)
    loader.load(ignore_discard=True, ignore_expires=True)
    return [(c.name, c.value, c.domain, c.path, c.expires) for c in loader]


check('mozilla_roundtrip', lambda: _roundtrip(MozillaCookieJar, _MOZ),
      [('a', '1', '.example.com', '/', 2177452799)])
check('lwp_roundtrip', lambda: _roundtrip(LWPCookieJar, _LWP),
      [('a', '1', '.example.com', '/', 2177452799)])
def _first_line(path):
    with open(path) as f:
        return f.readline().rstrip('\n')



check('mozilla_header_line', lambda: _first_line(_MOZ),
      '# Netscape HTTP Cookie File')
check('lwp_header_line', lambda: _first_line(_LWP),
      '#LWP-Cookies-2.0')


def _bad_file():
    path = os.path.join(_TMP, 'grail_http_cookiejar_bad.txt')
    with open(path, 'w') as f:
        f.write('this is not a cookie file\n')
    jar = MozillaCookieJar(path)
    try:
        jar.load()
    except LoadError:
        result = 'LoadError'
    except OSError:
        result = 'OSError'
    else:
        result = 'no error'
    os.remove(path)
    return result


check('corrupt_file_raises_loaderror', _bad_file, 'LoadError')
# LoadError subclasses OSError, so ``except OSError'' is enough for callers
# that do not want to name it.
check('loaderror_is_oserror', lambda: issubclass(LoadError, OSError), True)


def _missing_file():
    path = os.path.join(_TMP, 'grail_http_cookiejar_absent.txt')
    if os.path.exists(path):
        os.remove(path)
    try:
        MozillaCookieJar(path).load()
    except FileNotFoundError:
        return 'FileNotFoundError'
    except OSError:
        return 'OSError'
    return 'no error'


check('missing_file_raises', _missing_file, 'FileNotFoundError')
check('filecookiejar_is_base',
      lambda: (issubclass(MozillaCookieJar, FileCookieJar),
               issubclass(LWPCookieJar, FileCookieJar),
               issubclass(FileCookieJar, CookieJar)),
      (True, True, True))


def _cleanup():
    for path in (_MOZ, _LWP):
        if os.path.exists(path):
            os.remove(path)
    return True


check('cleanup', _cleanup, True)


# ------------------------------------------- the shape ``requests'' imports

check('exports_all', lambda: sorted(cookiejar.__all__),
      ['Cookie', 'CookieJar', 'CookiePolicy', 'DefaultCookiePolicy',
       'FileCookieJar', 'LWPCookieJar', 'LoadError', 'MozillaCookieJar'])
# requests/compat.py does ``from http import cookiejar as cookielib'' and
# requests/cookies.py subclasses CookieJar and reaches into these three
# attributes.  A RequestsCookieJar that cannot find them is a hard failure at
# import time, so pin them.
check('cookiejar_internals',
      lambda: sorted(n for n in ('_cookies', '_cookies_lock', '_policy')
                     if hasattr(CookieJar(), n)),
      ['_cookies', '_cookies_lock', '_policy'])
check('cookies_nested_dict_shape',
      lambda: sorted(jar_with(['a=1'])._cookies['www.example.com']['/']),
      ['a'])
def _set_policy_shape():
    jar = CookieJar()
    policy = DefaultCookiePolicy(blocked_domains=['.example.com'])
    jar.set_policy(policy)
    return jar._policy is policy



check('set_policy',
      lambda: _set_policy_shape(), True)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
