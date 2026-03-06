
import html

# html.escape() replaces special characters with HTML entities.
dangerous = '<script>alert("xss")</script>'
safe = html.escape(dangerous)
print('Escaped: ' + safe)

# html.unescape() converts entities back to characters.
encoded = '&lt;b&gt;bold&lt;/b&gt;'
decoded = html.unescape(encoded)
print('Unescaped: ' + decoded)

# Round-trip: unescape(escape(s)) returns the original.
original = 'Price: $5 & tax < $1'
roundtripped = html.unescape(html.escape(original))
if roundtripped == original:
    print('Round-trip: OK')
else:
    print('Round-trip: FAILED')

# Numeric entities work too.
print('Decimal &#60; = ' + html.unescape('&#60;'))
print('Hex &#x3c; = ' + html.unescape('&#x3c;'))

# html.entities submodule provides entity dictionaries.
print('')
print('html.entities:')
print('  name2codepoint[amp] = ' + str(html.entities.name2codepoint['amp']))
print('  name2codepoint[theta] = ' + str(html.entities.name2codepoint['theta']))
print('  codepoint2name[60] = ' + html.entities.codepoint2name[60])
print('  entitydefs[lt] = ' + html.entities.entitydefs['lt'])

# Named entities from the full table work in unescape.
greek = html.unescape('&alpha;&beta;&gamma;')
print('  unescape(&alpha;&beta;&gamma;) = ')
print(greek)

# html5 dictionary provides the WHATWG HTML5 entity mappings.
print('')
print('html.entities.html5:')
print('  html5[lt] = ' + html.entities.html5['lt'])
print('  html5[amp] = ' + html.entities.html5['amp'])
print('  len(html5) = ' + str(len(html.entities.html5)))
