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


_MASK64 = 0xFFFFFFFFFFFFFFFF


def _rotl64(x, b):
    return ((x << b) | (x >> (64 - b))) & _MASK64


def _siphash13(k0, k1, data):
    """SipHash-1-3 of ``data`` under the key (k0, k1), as a 64-bit int.

    CPython's _Py_KeyedHash (Python/pyhash.c), which source_hash calls with
    k1 = 0: one compression round per 8-byte block, three finalization
    rounds, little-endian throughout.
    """
    v0 = k0 ^ 0x736f6d6570736575
    v1 = k1 ^ 0x646f72616e646f6d
    v2 = k0 ^ 0x6c7967656e657261
    v3 = k1 ^ 0x7465646279746573

    def sipround():
        nonlocal v0, v1, v2, v3
        v0 = (v0 + v1) & _MASK64
        v1 = _rotl64(v1, 13) ^ v0
        v0 = _rotl64(v0, 32)
        v2 = (v2 + v3) & _MASK64
        v3 = _rotl64(v3, 16) ^ v2
        v0 = (v0 + v3) & _MASK64
        v3 = _rotl64(v3, 21) ^ v0
        v2 = (v2 + v1) & _MASK64
        v1 = _rotl64(v1, 17) ^ v2
        v2 = _rotl64(v2, 32)

    n = len(data)
    end = n - n % 8
    for i in range(0, end, 8):
        m = int.from_bytes(data[i:i + 8], 'little')
        v3 ^= m
        sipround()
        v0 ^= m
    last = ((n & 0xFF) << 56) | int.from_bytes(data[end:], 'little')
    v3 ^= last
    sipround()
    v0 ^= last
    v2 ^= 0xFF
    sipround()
    sipround()
    sipround()
    return v0 ^ v1 ^ v2 ^ v3


def source_hash(source_bytes):
    """The 8-byte hash CPython writes into a hash-based .pyc for this source.

    SipHash-1-3 keyed with the magic number, as CPython's _imp.source_hash
    computes it, so the bytes match CPython's for the same source.  Grail
    writes no bytecode; pytest 9.2's assertion rewriting calls this, and
    without it pytest could not load its plugins at all (issue #2299).
    """
    try:
        data = memoryview(source_bytes).tobytes()
    except TypeError:
        raise TypeError('a bytes-like object is required, not %r'
                        % type(source_bytes).__name__) from None
    key = int.from_bytes(MAGIC_NUMBER, 'little')
    return _siphash13(key, 0, data).to_bytes(8, 'little')
