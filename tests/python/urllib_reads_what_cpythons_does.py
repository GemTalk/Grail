"""Fixture: the three gaps test_urllib still had, two of them checked here.

* http.client reads an "HTTP/0.9" status line as HTTP/1.0, as CPython's
  HTTPResponse.begin does (Lib/http/client.py:357); Grail's raised
  UnknownProtocol (test_urllib test_read_0_9).
* ftplib is CPython's, which urllib.request imports for an ftp: URL;
  Grail had no ftplib (test_ftp_nohost, test_ftp_nonexisting).
* test.support names TEST_HTTP_URL, which the urlretrieve tests pass to a
  faked connection (test_short_content_raises_ContentTooShortError).  Not
  checked here: a Linux CPython need not ship the test package, and this
  fixture runs under one in CI; test_urllib checks it.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import ftplib
import http.client
import io
import urllib.error
import urllib.request

r = {}


class FakeSocket:
    def __init__(self, data):
        self.data = data

    def makefile(self, mode, bufsize=None):
        return io.BytesIO(self.data)


def response(version):
    reply = http.client.HTTPResponse(
        FakeSocket(b'HTTP/' + version + b' 200 OK\r\nContent-Length: 6\r\n\r\nHello!'))
    try:
        reply.begin()
    except http.client.HTTPException as e:
        return '%s: %s' % (type(e).__name__, e)
    return reply.version, reply.status, reply.read()


def ftp_without_host():
    try:
        urllib.request.urlopen('ftp:///path')
    except urllib.error.URLError as e:
        return type(e).__name__, str(e.reason)


r['an_http_0_9_status_line_reads_as_1_0'] = [response(b'0.9'), response(b'1.0'), response(b'1.1')]
r['another_version_is_refused'] = response(b'2.0')
r['ftplib_is_cpythons'] = [ftplib.FTP_PORT, issubclass(ftplib.error_perm, ftplib.Error),
                           ftplib.all_errors[0] is ftplib.Error]
r['an_ftp_url_without_a_host_is_refused'] = ftp_without_host()

EXPECTED = {
    'an_http_0_9_status_line_reads_as_1_0': [(10, 200, b'Hello!'), (10, 200, b'Hello!'), (11, 200, b'Hello!')],
    'another_version_is_refused': 'UnknownProtocol: HTTP/2.0',
    'ftplib_is_cpythons': [21, True, True],
    'an_ftp_url_without_a_host_is_refused': ('URLError', 'ftp error: no host given'),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-40s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
