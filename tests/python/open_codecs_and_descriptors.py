"""open() arguments Grail dropped or refused, found by test_sax's ParseTest
and its binary-file tests.

  * text mode knew three encodings, strictly.  errors= was ignored, so a
    latin-1 file raised UnicodeEncodeError at the first character outside
    latin-1 even with errors='xmlcharrefreplace'; utf-16 and utf-8-sig were
    LookupError; and ascii silently wrote UTF-8;
  * a bytes path was opened under its repr (a name starting b'), so it was
    never found;
  * open(fd) was a TypeError for every descriptor, including one a Grail
    file's fileno() had just answered.

Non-ASCII text is spelled with chr() so that no tool rewrites it.  Every
expectation was measured against CPython 3.14.
"""

import os
import shutil
import tempfile

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:300])


DIR = tempfile.mkdtemp()
PATH = os.path.join(DIR, 'f.txt')
TEXT = '$' + chr(0xA3) + chr(0x20AC) + '\nz'


def written(encoding, errors=None):
    """The bytes open(..., 'w') puts on disk, and the text reading them back
    in the same encoding gives -- or the exception."""
    try:
        with open(PATH, 'w', encoding=encoding, errors=errors) as f:
            f.write(TEXT)
        with open(PATH, 'rb') as f:
            raw = f.read()
        with open(PATH, encoding=encoding) as f:
            return raw, f.read()
    except Exception as x:
        return type(x).__name__


check('text_mode_encodes_through_the_codec',
      [written('us-ascii', 'xmlcharrefreplace'),
       written('iso-8859-1', 'xmlcharrefreplace'),
       written('utf-16'), written('utf-16-be'), written('utf-8-sig'),
       written('cp1252'), written('us-ascii'), written('no-such-codec')],
      [(b'$&#163;&#8364;\nz', '$&#163;&#8364;\nz'),
       (b'$\xa3&#8364;\nz', '$' + chr(0xA3) + '&#8364;\nz'),
       (b'\xff\xfe$\x00\xa3\x00\xac \n\x00z\x00', TEXT),
       (b'\x00$\x00\xa3 \xac\x00\n\x00z', TEXT),
       (b'\xef\xbb\xbf$\xc2\xa3\xe2\x82\xac\nz', TEXT),
       (b'$\xa3\x80\nz', TEXT),
       'UnicodeEncodeError', 'LookupError'])


def _mode_and_encoding():
    with open(PATH, 'w', encoding='utf-16') as f:
        return f.mode, f.encoding


check('a_codec_text_file_reports_mode_and_encoding', _mode_and_encoding(),
      ('w', 'utf-16'))


def _bytes_path():
    with open(PATH, 'wb') as f:
        f.write(b'bytes path')
    with open(os.fsencode(PATH), 'rb') as f:
        return f.name == os.fsencode(PATH), f.read()


check('a_bytes_path_is_a_filesystem_name', _bytes_path(), (True, b'bytes path'))


def _shared_descriptor():
    with open(PATH, 'wb') as f:
        f.write(b'0123456789')
    with open(PATH, 'rb') as f:
        with open(f.fileno(), 'rb', closefd=False) as f2:
            shared = f2.read()
        # One position, shared: f2 left it at the end, so f reads nothing
        # there.  (Only where it ENDS UP is compared: how far a buffered
        # CPython file reads ahead is its own business.)  closefd=False left
        # the descriptor to f, which still works.
        at_end = f.read()
        f.seek(0)
        return shared, at_end, f.closed, f.read()


check('open_fd_shares_the_file', _shared_descriptor(),
      (b'0123456789', b'', False, b'0123456789'))


def _refusals():
    out = []
    for call in (lambda: open(PATH, 'rb', closefd=False),
                 lambda: open(-1, 'rb')):
        try:
            call()
            out.append('no error')
        except Exception as x:
            out.append((type(x).__name__, str(x)))
    return out


check('open_refuses_what_cpython_refuses', _refusals(),
      [('ValueError', 'Cannot use closefd=False with file name'),
       ('ValueError', 'negative file descriptor')])

shutil.rmtree(DIR)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else ascii(_v))
