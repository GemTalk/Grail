# Fixture for StdlibLongTailTestCase's urldefrag / proxy-environment tests.
#
# These were the last two gaps standing between Grail and ``import kaggle'':
# requests.compat imports ``urldefrag'' from urllib.parse and
# ``getproxies / getproxies_environment / proxy_bypass /
# proxy_bypass_environment'' from urllib.request, and an ImportError on any one
# of them fails the whole package at its first import line.
#
# SELF-VERIFYING: run it under CPython (``python3 tests/python/...'') and every
# check must print OK.  scripts/check_python_fixtures.sh does exactly that, so a
# check written from a Grail session rather than measured against CPython gets
# caught here instead of becoming permanent "conformance evidence".
#
# Two checks are marked grail_only and print XFAIL under CPython.  They document
# Grail deviations that are real and deliberate; see the comments on each.

import os

from urllib.parse import urldefrag
from urllib.request import (
    getproxies,
    getproxies_environment,
    proxy_bypass,
    proxy_bypass_environment,
)


# ---------------------------------------------------------------- urldefrag

def defrag_splits_at_the_hash():
    r = urldefrag('http://example.com/p?q=1#frag')
    return r.url == 'http://example.com/p?q=1' and r.fragment == 'frag'


def defrag_absent_fragment_is_empty_string():
    # Not None -- CPython normalises the missing fragment to ''.
    r = urldefrag('http://example.com/p')
    return r.url == 'http://example.com/p' and r.fragment == ''


def defrag_trailing_hash_is_an_empty_fragment():
    r = urldefrag('http://example.com/p#')
    return r.url == 'http://example.com/p' and r.fragment == ''


def defrag_keeps_later_hashes_in_the_fragment():
    # The split is at the FIRST '#'; the rest is fragment, hashes and all.
    r = urldefrag('http://e/p#a#b')
    return r.url == 'http://e/p' and r.fragment == 'a#b'


def defrag_bare_fragment_leaves_an_empty_url():
    r = urldefrag('#top')
    return r.url == '' and r.fragment == 'top'


def defrag_relative_url():
    r = urldefrag('/x/y#z')
    return r.url == '/x/y' and r.fragment == 'z'


def defrag_geturl_round_trips():
    return (urldefrag('http://e/p#f').geturl() == 'http://e/p#f'
            and urldefrag('http://e/p').geturl() == 'http://e/p'
            # A trailing '#' does NOT survive the round trip: the empty
            # fragment is indistinguishable from no fragment.
            and urldefrag('http://e/p#').geturl() == 'http://e/p')


def defrag_result_is_a_two_tuple():
    r = urldefrag('http://e/p#f')
    url, fragment = r
    return (len(r) == 2 and r[0] == 'http://e/p' and r[1] == 'f'
            and url == 'http://e/p' and fragment == 'f')


def defrag_result_equals_a_plain_tuple():
    # CPython's DefragResult is a namedtuple, so it compares equal to the
    # tuple of its fields and hashes with it.
    r = urldefrag('http://e/p#f')
    return (r == ('http://e/p', 'f')
            and not (r == ('http://e/p', 'other'))
            and r != ('http://e/p', 'other')
            and hash(r) == hash(('http://e/p', 'f')))


def defrag_bytes_in_bytes_out():
    r = urldefrag(b'http://e/p#f')
    return (r.url == b'http://e/p' and r.fragment == b'f'
            and r.geturl() == b'http://e/p#f')


def defrag_bytes_result_decodes_back_to_str():
    r = urldefrag(b'http://e/p#f').decode()
    return r.url == 'http://e/p' and r.fragment == 'f'


def defrag_str_result_encodes_to_bytes():
    r = urldefrag('http://e/p#f').encode()
    return r.url == b'http://e/p' and r.fragment == b'f'


def defrag_leaves_the_scheme_alone():
    # GRAIL DEVIATION -- XFAIL under CPython, deliberately.  CPython's
    # urldefrag builds its result with urlsplit() + urlunsplit(), and urlsplit
    # LOWERCASES the scheme on the way through, so there this URL comes back as
    # 'http://Example.COM/p'.  Grail partitions at the '#' and returns the URL
    # untouched, because none of Grail's urlsplit/urlparse lowercase a scheme
    # either -- making urldefrag alone do it would put it out of step with the
    # module around it.  See the deviation note in urllib/parse.py.
    return urldefrag('HTTP://Example.COM/p#f').url == 'HTTP://Example.COM/p'


# ------------------------------------------------------- proxy environment
#
# Every check below drives getproxies_environment through the process
# environment, so each one saves and restores the names it touches.

_PROXY_NAMES = (
    'http_proxy', 'HTTP_PROXY', 'https_proxy', 'HTTPS_PROXY',
    'ftp_proxy', 'FTP_PROXY', 'all_proxy', 'ALL_PROXY',
    'no_proxy', 'NO_PROXY', 'REQUEST_METHOD',
)


def _snapshot():
    saved = {}
    for name in _PROXY_NAMES:
        saved[name] = os.environ.get(name)
    return saved


def _apply(values):
    for name in _PROXY_NAMES:
        value = values.get(name)
        if value is None:
            if name in os.environ:
                del os.environ[name]
        else:
            os.environ[name] = value


def _with_env(values, fn):
    """Run fn() with exactly `values` set among _PROXY_NAMES, then restore."""
    saved = _snapshot()
    try:
        _apply({})
        _apply(values)
        return fn()
    finally:
        _apply(saved)


def getproxies_reads_lowercase_scheme_variables():
    return _with_env(
        {'http_proxy': 'http://p:3128', 'https_proxy': 'http://s:3129'},
        lambda: getproxies_environment() == {'http': 'http://p:3128',
                                             'https': 'http://s:3129'},
    )


def getproxies_strips_the_proxy_suffix_and_lowercases_the_scheme():
    return _with_env(
        {'HTTPS_PROXY': 'http://s:3129'},
        lambda: getproxies_environment() == {'https': 'http://s:3129'},
    )


def getproxies_prefers_the_lowercase_spelling():
    # Both set: the second pass re-writes from the lowercase name, so the
    # lowercase value wins regardless of iteration order.
    return _with_env(
        {'http_proxy': 'http://lower:1', 'HTTP_PROXY': 'http://UPPER:2'},
        lambda: getproxies_environment() == {'http': 'http://lower:1'},
    )


def getproxies_empty_value_cannot_unset_the_uppercase_one():
    # GRAIL DEVIATION -- XFAIL under CPython, deliberately, and the cause is
    # below urllib entirely.  In CPython an empty lowercase <scheme>_proxy is
    # not "no opinion" but an explicit "no proxy for this scheme", and the
    # second pass pops the scheme, so this environment yields {}.
    #
    # GemStone cannot represent an empty environment variable: setting one to
    # '' is how os.unsetenv and ``del os.environ[k]'' UNSET it (see
    # os_Environ >> __delitem__), and reading it back answers nil.  So
    # ``http_proxy=""'' is indistinguishable from http_proxy being absent, the
    # scan never sees the name, and the uppercase value survives.  Closing this
    # needs a System-level environment primitive, not a change here.
    return _with_env(
        {'http_proxy': '', 'HTTP_PROXY': 'http://UPPER:2'},
        lambda: getproxies_environment() == {'http': 'http://UPPER:2'},
    )


def getproxies_ignores_an_empty_uppercase_value():
    return _with_env(
        {'HTTP_PROXY': ''},
        lambda: getproxies_environment() == {},
    )


def getproxies_no_proxy_is_carried_as_the_no_key():
    # 'no_proxy' is not a scheme, but it goes through the same suffix strip,
    # which is how proxy_bypass_environment finds it.
    return _with_env(
        {'no_proxy': 'localhost,.internal'},
        lambda: getproxies_environment() == {'no': 'localhost,.internal'},
    )


def getproxies_drops_uppercase_http_proxy_under_request_method():
    # CVE-2016-1000110: in a CGI environment HTTP_PROXY may have been forged
    # by a client "Proxy:" header, so REQUEST_METHOD being set disables it.
    # https_proxy is untouched -- only 'http' is popped.
    return _with_env(
        {'HTTP_PROXY': 'http://forged:1', 'HTTPS_PROXY': 'http://s:2',
         'REQUEST_METHOD': 'GET'},
        lambda: getproxies_environment() == {'https': 'http://s:2'},
    )


def getproxies_keeps_lowercase_http_proxy_under_request_method():
    # The lowercase spelling cannot have come from a request header, so the
    # second pass puts it back after the pop.
    return _with_env(
        {'http_proxy': 'http://real:1', 'REQUEST_METHOD': 'GET'},
        lambda: getproxies_environment() == {'http': 'http://real:1'},
    )


def getproxies_is_getproxies_environment():
    # CPython's generic (non-darwin, non-nt) branch aliases them, and Grail
    # takes that branch on every platform.
    return _with_env(
        {'http_proxy': 'http://p:3128'},
        lambda: getproxies() == {'http': 'http://p:3128'},
    )


def bypass_is_false_without_no_proxy():
    return proxy_bypass_environment('example.com', {}) is False


def bypass_star_matches_everything():
    return (proxy_bypass_environment('example.com', {'no': '*'}) is True
            and proxy_bypass_environment('a.b.c.d', {'no': '*'}) is True)


def bypass_matches_an_exact_host():
    proxies = {'no': 'localhost,example.com'}
    return (proxy_bypass_environment('example.com', proxies) is True
            and proxy_bypass_environment('other.com', proxies) is False)


def bypass_matches_a_dns_suffix():
    proxies = {'no': 'example.com'}
    return (proxy_bypass_environment('www.example.com', proxies) is True
            # A suffix match is on a DOT boundary, so this must NOT match.
            and proxy_bypass_environment('notexample.com', proxies) is False)


def bypass_ignores_a_leading_dot_in_no_proxy():
    proxies = {'no': '.example.com'}
    return (proxy_bypass_environment('www.example.com', proxies) is True
            and proxy_bypass_environment('example.com', proxies) is True)


def bypass_ignores_whitespace_and_empty_entries():
    proxies = {'no': ' localhost , , example.com '}
    return (proxy_bypass_environment('example.com', proxies) is True
            and proxy_bypass_environment('localhost', proxies) is True
            and proxy_bypass_environment('elsewhere.net', proxies) is False)


def bypass_is_case_insensitive():
    return proxy_bypass_environment('WWW.Example.COM',
                                    {'no': 'EXAMPLE.com'}) is True


def bypass_strips_the_port_before_matching():
    proxies = {'no': 'example.com'}
    return (proxy_bypass_environment('example.com:8080', proxies) is True
            and proxy_bypass_environment('www.example.com:443', proxies) is True)


def bypass_matches_a_host_and_port_entry_literally():
    # An entry that carries a port is compared against the unstripped host,
    # so it matches only that port.
    proxies = {'no': 'example.com:8080'}
    return (proxy_bypass_environment('example.com:8080', proxies) is True
            and proxy_bypass_environment('example.com:9090', proxies) is False
            and proxy_bypass_environment('example.com', proxies) is False)


def bypass_reads_the_environment_when_given_no_proxies():
    return _with_env(
        {'no_proxy': 'example.com'},
        lambda: (proxy_bypass_environment('www.example.com') is True
                 and proxy_bypass_environment('other.net') is False),
    )


def bypass_is_proxy_bypass_environment():
    return _with_env(
        {'no_proxy': '*'},
        lambda: proxy_bypass('anything.at.all') is True,
    )


def getproxies_sees_an_inherited_variable():
    # NOT set through os.environ by this process -- the harness exports
    # GRAIL_FIXTURE_HTTP_PROXY_PRESET into the environment before starting the
    # interpreter, and this check asks whether the SCAN finds a name the
    # process merely inherited.  Under Grail that is the whole point of the
    # os_Environ probe list (GemStone has no read-the-environment-block
    # primitive, so iteration only reports names the session has touched); the
    # check is skipped, not failed, when the harness has not set it.
    preset = os.environ.get('GRAIL_FIXTURE_HTTP_PROXY_PRESET')
    if preset is None:
        return None
    return getproxies_environment().get('http') == preset


checks = [
    defrag_splits_at_the_hash,
    defrag_absent_fragment_is_empty_string,
    defrag_trailing_hash_is_an_empty_fragment,
    defrag_keeps_later_hashes_in_the_fragment,
    defrag_bare_fragment_leaves_an_empty_url,
    defrag_relative_url,
    defrag_geturl_round_trips,
    defrag_result_is_a_two_tuple,
    defrag_result_equals_a_plain_tuple,
    defrag_bytes_in_bytes_out,
    defrag_bytes_result_decodes_back_to_str,
    defrag_str_result_encodes_to_bytes,
    defrag_leaves_the_scheme_alone,
    getproxies_reads_lowercase_scheme_variables,
    getproxies_strips_the_proxy_suffix_and_lowercases_the_scheme,
    getproxies_prefers_the_lowercase_spelling,
    getproxies_empty_value_cannot_unset_the_uppercase_one,
    getproxies_ignores_an_empty_uppercase_value,
    getproxies_no_proxy_is_carried_as_the_no_key,
    getproxies_drops_uppercase_http_proxy_under_request_method,
    getproxies_keeps_lowercase_http_proxy_under_request_method,
    getproxies_is_getproxies_environment,
    bypass_is_false_without_no_proxy,
    bypass_star_matches_everything,
    bypass_matches_an_exact_host,
    bypass_matches_a_dns_suffix,
    bypass_ignores_a_leading_dot_in_no_proxy,
    bypass_ignores_whitespace_and_empty_entries,
    bypass_is_case_insensitive,
    bypass_strips_the_port_before_matching,
    bypass_matches_a_host_and_port_entry_literally,
    bypass_reads_the_environment_when_given_no_proxies,
    bypass_is_proxy_bypass_environment,
    getproxies_sees_an_inherited_variable,
]

# Checks CPython is EXPECTED to fail -- each documents a deliberate Grail
# deviation, so they print XFAIL rather than FAIL under CPython and an XPASS
# (the difference having gone away) is a failure of this gate.
#
#   defrag_leaves_the_scheme_alone -- Grail returns the URL exactly as given;
#     CPython lowercases the scheme, because its urldefrag round-trips through
#     urlsplit/urlunsplit.  See the deviation note in urllib/parse.py.
#
#   getproxies_empty_value_cannot_unset_the_uppercase_one -- GemStone has no
#     representation for an empty environment variable ('' is how it unsets
#     one), so CPython's "empty lowercase name suppresses the uppercase one"
#     rule cannot fire.  See the comment on the check.
grail_only = {
    'defrag_leaves_the_scheme_alone',
    'getproxies_empty_value_cannot_unset_the_uppercase_one',
}


if __name__ == '__main__':
    for check in checks:
        result = check()
        if result is None:
            status = 'OK'      # skipped: the harness did not arm this check
        elif check.__name__ in grail_only:
            status = 'XFAIL' if result is False else 'XPASS'
        else:
            status = 'OK' if result is True else 'FAIL'
        print('%-6s %s' % (status, check.__name__))
