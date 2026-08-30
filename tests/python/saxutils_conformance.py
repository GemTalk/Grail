"""``xml.sax.saxutils`` -- escape / unescape / quoteattr, against CPython.

Grail's ``xml/sax/saxutils.py`` is a cut-down copy of CPython 3.14's: the three
pure string functions and their shared ``__dict_replace`` helper, verbatim, with
the parser-facing classes (XMLGenerator, XMLFilterBase, prepare_input_source)
left out because Grail has no SAX reader for them to sit on.  A verbatim copy is
easy to *claim* and easy to get subtly wrong once the code is re-typed, so every
expectation below is measured rather than asserted from memory -- this file
imports ``xml.sax.saxutils`` and, run under CPython, checks the real one.

The behaviours that are not obvious from the names, and that a re-implementation
gets wrong:

* ``escape`` must do ``&`` FIRST, or ``<`` becomes ``&amp;lt;`` twice over;
  ``unescape`` must do ``&amp;`` LAST, for the mirror-image reason.  So
  ``unescape(escape(s)) == s`` while a naive ordering breaks on ``'&lt;'``.
* the ``entities`` mapping is applied AFTER the built-in three in ``escape`` and
  BEFORE ``&amp;`` in ``unescape``, and its keys are applied in dict order.
* ``quoteattr`` picks its quote character from the DATA: double quotes normally,
  single quotes when the data contains ``"`` but no ``'``, and double quotes with
  ``&quot;`` when it contains both.
* ``quoteattr`` also escapes newline, carriage return and tab -- and its own
  three mappings WIN over a caller-supplied ``entities`` for those keys, because
  they come last in ``{**entities, '\\n': ..., '\\r': ..., '\\t': ...}``.

Every check runs identically under CPython and under Grail; the fixture gate
(``scripts/check_python_fixtures.sh``) runs it under CPython.
"""

from xml.sax.saxutils import escape, unescape, quoteattr

RESULTS = {}


def check(name, fn, expected):
    try:
        actual = fn()
    except BaseException as exc:            # noqa: BLE001 - reported, not raised
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)
        return
    RESULTS[name] = True if actual == expected else 'got %r want %r' % (
        actual, expected)


# --------------------------------------------------------------- escape

check('escape_plain', lambda: escape('hello'), 'hello')
check('escape_empty', lambda: escape(''), '')
check('escape_lt_gt', lambda: escape('<div>'), '&lt;div&gt;')
check('escape_amp', lambda: escape('AT&T'), 'AT&amp;T')
check('escape_all_three', lambda: escape('<a & b>'), '&lt;a &amp; b&gt;')

# Ampersand first: an already-escaped entity is escaped again, once.
check('escape_ampersand_first', lambda: escape('&lt;'), '&amp;lt;')
check('escape_double_applied', lambda: escape(escape('<')), '&amp;lt;')

# quote characters are NOT escaped by escape() -- that is quoteattr's job.
check('escape_leaves_quotes', lambda: escape('he said "hi" \'ok\''),
      'he said "hi" \'ok\'')

# ...unless you ask, via entities.
check('escape_entities', lambda: escape('"x"', {'"': '&quot;'}),
      '&quot;x&quot;')
check('escape_entities_after_builtins',
      lambda: escape('&', {'&amp;': 'AMP'}), 'AMP')
check('escape_entities_empty_dict', lambda: escape('<', {}), '&lt;')

# The entities mapping is applied key by key, in dict order, so a later key
# can rewrite what an earlier one produced.
check('escape_entities_are_ordered',
      lambda: escape('z', {'z': 'y', 'y': 'x'}), 'x')
check('escape_entities_reverse_order',
      lambda: escape('z', {'y': 'x', 'z': 'y'}), 'y')

# Entities see the ALREADY-escaped text, not the input: a '<' key matches
# nothing, because escape() turned it into '&lt;' before the mapping ran.
check('escape_entities_see_escaped_text',
      lambda: escape('<', {'<': 'LT'}), '&lt;')

# The default {} is not a shared mutable that leaks between calls.
check('escape_default_entities_isolated',
      lambda: (escape('&', {'&amp;': 'AMP'}), escape('&')), ('AMP', '&amp;'))


# ------------------------------------------------------------- unescape

check('unescape_plain', lambda: unescape('hello'), 'hello')
check('unescape_empty', lambda: unescape(''), '')
check('unescape_lt_gt', lambda: unescape('&lt;div&gt;'), '<div>')
check('unescape_amp', lambda: unescape('AT&amp;T'), 'AT&T')
check('unescape_all_three', lambda: unescape('&lt;a &amp; b&gt;'), '<a & b>')

# Ampersand LAST: '&amp;lt;' must come back as the text '&lt;', not as '<'.
check('unescape_ampersand_last', lambda: unescape('&amp;lt;'), '&lt;')

# Entities are applied before the final &amp; pass.
check('unescape_entities', lambda: unescape('&quot;x&quot;', {'&quot;': '"'}),
      '"x"')
check('unescape_entities_before_amp',
      lambda: unescape('&amp;quot;', {'&quot;': '"'}), '&quot;')
check('unescape_entities_empty_dict', lambda: unescape('&lt;', {}), '<')

# Unknown entities are left exactly as they are -- unescape is not a parser.
check('unescape_leaves_unknown', lambda: unescape('&nbsp;&#65;'),
      '&nbsp;&#65;')

check('unescape_default_entities_isolated',
      lambda: (unescape('&x;', {'&x;': 'X'}), unescape('&x;')),
      ('X', '&x;'))

# Round trip, including the ordering trap.
check('round_trip_plain', lambda: unescape(escape('a<b>c&d')), 'a<b>c&d')
check('round_trip_entity_text', lambda: unescape(escape('&lt;')), '&lt;')
check('round_trip_all_ascii_punct',
      lambda: unescape(escape('<>&"\'`~!@#$%^*()')), '<>&"\'`~!@#$%^*()')


# ------------------------------------------------------------ quoteattr

check('quoteattr_plain', lambda: quoteattr('hello'), '"hello"')
check('quoteattr_empty', lambda: quoteattr(''), '""')
check('quoteattr_escapes_markup', lambda: quoteattr('<a & b>'),
      '"&lt;a &amp; b&gt;"')

# Quote selection is driven by the data.
check('quoteattr_single_only', lambda: quoteattr("it's"), '"it\'s"')
check('quoteattr_double_only', lambda: quoteattr('say "hi"'),
      "'say \"hi\"'")
check('quoteattr_both_quotes', lambda: quoteattr('it\'s "hi"'),
      '"it\'s &quot;hi&quot;"')

# Whitespace becomes numeric character references.
check('quoteattr_newline', lambda: quoteattr('a\nb'), '"a&#10;b"')
check('quoteattr_carriage_return', lambda: quoteattr('a\rb'), '"a&#13;b"')
check('quoteattr_tab', lambda: quoteattr('a\tb'), '"a&#9;b"')
check('quoteattr_all_whitespace', lambda: quoteattr('\n\r\t'),
      '"&#10;&#13;&#9;"')
# A plain space is NOT escaped.
check('quoteattr_space_untouched', lambda: quoteattr('a b'), '"a b"')

# Caller entities are honoured...
check('quoteattr_entities', lambda: quoteattr('x', {'x': 'Y'}), '"Y"')
# ...but quoteattr's own \n, \r, \t mappings come last and therefore win.
check('quoteattr_builtin_entities_win',
      lambda: quoteattr('a\nb', {'\n': 'NL'}), '"a&#10;b"')

# The double-quote decision is made AFTER escaping, so a quote introduced by
# an entity still selects the quote character.
check('quoteattr_entity_introduced_quote',
      lambda: quoteattr('x', {'x': '"'}), '\'"\'')

check('quoteattr_default_entities_isolated',
      lambda: (quoteattr('x', {'x': 'Y'}), quoteattr('x')), ('"Y"', '"x"'))

# What html5lib's serializer actually does with an attribute value.
check('quoteattr_realistic_url',
      lambda: quoteattr('http://x/?a=1&b=2'), '"http://x/?a=1&amp;b=2"')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
