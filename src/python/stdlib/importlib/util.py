# Minimal `importlib.util` Python facade for Grail.  Re-exports the
# few helpers Jinja2 / Werkzeug touch from the parent ``importlib``
# package, which is itself a stub over Grail's Smalltalk loader.

from . import find_spec, _ModuleSpec, _Loader


def spec_from_file_location(name, location, **kwargs):
    return _ModuleSpec(name, _Loader(location), location)
