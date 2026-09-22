# GRAIL _collections_abc -- a bridge, not an implementation.
#
# In CPython the ABCs live HERE and collections.abc re-exports them.  Grail
# grew the other way round: its ABCs are implemented in collections/abc.py
# (see the header there for why), and nothing named _collections_abc existed.
# CPython's own modules import the private name directly -- pathlib does
# ``from _collections_abc import Sequence'' -- so this answers that import with
# the same classes collections.abc has, rather than a second set of them that
# isinstance() would then disagree with.

from collections.abc import *
from collections.abc import __all__
