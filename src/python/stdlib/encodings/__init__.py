""" Standard "encodings" Package

    Standard Python encoding modules are stored in this package
    directory.

    Codec modules must have names corresponding to normalized encoding
    names as defined in the normalize_encoding() function below, e.g.
    'utf-8' must be implemented by the module 'utf_8.py'.

    Each codec module must export the following interface:

    * getregentry() -> codecs.CodecInfo object
    The getregentry() API must return a CodecInfo object with encoder, decoder,
    incrementalencoder, incrementaldecoder, streamwriter and streamreader
    attributes which adhere to the Python Codec Interface Standard.

    In addition, a module may optionally also define the following
    APIs which are then used by the package's codec search function:

    * getaliases() -> sequence of encoding name strings to use as aliases

    Alias names returned by getaliases() must be normalized encoding
    names as defined by normalize_encoding().

Written by Marc-Andre Lemburg (mal@lemburg.com).

(c) Copyright CNRI, All Rights Reserved. NO WARRANTY.

"""#"
#
# GRAIL: upstream CPython 3.14.6 with three differences.
#
#   1. The win32 code-page search function at the bottom is dropped -- it
#      needs ``codecs.code_page_encode``, a Windows-only C entry point.
#
#   2. ``__import__`` is called positionally, the spelling Grail's import
#      builtin takes elsewhere in the stdlib, and the fromlist names the
#      submodule rather than '*'.
#
#   3. ``aliases.py`` is CPython's verbatim, so it names ~250 codecs of which
#      Grail ships nine (utf-8, utf-8-sig, ascii, latin-1, utf-16 + le/be,
#      raw-unicode-escape, unicode-escape).  That is deliberate: an alias for
#      a codec module that is not here fails to import, search_function
#      answers None, and lookup() raises LookupError -- exactly what an
#      unknown encoding should do.  Shipping a trimmed alias table instead
#      would answer LookupError for the ALIAS of a codec Grail does have.

import codecs
import sys
from . import aliases

_cache = {}
_MAXCACHE = 500
_unknown = '--unknown--'
_import_tail = ['*']
_aliases = aliases.aliases

class CodecRegistryError(LookupError, SystemError):
    pass

def normalize_encoding(encoding):

    """ Normalize an encoding name.

        Normalization works as follows: all non-alphanumeric
        characters except the dot used for Python package names are
        collapsed and replaced with a single underscore, e.g. '  -;#'
        becomes '_'. Leading and trailing underscores are removed.

        Note that encoding names should be ASCII only.

    """
    if isinstance(encoding, bytes):
        encoding = str(encoding, "ascii")

    chars = []
    punct = False
    for c in encoding:
        if c.isalnum() or c == '.':
            if punct and chars:
                chars.append('_')
            if ord(c) < 128:
                chars.append(c)
            punct = False
        else:
            punct = True
    return ''.join(chars)

def search_function(encoding):

    # Cache lookup
    entry = _cache.get(encoding, _unknown)
    if entry is not _unknown:
        return entry

    # Import the module:
    #
    # First try to find an alias for the normalized encoding
    # name and lookup the module using the aliased name, then try to
    # lookup the module using the standard import scheme, i.e. first
    # try in the encodings package, then at top-level.
    #
    norm_encoding = normalize_encoding(encoding)
    aliased_encoding = _aliases.get(norm_encoding) or \
                       _aliases.get(norm_encoding.replace('.', '_'))
    if aliased_encoding is not None:
        modnames = [aliased_encoding,
                    norm_encoding]
    else:
        modnames = [norm_encoding]
    mod = None
    for modname in modnames:
        if not modname or '.' in modname:
            continue
        try:
            # Import is absolute to prevent the possibly malicious import of a
            # module with side-effects that is not in the 'encodings' package.
            mod = __import__('encodings.' + modname, None, None, [modname])
        except ImportError:
            # ImportError may occur because 'encodings.(modname)' does not
            # exist, or because it imports a name that does not exist.  Either
            # way this is not the codec we are looking for.
            mod = None
        else:
            break

    if mod is not None and not hasattr(mod, 'getregentry'):
        # Not a codec module
        mod = None

    if mod is None:
        # Cache misses
        if len(_cache) >= _MAXCACHE:
            _cache.clear()
        _cache[encoding] = None
        return None

    # Now ask the module for the registry entry
    entry = mod.getregentry()
    if not isinstance(entry, codecs.CodecInfo):
        if not 4 <= len(entry) <= 7:
            raise CodecRegistryError('module "%s" failed to register'
                                     % mod.__name__)
        if not callable(entry[0]) or not callable(entry[1]) or \
           (entry[2] is not None and not callable(entry[2])) or \
           (entry[3] is not None and not callable(entry[3])) or \
           (len(entry) > 4 and entry[4] is not None and not callable(entry[4])) or \
           (len(entry) > 5 and entry[5] is not None and not callable(entry[5])):
            raise CodecRegistryError('incompatible codecs in module "%s"'
                                     % mod.__name__)
        if len(entry) < 7 or entry[6] is None:
            entry += (None,)*(6-len(entry)) + (mod.__name__.split(".", 1)[1],)
        entry = codecs.CodecInfo(*entry)

    # Cache the codec registry entry
    if len(_cache) >= _MAXCACHE:
        _cache.clear()
    _cache[encoding] = entry

    # Register its aliases (without overwriting previously registered
    # aliases)
    getaliases = getattr(mod, 'getaliases', None)
    if getaliases is not None:
        for alias in getaliases():
            if alias not in _aliases:
                _aliases[alias] = modname

    # Return the registry entry
    return entry

# Register the search_function in the Python codec registry
codecs.register(search_function)
