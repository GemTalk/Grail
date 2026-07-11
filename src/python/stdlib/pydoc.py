# GRAIL pydoc stub: test_enum imports it at module scope for
# render_doc/plain in a handful of tests.


def plain(text):
    return text


def render_doc(thing, title='Python Library Documentation: %s', forceload=0):
    doc = getattr(thing, '__doc__', None) or ''
    name = getattr(thing, '__name__', str(thing))
    return (title % name) + '\n\n' + str(doc)


def getdoc(obj):
    return getattr(obj, '__doc__', None) or ''
