"""\
A library of useful helper classes to the SAX classes, for the
convenience of application and driver writers.
"""

# GRAIL: this is CPython 3.14's xml/sax/saxutils.py cut down to the three
# pure string functions -- escape, unescape, quoteattr -- copied VERBATIM,
# including the shared __dict_replace helper and the {} default arguments.
#
# Everything else in the upstream file needs machinery Grail's xml.sax does
# not have: XMLGenerator and XMLFilterBase subclass handler.ContentHandler
# and xmlreader.XMLFilterBase, and prepare_input_source drives
# urllib.request over an InputSource.  They are omitted rather than stubbed,
# so that code wanting them fails at the import with a clear NameError-shaped
# message instead of getting something that looks like a serializer.
#
# The three that remain are exactly what the real callers import: html5lib's
# serializer (escape) and filters/sanitizer (escape, unescape), and bleach's
# sanitizer (unescape).


def __dict_replace(s, d):
    """Replace substrings of a string using a dictionary."""
    for key, value in d.items():
        s = s.replace(key, value)
    return s

def escape(data, entities={}):
    """Escape &, <, and > in a string of data.

    You can escape other strings of data by passing a dictionary as
    the optional entities parameter.  The keys and values must all be
    strings; each key will be replaced with its corresponding value.
    """

    # must do ampersand first
    data = data.replace("&", "&amp;")
    data = data.replace(">", "&gt;")
    data = data.replace("<", "&lt;")
    if entities:
        data = __dict_replace(data, entities)
    return data

def unescape(data, entities={}):
    """Unescape &amp;, &lt;, and &gt; in a string of data.

    You can unescape other strings of data by passing a dictionary as
    the optional entities parameter.  The keys and values must all be
    strings; each key will be replaced with its corresponding value.
    """
    data = data.replace("&lt;", "<")
    data = data.replace("&gt;", ">")
    if entities:
        data = __dict_replace(data, entities)
    # must do ampersand last
    return data.replace("&amp;", "&")

def quoteattr(data, entities={}):
    """Escape and quote an attribute value.

    Escape &, <, and > in a string of data, then quote it for use as
    an attribute value.  The \" character will be escaped as well, if
    necessary.

    You can escape other strings of data by passing a dictionary as
    the optional entities parameter.  The keys and values must all be
    strings; each key will be replaced with its corresponding value.
    """
    entities = {**entities, '\n': '&#10;', '\r': '&#13;', '\t':'&#9;'}
    data = escape(data, entities)
    if '"' in data:
        if "'" in data:
            data = '"%s"' % data.replace('"', "&quot;")
        else:
            data = "'%s'" % data
    else:
        data = '"%s"' % data
    return data
