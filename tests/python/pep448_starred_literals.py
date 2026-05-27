# Regression fixture for PEP 448 starred unpacking inside literals.
#
# CURRENTLY EXPECTED-FAILING — Grail's parser doesn't support
# ``(*iterable, x, y)'' / ``[*iterable, x, y]'' / ``{*iterable, x}''.
# Werkzeug.urls hits this idiom (``bytes((*range(0x21), 0x25, 0x7F))'')
# and has been worked around in-place via an explicit list build.
#
# When the parser learns starred-unpacking in literals, this
# fixture's ``compiles'' flag will flip to True and the
# corresponding test can assert real behavior.


def works_today():
    """Sanity: plain literals without starred unpacking are fine."""
    return (1, 2, 3)
