# Minimal `importlib.util` Python facade for Grail.  Re-exports the
# few helpers Jinja2 / Werkzeug touch from the parent ``importlib``
# package, which is itself a stub over Grail's Smalltalk loader.

from . import find_spec, spec_from_loader, ModuleSpec, _ModuleSpec, _Loader


# CPython 3.14's bytecode magic.  Grail writes no bytecode; pytest writes this
# into its assertion-rewrite cache headers, and only compares it with itself.
MAGIC_NUMBER = (3627).to_bytes(2, 'little') + b'\r\n'


_POPULATE = object()


def spec_from_file_location(name, location=None, *, loader=None,
                            submodule_search_locations=_POPULATE):
    """A spec for a module at ``location``, as CPython builds it: the caller's
    ``loader`` is KEPT (pytest's assertion-rewriting hook passes itself, and
    must be the one asked to exec the module), and a package's search
    locations default to the file's directory when the loader says it is
    one."""
    import os
    if location is not None:
        location = os.fspath(location)
    if loader is None:
        loader = _Loader(location)
    if submodule_search_locations is _POPULATE:
        is_package = getattr(loader, 'is_package', None)
        search = None
        if is_package is not None:
            try:
                if is_package(name):
                    search = [os.path.dirname(location)]
            except ImportError:
                pass
    else:
        search = submodule_search_locations
    return _ModuleSpec(name, loader, location, search)


def module_from_spec(spec):
    """A new module for ``spec'', CPython's: the loader's ``create_module''
    makes it when it will (None means the default module), and a loader that
    has ``exec_module'' without ``create_module'' is refused.  The module gets
    the spec's attributes but is NOT executed and NOT entered in sys.modules
    -- the caller runs ``spec.loader.exec_module(module)''."""
    module = None
    if hasattr(spec.loader, 'create_module'):
        module = spec.loader.create_module(spec)
    elif hasattr(spec.loader, 'exec_module'):
        raise ImportError('loaders that define exec_module() '
                          'must also define create_module()')
    if module is None:
        import types
        module = types.ModuleType(spec.name)
    _init_module_attrs(spec, module)
    return module


def _init_module_attrs(spec, module):
    # CPython's _bootstrap._init_module_attrs without ``override'' and without
    # the namespace-package loader it invents for a loaderless package spec.
    if getattr(module, '__name__', None) is None:
        try:
            module.__name__ = spec.name
        except AttributeError:
            pass
    if getattr(module, '__loader__', None) is None:
        try:
            module.__loader__ = spec.loader
        except AttributeError:
            pass
    if getattr(module, '__package__', None) is None:
        try:
            module.__package__ = spec.parent
        except AttributeError:
            pass
    try:
        module.__spec__ = spec
    except AttributeError:
        pass
    if getattr(module, '__path__', None) is None:
        if spec.submodule_search_locations is not None:
            try:
                module.__path__ = spec.submodule_search_locations
            except AttributeError:
                pass
    if spec.has_location:
        if getattr(module, '__file__', None) is None:
            try:
                module.__file__ = spec.origin
            except AttributeError:
                pass
    return module


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
