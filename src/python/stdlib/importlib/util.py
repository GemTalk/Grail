# Minimal `importlib.util` Python facade for Grail.  Re-exports the
# few helpers Jinja2 / Werkzeug touch from the parent ``importlib``
# package, which is itself a stub over Grail's Smalltalk loader.

from . import find_spec, spec_from_loader, ModuleSpec, _ModuleSpec, _Loader


def spec_from_file_location(name, location, **kwargs):
    return _ModuleSpec(name, _Loader(location), location)


def cache_from_source(path, debug_override=None, *, optimization=None):
    """The bytecode-cache path CPython would use for a source file.

    Grail never writes bytecode caches -- modules are compiled straight to
    GemStone methods -- so nothing here reads or creates the file.  The function
    exists because callers ask it for the SHAPE of the path rather than for a
    file: test_reprlib's _check_path_limitations calls
    ``cache_from_source("x.py")`` purely to measure how much longer the cached
    path is than the source path, and without it five LongReprTest cases died at
    setup with AttributeError before reaching anything they were written to test.

    Implemented as the same pure path arithmetic CPython uses -- directory +
    __pycache__ + basename + tag + .pyc -- so the length it reports is the length
    CPython would report.  Answering something shorter would silently weaken the
    Windows path-limit guard that calls it.
    """
    import os
    import sys

    if debug_override is not None and optimization is not None:
        raise TypeError('cache_from_source() got both debug_override and '
                        'optimization')
    head, tail = os.path.split(path)
    base, sep, rest = tail.rpartition('.')
    tag = sys.implementation.cache_tag
    if tag is None:
        raise NotImplementedError('sys.implementation.cache_tag is None')
    almost_filename = (base if base else rest) + sep + tag
    if optimization is None:
        if debug_override is not None:
            optimization = '' if debug_override else 1
    if optimization is not None:
        opt = str(optimization)
        if opt != '':
            if not opt.isalnum():
                raise ValueError('{!r} is not alphanumeric'.format(optimization))
            almost_filename = '{}.opt-{}'.format(almost_filename, opt)
    return os.path.join(head, '__pycache__', almost_filename + '.pyc')
