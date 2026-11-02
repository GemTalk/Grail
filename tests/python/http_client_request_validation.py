"""Fixture: http.client refuses a request CPython refuses, before sending it.

CPython's HTTPConnection validates every request (Lib/http/client.py): a
control character in the host (CVE-2019-18348), the method, or the URL
(CVE-2019-9740), and a header name or value that could inject another
header, is refused before anything is sent.  Grail's hand-rolled client sent
them, so test_urllib's four control-character tests saw no InvalidURL.
Nothing here opens a connection: putrequest and putheader only buffer.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import http.client

r = {}


def outcome(thunk):
    try:
        thunk()
        return 'accepted'
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def request(method='GET', url='/'):
    connection = http.client.HTTPConnection('example.com')
    connection.putrequest(method, url)
    return connection


r['a_clean_request'] = outcome(lambda: request().putheader('Accept', 'text/html', 'text/plain'))
r['a_host_with_a_newline'] = outcome(lambda: http.client.HTTPConnection('ex\r\nample.com'))
r['a_url_with_a_newline'] = outcome(lambda: request(url='/a\r\nX-Injected: 1'))
r['a_url_with_a_space'] = outcome(lambda: request(url='/a b'))
r['a_method_with_a_control_character'] = outcome(lambda: request(method='GET\x00'))
r['a_header_name_with_a_colon'] = outcome(lambda: request().putheader('X:Y', 'v'))
r['a_header_name_with_a_space'] = outcome(lambda: request().putheader(' X', 'v'))
r['a_header_value_injecting_a_header'] = outcome(lambda: request().putheader('X', 'v\r\nInjected: 1'))
r['a_folded_header_value'] = outcome(lambda: request().putheader('X', 'v\r\n continued'))
r['an_int_header_value'] = outcome(lambda: request().putheader('Content-Length', 42))
r['the_error_is_an_http_exception'] = issubclass(http.client.InvalidURL, http.client.HTTPException)

EXPECTED = {
    'a_clean_request': 'accepted',
    'a_host_with_a_newline': "InvalidURL: URL can't contain control characters. 'ex\\r\\nample.com' (found at least '\\r')",
    'a_url_with_a_newline': "InvalidURL: URL can't contain control characters. '/a\\r\\nX-Injected: 1' (found at least '\\r')",
    'a_url_with_a_space': "InvalidURL: URL can't contain control characters. '/a b' (found at least ' ')",
    'a_method_with_a_control_character': "ValueError: method can't contain control characters. 'GET\\x00' (found at least '\\x00')",
    'a_header_name_with_a_colon': "ValueError: Invalid header name b'X:Y'",
    'a_header_name_with_a_space': "ValueError: Invalid header name b' X'",
    'a_header_value_injecting_a_header': "ValueError: Invalid header value b'v\\r\\nInjected: 1'",
    'a_folded_header_value': 'accepted',
    'an_int_header_value': 'accepted',
    'the_error_is_an_http_exception': True,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-36s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
