"""xml.sax is real now, apart from the parser -- and two io defects it found.

The old `xml.sax` was a deliberate three-function stub (escape, unescape,
quoteattr). Its docstring said `make_parser`, `ContentHandler`, `InputSource`
and the SAX exception hierarchy were ABSENT so that code needing a parser
"fails loudly at the name it wanted". CPython's own modules for all of that are
pure Python -- only the PARSER is C -- so they are vendored verbatim and the
loud failure now comes from the real driver at the real point:
`SAXReaderNotAvailable('No parsers found')`, which is exactly what CPython
raises when no parser module can be found.

XMLGenerator is a SERIALIZER, so it works in full without any parser, and it is
the larger half of what `xml.sax` is used for.

TWO REAL io DEFECTS turned up underneath it, both found by `_gettextwriter`:

1. `StringIO`/`BytesIO` had no `seekable`/`readable`/`writable`. The caller
   reads them inside `try: ... except AttributeError: pass`, so the missing
   method was SWALLOWED and the failure surfaced later as "unbound method
   'seekable' must be called with an instance" -- naming nothing that was
   actually wrong.

2. Grail's `StringIO` was outside `_pyio`'s ABC hierarchy, so
   `isinstance(StringIO(), io.TextIOBase)` was False. `_gettextwriter`'s FIRST
   branch is exactly that test, and it is the branch CPython takes. Falling
   past it landed in the path for objects that merely have `.write`, which
   builds an `io.BufferedIOBase()` by hand -- so `XMLGenerator(StringIO())`
   died inside machinery it should never have reached, reporting "write to
   closed file" about a stream that was open.

   An isinstance that is false for the wrong reason does not fail where it is
   wrong. It fails somewhere else entirely.

Every expectation here was read off CPython 3.14 first.
"""

import io

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


def _outcome(fn):
    try:
        return ('ok', fn())
    except BaseException as exc:
        return (type(exc).__name__, str(exc)[:60])


# ------------------------------------------- the io predicates exist

def _io_predicates():
    out = {}
    for cls in (io.StringIO, io.BytesIO):
        s = cls()
        out[cls.__name__] = _outcome(
            lambda s=s: (s.seekable(), s.readable(), s.writable(), s.isatty()))
        want = ('ok', (True, True, True, False))
        out[cls.__name__] = (out[cls.__name__] == want) or out[cls.__name__]
    # and they must be BOUND -- the bug was an unbound class attribute
    s = io.StringIO()
    out['bound_not_unbound'] = ((lambda f: f())(s.seekable) is True) or 'not bound'
    # the exact shape _gettextwriter uses
    holder = io.BytesIO()
    holder.seekable = s.seekable
    out['assignable'] = (holder.seekable() is True) or 'assignment broke it'
    return {k: v for k, v in out.items() if v is not True}


check('the_io_predicates_exist_and_bind', _io_predicates(), {})


# ------------------------- closed streams: CPython's own asymmetry

def _closed_behaviour():
    out = {}
    s = io.StringIO(); s.close()
    out['stringio_seekable'] = (_outcome(s.seekable)[0] == 'ValueError') or _outcome(s.seekable)
    # StringIO.flush on a CLOSED stream does NOT raise; BytesIO.flush DOES.
    # They are different types upstream and genuinely disagree.
    out['stringio_flush'] = (_outcome(s.flush) == ('ok', None)) or _outcome(s.flush)
    b = io.BytesIO(); b.close()
    out['bytesio_seekable'] = (_outcome(b.seekable)[0] == 'ValueError') or _outcome(b.seekable)
    out['bytesio_flush'] = (_outcome(b.flush)[0] == 'ValueError') or _outcome(b.flush)
    return {k: v for k, v in out.items() if v is not True}


check('a_closed_stream_matches_cpythons_asymmetry', _closed_behaviour(), {})


# ------------------------- the streams belong to _pyio's hierarchy

def _hierarchy():
    return {
        'stringio_is_textiobase': isinstance(io.StringIO(), io.TextIOBase),
        'bytesio_is_bufferediobase': isinstance(io.BytesIO(), io.BufferedIOBase),
    }


check('the_streams_are_in_the_io_hierarchy', _hierarchy(),
      {'stringio_is_textiobase': True, 'bytesio_is_bufferediobase': True})


# --------------------------------------- XMLGenerator serializes

def _xmlgen():
    from xml.sax.saxutils import XMLGenerator
    out = io.StringIO()
    g = XMLGenerator(out)
    g.startDocument()
    g.startElement('doc', {'a': '1'})
    g.characters('x < y & z')
    g.endElement('doc')
    g.endDocument()
    return out.getvalue()


check('xmlgenerator_serializes_to_a_stringio', _xmlgen(),
      '<?xml version="1.0" encoding="iso-8859-1"?>\n'
      '<doc a="1">x &lt; y &amp; z</doc>')


# NOT ASSERTED: XMLGenerator over a BytesIO. That path needs
# ``io.BufferedIOBase()``, and a zero-argument call written directly as
# ``module.Attr()`` currently returns the ATTRIBUTE instead of calling it --
# ``io.BufferedIOBase()`` answers the class, while ``C = io.BufferedIOBase;
# C()`` answers an instance. That is a defect in the module-attribute call
# path, not in xml.sax, and docs/Issues.md carries it with the isolation.
# Asserting it here would pin a bug rather than a behaviour.


def _xmlgen_reuses_a_text_stream():
    """The first branch of _gettextwriter: a TextIOBase is returned AS IS.

    This is the branch the hierarchy registration unlocks, and the one CPython
    takes for a StringIO -- so a second generator over the same stream appends
    rather than wrapping it twice.
    """
    from xml.sax.saxutils import XMLGenerator
    out = io.StringIO()
    XMLGenerator(out).startElement('a', {})
    XMLGenerator(out).endElement('a')
    return out.getvalue()


check('two_generators_share_one_text_stream',
      _xmlgen_reuses_a_text_stream(), '<a></a>')


# ------------------------------------------- the rest of the surface

def _surface():
    import xml.sax
    from xml.sax.xmlreader import AttributesImpl
    from xml.sax.saxutils import escape, unescape, quoteattr
    a = AttributesImpl({'a': '1', 'b': '2'})
    return {
        'attributes': (a.getLength(), a.getValue('a'), sorted(a.getNames())),
        'strings': (escape('<&>'), unescape('&lt;&amp;&gt;'), quoteattr('a"b')),
        'exceptions': issubclass(xml.sax.SAXParseException, xml.sax.SAXException),
        'handler': xml.sax.handler.feature_namespaces,
    }


check('the_documented_surface_is_present', _surface(), {
    'attributes': (2, '1', ['a', 'b']),
    'strings': ('&lt;&amp;&gt;', '<&>', "'a\"b'"),
    'exceptions': True,
    'handler': 'http://xml.org/sax/features/namespaces',
})


# ------------------- make_parser either WORKS or fails honestly

# Deliberately not "Grail has no parser": that would be a check which fails on
# CPython (it HAS one) and would need rewriting the day Grail gains one. The
# invariant worth pinning outlives both states -- make_parser must never
# quietly hand back something that cannot parse. Today Grail takes the second
# branch, with CPython's own no-parser error; CPython takes the first.

def _make_parser_is_honest():
    import xml.sax
    kind, value = _outcome(xml.sax.make_parser)
    if kind == 'ok':
        return 'a parser' if hasattr(value, 'parse') else 'USELESS OBJECT'
    return kind


check('make_parser_either_works_or_says_it_cannot',
      _make_parser_is_honest() in ('a parser', 'SAXReaderNotAvailable'), True)
