"""A library that blames its CALLER, never itself, for deprecation warnings.

``skip_file_prefixes`` is the 3.12 mechanism: every frame whose filename
starts with this package's own directory is skipped by the stacklevel walk,
so however deep the internal plumbing runs, the warning lands on the caller
outside the package.
"""

import os
import warnings

_PKG_DIR = os.path.dirname(__file__)


def outer_api(message, stacklevel=2):
    return _inner(message, stacklevel)


def _inner(message, stacklevel):
    warnings.warn(message, stacklevel=stacklevel,
                  skip_file_prefixes=(_PKG_DIR,))
