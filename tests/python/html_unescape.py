"""``html.unescape`` does not require the semicolon.

HTML has never required the terminator for a NUMERIC character reference,
and permits its absence for 106 LEGACY named ones.  Grail's scanner
searched ahead for a ``;`` within 32 characters and gave up if it found
none, so half of every pair below disagreed:

    &gt;  ->  '>'          &gt   ->  '&gt'      (CPython '>')
    &#123; -> '{'          &#123 ->  '&#123'    (CPython '{')

Six of test_htmlparser's seven failures were this one function; the
parser's own ``convert_charrefs`` path calls it.

THE TABLE'S SHAPE is half the fix.  CPython's ``html.entities.html5``
holds every entity under ``name;`` and the legacy ones AGAIN under the
bare ``name`` -- 2231 keys for 2125 entities.  Grail's held 2125 bare
names and nothing with a semicolon, which is wrong in both directions: a
lookup of ``gt;`` missed, and ``acE`` hit when only ``acE;`` should.  It
is regenerated from upstream now (scripts/generate_html5_entities.py), so
the lookup needs no special cases.

Every expectation was checked against CPython 3.14 first.
"""

import html
from html.parser import HTMLParser

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


# -- the semicolon is optional ------------------------------------------

def _unterminated():
    return [html.unescape(s) for s in
            ('&gt', '&#123', '&#xab', '&quot', '&#34', '&#x22', '&amp')]


def _terminated_still_works():
    return [html.unescape(s) for s in
            ('&gt;', '&#123;', '&#xab;', '&quot;', '&#34;', '&#x22;', '&amp;')]


check('unterminated', _unterminated(),
      ['>', '{', '\xab', '"', '"', '"', '&'])
check('terminated_still_works', _terminated_still_works(),
      ['>', '{', '\xab', '"', '"', '"', '&'])


# -- but only for the LEGACY names --------------------------------------
#
# ``acE`` is not one of the 106, so only ``acE;`` is a key and the bare
# form stays literal.  This is the half a bare-names-only table gets
# wrong, and it is why the table was regenerated rather than patched.

def _legacy_versus_not():
    return (html.unescape('&acE'), html.unescape('&acE;'),
            html.unescape('&AMP'), html.unescape('&Amp'),
            html.unescape('&undefined'), html.unescape('&g'))


check('legacy_versus_not', _legacy_versus_not(),
      ('&acE', '∾̳', '&', '&Amp', '&undefined', '&g'))


# -- an exact hit wins, then the longest prefix -------------------------

def _longest_prefix():
    return (html.unescape('&notit;'), html.unescape('&notin;'),
            html.unescape('&not'), html.unescape('&notit'),
            html.unescape('&noti'), html.unescape('&gtcc'),
            html.unescape('&ampe'))


check('longest_prefix', _longest_prefix(),
      ('\xacit;', '∉', '\xac', '\xacit', '\xaci', '>cc', '&e'))


# -- numeric references get three corrections ---------------------------
#
# The Windows-1252 fixups the standard mandates, U+FFFD for a surrogate
# or anything past U+10FFFF, and the empty string for the control and
# non-character ranges.

def _numeric_corrections():
    return (html.unescape('&#0'), html.unescape('&#13'),
            html.unescape('&#128'), html.unescape('&#1'),
            html.unescape('&#11'), html.unescape('&#xfdd0'),
            html.unescape('&#x110000'), html.unescape('&#55296'),
            html.unescape('&#0;'), html.unescape('&#x0'))


check('numeric_corrections', _numeric_corrections(),
      ('�', '\r', '€', '', '', '', '�', '�',
       '�', '�'))


# -- degenerate input stays literal -------------------------------------

def _degenerate():
    return [html.unescape(s) for s in
            ('&', '&#', '&#x', '&;', '& ', 'no refs here', '')]


check('degenerate', _degenerate(),
      ['&', '&#', '&#x', '&;', '& ', 'no refs here', ''])


# -- and the parser converts what unescape converts ---------------------

class Collector(HTMLParser):
    def __init__(self, **kw):
        self.events = []
        super().__init__(**kw)

    def handle_data(self, d):
        self.events.append(('data', d))

    def handle_entityref(self, n):
        self.events.append(('entityref', n))

    def handle_charref(self, n):
        self.events.append(('charref', n))


def _parser_converts(source, convert):
    p = Collector(convert_charrefs=convert)
    p.feed(source)
    p.close()
    return p.events


check('parser_converts_unterminated',
      _parser_converts('&gt', True), [('data', '>')])
check('parser_converts_unterminated_numeric',
      _parser_converts('&#123', True), [('data', '{')])
check('parser_events_when_not_converting',
      _parser_converts('&gt', False), [('entityref', 'gt')])
check('parser_charref_events',
      _parser_converts('&#123', False), [('charref', '123')])


# -- the regression half ------------------------------------------------
#
# unescape() is used by Django and markupsafe, so ordinary text has to
# come through untouched and the common escapes have to keep working.

def _ordinary_text():
    return [html.unescape(s) for s in
            ('<p>hello</p>', 'a &amp; b', '&lt;script&gt;',
             'x &nbsp; y', '100% &amp; more', 'Caf&eacute;',
             '&lt;&gt;&amp;&quot;&#39;')]


def _escape_is_untouched():
    return (html.escape('<a href="x">&</a>'),
            html.escape("it's", quote=False),
            html.escape("it's", quote=True))


def _round_trip():
    original = '<tag attr="v">a & b</tag>'
    return html.unescape(html.escape(original)) == original


check('ordinary_text', _ordinary_text(),
      ['<p>hello</p>', 'a & b', '<script>', 'x \xa0 y', '100% & more',
       'Caf\xe9', '<>&"\''])
check('escape_is_untouched', _escape_is_untouched(),
      ('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;', "it's",
       'it&#x27;s'))
check('round_trip', _round_trip(), True)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
