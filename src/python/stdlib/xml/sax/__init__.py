"""Grail xml.sax package -- a deliberately tiny subset.

CPython's ``xml/sax/__init__.py`` is a driver: it imports ``xmlreader``,
``handler`` and ``_exceptions``, and ``make_parser`` reaches on into
``xml.sax.expatreader`` and hence into the expat C extension.  None of that
is provided here, and none of it is needed by what actually asks for this
package.

What IS provided is ``xml.sax.saxutils`` -- ``escape``, ``unescape`` and
``quoteattr``, three pure string functions that have nothing to do with
parsing and that a surprising amount of code imports for that reason alone
(html5lib's serializer and sanitizer, bleach's sanitizer, django's
``utils.xmlutils``).  Importing this package therefore costs nothing and
binds no names.

Deliberately ABSENT, so that code needing a real SAX parser fails loudly at
the name it wanted rather than silently doing nothing: ``parse``,
``parseString``, ``make_parser``, ``InputSource``, ``ContentHandler``,
``ErrorHandler``, and the ``SAX*Exception`` hierarchy.
"""
