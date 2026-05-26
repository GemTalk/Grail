# Grail's werkzeug.datastructures __init__ — staging placeholder.
#
# Upstream re-exports ~30 names from accept / auth / cache_control /
# csp / etag / file_storage / headers / mixins / range / structures.
# Several of those submodules pull in werkzeug.http, werkzeug.urls,
# werkzeug.exceptions, etc. — not all dropped yet.
#
# Current scope: re-export the names that fit Step 2's footprint
# (structures + mixins).  As later steps land (http, exceptions, ...),
# the re-exports below grow back toward the upstream surface.  Final
# shape (after Step 10) matches the unmodified upstream file.

from .mixins import ImmutableDictMixin as ImmutableDictMixin
from .mixins import ImmutableHeadersMixin as ImmutableHeadersMixin
from .mixins import ImmutableListMixin as ImmutableListMixin
from .mixins import ImmutableMultiDictMixin as ImmutableMultiDictMixin
from .mixins import UpdateDictMixin as UpdateDictMixin
from .structures import CallbackDict as CallbackDict
from .structures import CombinedMultiDict as CombinedMultiDict
from .structures import HeaderSet as HeaderSet
from .structures import ImmutableDict as ImmutableDict
from .structures import ImmutableList as ImmutableList
from .structures import ImmutableMultiDict as ImmutableMultiDict
from .structures import ImmutableTypeConversionDict as ImmutableTypeConversionDict
from .structures import iter_multi_items as iter_multi_items
from .structures import MultiDict as MultiDict
from .structures import TypeConversionDict as TypeConversionDict
