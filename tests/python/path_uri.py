"""Path.as_uri and Path.from_uri, and the urllib functions under them.

Both raised ImportError: pathlib does ``from urllib.request import
pathname2url'' (and url2pathname), and Grail's urllib.request -- which is
Grail's own minimal module, not CPython's -- had neither.

They are CPython 3.14's own now, POSIX branches only: everything they stand
on already worked here (os.path.splitroot, urllib.parse.quote/unquote/
urlsplit, sys.getfilesystemencoding and its encodeerrors), so what was
missing was the two functions themselves.

The shapes that look wrong and are not, each checked below:

  * an ABSOLUTE path becomes THREE slashes -- an explicitly empty authority,
    so that ``//host/x'' cannot be read as a URL authority;
  * a RELATIVE path keeps no slashes at all, and with add_scheme becomes
    ``file:a%20b'' rather than anything absolute;
  * the query and fragment of a file: URL are DISCARDED rather than decoded
    into the path, because urlsplit takes them off first.

Every expectation here was measured against CPython 3.14.
"""

import pathlib
from urllib.error import URLError
from urllib.request import pathname2url, url2pathname

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:160])


def _raised(fn, *args, **kwargs):
    try:
        fn(*args, **kwargs)
    except (URLError, ValueError) as exc:
        return (type(exc).__name__, getattr(exc, 'reason', None) or str(exc))
    return 'no error'


# ----------------------------------------------------------- pathname2url

check('an_absolute_path_gets_an_empty_authority',
      pathname2url('/a b/c'), '///a%20b/c')
check('add_scheme_puts_file_in_front',
      pathname2url('/a b/c', add_scheme=True), 'file:///a%20b/c')
check('a_relative_path_gains_no_slashes',
      (pathname2url('a b/c'), pathname2url('a b/c', add_scheme=True)),
      ('a%20b/c', 'file:a%20b/c'))
check('a_hash_or_a_question_mark_is_quoted',
      pathname2url('/a#b?c'), '///a%23b%3Fc')
check('a_non_ascii_name_is_quoted_as_utf_8',
      pathname2url('/é/x'), '///%C3%A9/x')
check('a_path_of_two_slashes_is_not_read_as_a_host',
      pathname2url('//a/b'), '////a/b')

# ----------------------------------------------------------- url2pathname

check('a_file_url_becomes_the_path_it_names',
      url2pathname('///a%20b/c'), '/a b/c')
check('an_authorityless_url_works_too',
      url2pathname('/a%20b/c'), '/a b/c')
check('require_scheme_takes_the_scheme_off',
      url2pathname('file:///a%20b/c', require_scheme=True), '/a b/c')
check('require_scheme_refuses_a_url_without_one',
      _raised(url2pathname, '/a', require_scheme=True),
      ('URLError', "URL is missing a 'file:' scheme"))
check('require_scheme_refuses_another_scheme',
      _raised(url2pathname, 'http://h/a', require_scheme=True),
      ('URLError', "URL is missing a 'file:' scheme"))
check('localhost_is_this_host',
      url2pathname('file://localhost/a', require_scheme=True), '/a')
check('another_host_is_refused',
      _raised(url2pathname, 'file://elsewhere/a', require_scheme=True),
      ('URLError', 'file:// scheme is supported only on localhost'))
check('a_query_and_a_fragment_are_discarded',
      url2pathname('file:///a?b=1#f', require_scheme=True), '/a')

# ----------------------------------------------------------- pathlib

check('as_uri_answers_the_file_url',
      pathlib.Path('/a b/c').as_uri(), 'file:///a%20b/c')
check('from_uri_answers_the_path',
      str(pathlib.Path.from_uri('file:///a%20b/c')), '/a b/c')
check('from_uri_answers_a_path_object',
      isinstance(pathlib.Path.from_uri('file:///a'), pathlib.Path), True)
check('as_uri_refuses_a_relative_path',
      _raised(pathlib.Path('rel').as_uri),
      ('ValueError', "relative paths can't be expressed as file URIs"))
check('from_uri_refuses_another_scheme',
      _raised(pathlib.Path.from_uri, 'http://h/a'),
      ('ValueError', "URL is missing a 'file:' scheme"))
check('from_uri_refuses_a_relative_uri',
      _raised(pathlib.Path.from_uri, 'file:a'),
      ('ValueError', "URI is not absolute: 'file:a'"))
check('a_path_survives_the_round_trip',
      str(pathlib.Path.from_uri(pathlib.Path('/a b/é#?').as_uri())),
      '/a b/é#?')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
