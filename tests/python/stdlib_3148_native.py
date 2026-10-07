"""CPython 3.14.8 behaviour of zlib, exception members and libexpat 2.8.5.

- zlib.error carries libz's own explanation ("incorrect header check"),
  as CPython's zlib_error does; Grail stopped at "while decompressing data".
  3.14.8's new tests: flush() on a corrupt stream raises, flush() twice
  answers b'', and unconsumed_tail is empty after the end of the stream.
- Exception attributes CPython implements as plain members accept any value
  and are reset to None by ``del`` (3.14.8 test_exceptions
  test_object_attributes); __suppress_context__ refuses both.
- libexpat 2.8.5, which 3.14.8 bundles: an XML declaration's version must be
  ``1.[0-9]+``, and a UTF-16 high surrogate must be followed by a low one.
  Grail's pure-Python expat now parses the declaration as expat does, refuses
  characters XML does not allow, counts a byte-order mark as a column, and
  places a duplicate attribute at its name.

Every EXPECTED value was produced by running this file under CPython 3.14.8
with its bundled expat 2.8.5 (``--emit`` in the python:3.14.8-slim image).
A CPython linked against an older libexpat skips the checks whose answers
2.8.5 changed.
"""

import sys
import zlib

import pyexpat

_EXPAT_285 = (sys.implementation.name == 'grail'
              or pyexpat.version_info >= (2, 8, 5))
_EXPAT_285_KEYS = {'expat_versions', 'expat_surrogates',
                   'expat_text_declarations'}


def _zlib_error(func):
    try:
        func()
    except zlib.error as e:
        return str(e)
    return 'no error'


def _zlib():
    x = b'x\x9cK\xcb\xcf\x07\x00\x02\x82\x01E'          # 'foo'
    dco = zlib.decompressobj()
    first = dco.decompress(x[:-1] + b'\x00', 1)
    corrupt_flush = _zlib_error(dco.flush)
    dco = zlib.decompressobj()
    twice = (dco.decompress(x), dco.flush(), dco.flush())
    dco = zlib.decompressobj()
    data = dco.decompress(zlib.compress(b'abcdefghijklmnopqrstuvwxyz')
                          + b'0123456789', 1)
    data += dco.decompress(dco.unconsumed_tail)
    tail = (dco.eof, data, dco.unconsumed_tail, dco.unused_data)
    messages = [_zlib_error(lambda b=b: zlib.decompress(b)) for b in (
        b'garbage!!', b'x\x9c\xff\xff\xff\xff',
        zlib.compress(b'hi')[:-2] + b'\0\0', zlib.compress(b'hello')[:-3])]
    return (first, corrupt_flush, twice, tail, messages)


def _members():
    cases = [(SyntaxError('m'), n) for n in (
        'msg', 'filename', 'lineno', 'offset', 'end_lineno', 'end_offset',
        'text', 'print_file_and_line', '_metadata')]
    cases += [(ImportError('m'), n) for n in ('msg', 'name', 'path',
                                              'name_from')]
    cases += [(SystemExit(1), 'code'), (StopIteration(7), 'value'),
              (NameError('m'), 'name'), (AttributeError('m'), 'name'),
              (AttributeError('m'), 'obj')]
    cases += [(OSError(2, 'm'), n) for n in ('errno', 'strerror', 'filename',
                                             'filename2')]
    cases += [(UnicodeDecodeError('utf-8', b'\xff', 0, 1, 'r'), 'reason')]
    out = []
    for exc, name in cases:
        stored = []
        for value in ('s', 42, [1, 2], None):
            setattr(exc, name, value)
            stored.append(getattr(exc, name) == value)
        delattr(exc, name)
        out.append((type(exc).__name__, name, all(stored),
                    getattr(exc, name)))
    return out


def _suppress_context():
    e = Exception()
    out = [e.__suppress_context__]
    for action in (lambda: setattr(e, '__suppress_context__', 1),
                   lambda: delattr(e, '__suppress_context__')):
        try:
            action()
            out.append('accepted')
        except TypeError as x:
            out.append(str(x))
    return out


def _expat(data):
    p = pyexpat.ParserCreate()
    try:
        p.Parse(data, True)
        return 'ok'
    except pyexpat.ExpatError as e:
        return (pyexpat.ErrorString(e.code), e.lineno, e.offset)


def _expat_versions():
    return [_expat(('<?xml version="%s"?><a/>' % v).encode()) for v in (
        '1.0', '1.1', '1.10', '', '1', '1.', '2.0', '1.0a', ' 1.0', '1.x')]


def _expat_declarations():
    return [_expat(d.encode()) for d in (
        '<?xml version = "1.0" ?><a/>',
        "<?xml version='1.0' encoding='utf-8' standalone='yes'?><a/>",
        '<?xml version="1.0" standalone="maybe"?><a/>',
        '<?xml version="1.0" encoding="8bit"?><a/>',
        '<?xml encoding="utf-8"?><a/>',
        '<?xml version="1.0" standalone="no" encoding="utf-8"?><a/>',
        '<?xml version="1.0" junk="1"?><a/>',
        '<?xml version="1.0"x?><a/>',
        '<?xml?><a/>',
        '<?xml version="1.0"\n   encoding="utf-8" ?><a/>')]


def _expat_characters():
    out = []
    for bom, enc in ((b'', 'utf-8'), (b'\xef\xbb\xbf', 'utf-8'),
                     (b'\xff\xfe', 'utf-16-le'), (b'\xfe\xff', 'utf-16-be')):
        for doc in ('<a>x\x01</a>', '<a>\n\x01</a>', '<a>\ufffe</a>',
                    '<a><![CDATA[\x02]]></a>', '<a x="\x03"/>',
                    '<a><b></a>', '<a b="1" b="2"/>'):
            out.append(_expat(bom + doc.encode(enc)))
    return out


def _expat_surrogates():
    def utf16(enc, text):
        return text.encode(enc, 'surrogatepass')
    return [_expat(b'\xff\xfe' + utf16('utf-16-le', '<a>x\ud800y</a>')),
            _expat(b'\xff\xfe' + utf16('utf-16-le', '<a>x\U0001F600y</a>')),
            _expat(b'\xff\xfe' + utf16('utf-16-le', '<a>x\udc00y</a>')),
            _expat(b'\xfe\xff' + utf16('utf-16-be', '<a>x\udc00</a>')),
            _expat(utf16('utf-16-le', '<a>x\udc00</a>'))]


def _expat_text_declarations():
    """An external entity opens with a TEXT declaration: the version is
    optional and the encoding required."""
    out = []
    for decl in ('<?xml encoding="utf-8"?>',
                 '<?xml version="1.0" encoding="utf-8"?>',
                 '<?xml version="1.0"?>',
                 '<?xml version="2.0" encoding="utf-8"?>',
                 '<?xml encoding="utf-8" standalone="yes"?>'):
        p = pyexpat.ParserCreate()
        got = []

        def external(context, base, system_id, public_id, decl=decl, p=p,
                     got=got):
            child = p.ExternalEntityParserCreate(context)
            try:
                child.Parse((decl + 'text').encode(), True)
                got.append('ok')
            except pyexpat.ExpatError as e:
                got.append((pyexpat.ErrorString(e.code), e.lineno, e.offset))
            return 1

        p.ExternalEntityRefHandler = external
        p.Parse(b'<!DOCTYPE a [<!ENTITY e SYSTEM "e.xml">]><a>&e;</a>', True)
        out.append(got)
    return out


def _results():
    return {
        'expat_text_declarations': _expat_text_declarations(),
        'zlib': _zlib(),
        'members': _members(),
        'suppress_context': _suppress_context(),
        'expat_versions': _expat_versions(),
        'expat_declarations': _expat_declarations(),
        'expat_characters': _expat_characters(),
        'expat_surrogates': _expat_surrogates(),
    }


EXPECTED = {
    'expat_text_declarations': [['ok'], ['ok'], [('text declaration not well-formed', 1, 19)], [('text declaration not well-formed', 1, 15)], [('text declaration not well-formed', 1, 23)]],
    'zlib': (b'f', 'Error -3 while decompressing data: incorrect data check', (b'foo', b'', b''), (True, b'abcdefghijklmnopqrstuvwxyz', b'', b'0123456789'), ['Error -3 while decompressing data: incorrect header check', 'Error -3 while decompressing data: invalid block type', 'Error -3 while decompressing data: incorrect data check', 'Error -5 while decompressing data: incomplete or truncated stream']),
    'members': [('SyntaxError', 'msg', True, None), ('SyntaxError', 'filename', True, None), ('SyntaxError', 'lineno', True, None), ('SyntaxError', 'offset', True, None), ('SyntaxError', 'end_lineno', True, None), ('SyntaxError', 'end_offset', True, None), ('SyntaxError', 'text', True, None), ('SyntaxError', 'print_file_and_line', True, None), ('SyntaxError', '_metadata', True, None), ('ImportError', 'msg', True, None), ('ImportError', 'name', True, None), ('ImportError', 'path', True, None), ('ImportError', 'name_from', True, None), ('SystemExit', 'code', True, None), ('StopIteration', 'value', True, None), ('NameError', 'name', True, None), ('AttributeError', 'name', True, None), ('AttributeError', 'obj', True, None), ('FileNotFoundError', 'errno', True, None), ('FileNotFoundError', 'strerror', True, None), ('FileNotFoundError', 'filename', True, None), ('FileNotFoundError', 'filename2', True, None), ('UnicodeDecodeError', 'reason', True, None)],
    'suppress_context': [False, 'attribute value type must be bool', "can't delete numeric/char attribute"],
    'expat_versions': ['ok', 'ok', 'ok', ('XML declaration not well-formed', 1, 15), ('XML declaration not well-formed', 1, 15), ('XML declaration not well-formed', 1, 15), ('XML declaration not well-formed', 1, 15), ('XML declaration not well-formed', 1, 15), ('XML declaration not well-formed', 1, 15), ('XML declaration not well-formed', 1, 15)],
    'expat_declarations': ['ok', 'ok', ('XML declaration not well-formed', 1, 32), ('XML declaration not well-formed', 1, 30), ('XML declaration not well-formed', 1, 6), ('XML declaration not well-formed', 1, 36), ('XML declaration not well-formed', 1, 20), ('XML declaration not well-formed', 1, 19), ('XML declaration not well-formed', 1, 5), 'ok'],
    'expat_characters': [('not well-formed (invalid token)', 1, 4), ('not well-formed (invalid token)', 2, 0), ('not well-formed (invalid token)', 1, 3), ('not well-formed (invalid token)', 1, 12), ('not well-formed (invalid token)', 1, 6), ('mismatched tag', 1, 8), ('duplicate attribute', 1, 9), ('not well-formed (invalid token)', 1, 5), ('not well-formed (invalid token)', 2, 0), ('not well-formed (invalid token)', 1, 4), ('not well-formed (invalid token)', 1, 13), ('not well-formed (invalid token)', 1, 7), ('mismatched tag', 1, 9), ('duplicate attribute', 1, 10), ('not well-formed (invalid token)', 1, 5), ('not well-formed (invalid token)', 2, 0), ('not well-formed (invalid token)', 1, 4), ('not well-formed (invalid token)', 1, 13), ('not well-formed (invalid token)', 1, 7), ('mismatched tag', 1, 9), ('duplicate attribute', 1, 10), ('not well-formed (invalid token)', 1, 5), ('not well-formed (invalid token)', 2, 0), ('not well-formed (invalid token)', 1, 4), ('not well-formed (invalid token)', 1, 13), ('not well-formed (invalid token)', 1, 7), ('mismatched tag', 1, 9), ('duplicate attribute', 1, 10)],
    'expat_surrogates': [('not well-formed (invalid token)', 1, 5), 'ok', ('not well-formed (invalid token)', 1, 5), ('not well-formed (invalid token)', 1, 5), ('not well-formed (invalid token)', 1, 4)],
}

RESULTS = {k: (v == EXPECTED.get(k)
               or (k in _EXPAT_285_KEYS and not _EXPAT_285)
               or 'got: %r' % (v,))
           for k, v in _results().items()}


if __name__ == '__main__':
    if sys.argv[1:] == ['--emit']:
        for k, v in _results().items():
            print('    %r: %r,' % (k, v))
    else:
        for _name in sorted(RESULTS):
            _v = RESULTS[_name]
            print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
                  '' if _v is True else _v)
