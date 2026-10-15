# Probe for Werkzeug Step 9 — werkzeug.utils.
#
# werkzeug.utils is upstream Werkzeug 3.1.5's file (#1447).  It replaced a
# hand-rolled shim whose header_property / environ_property were not
# descriptors; this probe used to pin that shim's own answers
# (cached_property's ``.func'', an always-empty find_modules), and now pins
# upstream's.  The names downstream Werkzeug + the Flask demo path import:
#
#   cached_property, redirect, header_property, environ_property,
#   import_string, find_modules


def import_succeeded():
    import werkzeug.utils
    return werkzeug.utils.cached_property is not None


def public_surface_present():
    import werkzeug.utils as wu
    return (wu.cached_property is not None
            and wu.redirect is not None
            and wu.header_property is not None
            and wu.environ_property is not None
            and wu.import_string is not None
            and wu.find_modules is not None)


def cached_property_constructs():
    """cached_property(func, name=, doc=) is a property subclass: the
    wrapped function is its .fget, and the keywords reach __init__, so
    .__name__ is ``'producer''' and .__doc__ is ``'d'''."""
    import werkzeug.utils as wu

    def producer(self):
        return 'cached'

    cp = wu.cached_property(producer, name='producer', doc='d')
    return (cp.fget is producer and cp.__name__ == 'producer'
            and cp.__doc__ == 'd' and isinstance(cp, property))


def import_string_finds_module():
    """import_string('werkzeug.utils') returns the loaded module."""
    import werkzeug.utils as wu
    mod = wu.import_string('werkzeug.utils')
    return mod is wu


def find_modules_is_empty():
    """find_modules walks the package with pkgutil, as upstream's does:
    the vendored werkzeug's top-level modules, and its subpackages only
    when asked for.  (The name is historical: the shim's answer was
    empty.)"""
    import werkzeug.utils as wu
    found = list(wu.find_modules('werkzeug'))
    with_packages = list(wu.find_modules('werkzeug', include_packages=True))
    return ('werkzeug.utils' in found and 'werkzeug._internal' in found
            and 'werkzeug.routing' not in found
            and 'werkzeug.routing' in with_packages)
