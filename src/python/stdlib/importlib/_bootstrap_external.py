"""The part of CPython's ``importlib._bootstrap_external`` that Grail needs.

CPython's real module is the filesystem import machinery -- path finders,
source loaders, bytecode caches.  Grail's importer is Smalltalk, so none of
that applies.  What DOES apply is one helper that ended up living here for
historical reasons and that the warning machinery calls on every
``warn_explicit(module_globals=...)``:

    _bless_my_loader(module_globals) -> the module's loader, or None

It is the compatibility layer between ``__loader__`` (the original) and
``__spec__.loader`` (its replacement).  ``_warnings.c`` calls it by importing
this module by name, which is why the DeprecationWarnings it raises are
reported against ``<frozen importlib._bootstrap_external>`` rather than
against the caller.

Kept here, in Python and unedited apart from the import line, because the
rules it encodes are fussier than they look and two of them depend on Python's
own comparison semantics -- ``in`` on a tuple uses ``==``, and the
disagreement test is ``!=`` rather than ``is not``.  Reimplementing it in
Smalltalk would mean reimplementing those too, and getting them subtly wrong.
"""

# CPython reaches the built-in module; Grail's warnings IS the implementation.
import warnings as _warnings


def _bless_my_loader(module_globals):
    """Helper function for _warnings.c

    See GH#97850 for details.
    """
    # 2022-10-06(warsaw): For now, this helper is only used in _warnings.c and
    # that use case only has the module globals.  This function could be
    # extended to accept either that or a module object.  However, in the
    # latter case, it would be better to raise certain exceptions when looking
    # at a module, which should have either a __loader__ or __spec__.loader.
    # For backward compatibility, it is possible that we'll get an empty
    # dictionary for the module globals, and that cannot raise an exception.
    if not isinstance(module_globals, dict):
        return None

    missing = object()
    loader = module_globals.get('__loader__', None)
    spec = module_globals.get('__spec__', missing)

    if loader is None:
        if spec is missing:
            # If working with a module:
            # raise AttributeError('Module globals is missing a __spec__')
            return None
        elif spec is None:
            raise ValueError('Module globals is missing a __spec__.loader')

    spec_loader = getattr(spec, 'loader', missing)

    if spec_loader in (missing, None):
        if loader is None:
            exc = AttributeError if spec_loader is missing else ValueError
            raise exc('Module globals is missing a __spec__.loader')
        _warnings.warn(
            'Module globals is missing a __spec__.loader',
            DeprecationWarning)
        spec_loader = loader

    assert spec_loader is not None
    if loader is not None and loader != spec_loader:
        _warnings.warn(
            'Module globals; __loader__ != __spec__.loader',
            DeprecationWarning)
        return loader

    return spec_loader
