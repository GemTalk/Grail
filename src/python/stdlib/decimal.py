# CPython's Lib/decimal.py is a six-line dispatcher: it tries the C
# accelerator ``from _decimal import *`` and, on ImportError, falls back to
# the pure-Python implementation with
#
#     import _pydecimal
#     sys.modules[__name__] = _pydecimal
#
# Grail vendors the pure-Python implementation verbatim as ``_pydecimal``
# (src/python/stdlib/_pydecimal.py) and has no ``_decimal``, so only the
# fallback arm can ever run.
#
# CPython ...; Grail: this module IS that fallback arm, but written as a
# star-import instead of the ``sys.modules[__name__] = _pydecimal`` rebind.
# That rebind does not survive Grail's module-identity model: Grail resolves
# an imported module through the object the import machinery already created,
# so replacing the sys.modules ENTRY leaves the binding that
# ``import decimal`` produced pointing at THIS module while
# ``sys.modules['decimal']`` points at _pydecimal -- two module objects for
# one name.  A star-import copies the names into this module instead, so
# there is exactly one ``decimal`` module and the classes in it are
# _pydecimal's own objects, which is what identity actually needs:
# ``decimal.Decimal is _pydecimal.Decimal`` is True either way.

from _pydecimal import *

# CPython's C arm re-exports these two by name because they are not in
# __all__, and a star-import honours __all__ and would drop them.
# test_decimal reads both.
from _pydecimal import __version__, __libmpdec_version__

# No __all__ here, matching CPython's decimal.py, which does not define one:
# ``from decimal import *`` then exports every non-underscore name, which is
# exactly the set the star-import above brought in (the two dunders are
# excluded by the leading underscore).  _pydecimal.__all__ covers the whole
# public API -- Decimal, Context, DecimalTuple, DefaultContext / BasicContext
# / ExtendedContext, the eleven exception classes plus the four
# InvalidOperation triggers, the eight ROUND_* constants, setcontext /
# getcontext / localcontext / IEEEContext, the five limit constants, and
# HAVE_THREADS / HAVE_CONTEXTVAR -- so nothing needs restating by hand.
