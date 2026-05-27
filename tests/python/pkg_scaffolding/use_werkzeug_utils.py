# Probe for Werkzeug Step 9 — werkzeug.utils.
#
# werkzeug.utils ships as a hand-rolled minimal shim, not a
# source-drop of upstream.  Upstream depends on full ``**kwargs''
# call-site unpacking + the descriptor protocol, neither of which
# Grail supports yet.  The shim provides the names that downstream
# Werkzeug + the Flask demo path import:
#
#   cached_property, redirect, header_property, environ_property,
#   import_string, find_modules
#
# See ``src/python/stdlib/werkzeug/utils.py'' header for the
# rationale.  When ``**kwargs'' unpacking lands, the upstream
# source-drop becomes viable (`utils_upstream.py.bak'' kept
# alongside).


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
    """cached_property(func, name=, doc=) returns a descriptor that
    stashes the wrapped function on .func.  Kwargs reach __init__
    so .__name__ ends up as ``'producer'''."""
    import werkzeug.utils as wu

    def producer(self):
        return 'cached'

    cp = wu.cached_property(producer, name='producer', doc='d')
    return cp.func is producer and cp.__name__ == 'producer'


def import_string_finds_module():
    """import_string('werkzeug.utils') returns the loaded module."""
    import werkzeug.utils as wu
    mod = wu.import_string('werkzeug.utils')
    return mod is wu


def find_modules_is_empty():
    """find_modules returns an empty iterator (Grail has no
    filesystem-walking pkgutil yet)."""
    import werkzeug.utils as wu
    return list(wu.find_modules('werkzeug')) == []
