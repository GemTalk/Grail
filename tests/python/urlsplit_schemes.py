"""urlsplit reads a scheme that carries no authority, and urlunsplit writes one back.

Grail's urlsplit split on "://" alone, so EVERY URL whose scheme carries no
authority lost its scheme and answered the whole string as a PATH:

    urlsplit('mailto:me@example.com')  ->  ('', '', 'mailto:me@example.com', '', '')

A scheme is not the "://".  It is everything before the first colon, when that
is a letter followed by letters, digits, "+", "-" or "." -- so "file:/srv/x",
"file:relative", "data:text/plain,hi" and "urn:isbn:1" all have one, and
"1http://x" does not, because a scheme cannot start with a digit.  The
authority is still only read after "//".

urlunsplit had the matching defect: it wrote "scheme://" unconditionally,
which turns "mailto:me@x" into "mailto://me@x".  It writes "//" only when
there IS an authority, or when the scheme is one that always carries one
(uses_netloc, the list Werkzeug appends to at import time) and the path could
otherwise be read as a relative reference.

Found through pathlib: urllib.request.url2pathname builds "file:" + url and
splits it, so Path.from_uri could not work until this was right.

Every expectation here was measured against CPython 3.14.
"""

from urllib.parse import urlsplit, urlunsplit

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:160])


def _split(url, *args):
    return tuple(urlsplit(url, *args))


# ----------------------------------------------------------- the scheme

check('a_scheme_with_no_authority_is_still_a_scheme',
      (_split('file:/srv/x'), _split('file:relative')),
      (('file', '', '/srv/x', '', ''), ('file', '', 'relative', '', '')))
check('mailto_data_and_urn_keep_their_schemes',
      (_split('mailto:me@example.com'), _split('data:text/plain,hi'),
       _split('urn:isbn:1')),
      (('mailto', '', 'me@example.com', '', ''),
       ('data', '', 'text/plain,hi', '', ''),
       ('urn', '', 'isbn:1', '', '')))
check('a_scheme_is_lowercased_and_the_authority_is_not',
      _split('HTTP://H/p'), ('http', 'H', '/p', '', ''))
check('a_scheme_cannot_start_with_a_digit',
      _split('1http://x'), ('', '', '1http://x', '', ''))
check('a_scheme_may_hold_plus_minus_and_dot',
      _split('a+b-c.d:z'), ('a+b-c.d', '', 'z', '', ''))
check('a_path_with_a_colon_in_it_is_not_a_scheme',
      _split('/just/a/path'), ('', '', '/just/a/path', '', ''))
check('the_default_scheme_argument_still_applies',
      _split('/p', 'http'), ('http', '', '/p', '', ''))

# ----------------------------------------------------------- the authority

check('an_authority_needs_the_double_slash',
      (_split('//host/path'), _split('http://h')),
      (('', 'host', '/path', '', ''), ('http', 'h', '', '', '')))
check('the_query_and_fragment_are_taken_off_after_the_authority',
      (_split('http://h/p?q#f'), _split('http://h#f/x')),
      (('http', 'h', '/p', 'q', 'f'), ('http', 'h', '', '', 'f/x')))

# ----------------------------------------------------------- urlunsplit

check('urlunsplit_writes_an_authority_only_where_there_is_one',
      (urlunsplit(('http', 'h', 'p', '', '')),
       urlunsplit(('mailto', '', 'me@x', '', '')),
       urlunsplit(('http', 'h', '', '', ''))),
      ('http://h/p', 'mailto:me@x', 'http://h'))
check('urlunsplit_gives_a_netloc_scheme_its_empty_authority',
      (urlunsplit(('file', '', '/t', '', '')),
       urlunsplit(('file', '', 'rel', '', ''))),
      ('file:///t', 'file:rel'))
check('urlunsplit_keeps_a_path_that_looks_like_an_authority_apart',
      urlunsplit(('', '', '//x', '', '')), '////x')
check('every_url_survives_a_round_trip',
      [urlunsplit(urlsplit(u)) for u in
       ('mailto:me@x', 'file:///srv/x', 'http://h/p?q#f', '//host/p',
        '/plain/path', 'data:text/plain,hi', 'urn:isbn:1')],
      ['mailto:me@x', 'file:///srv/x', 'http://h/p?q#f', '//host/p',
       '/plain/path', 'data:text/plain,hi', 'urn:isbn:1'])
check('a_scheme_relative_file_url_gains_its_empty_authority',
      urlunsplit(urlsplit('file:/srv/x')), 'file:///srv/x')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
