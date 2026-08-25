"""Warns at MODULE level with stacklevel=2, for warning_stacklevel_attribution.

The import statement that pulls this module in is the frame the warning must
blame -- issue #24305's rule, and the shape that needs the importing module's
body to HAVE a frame at all.
"""

import warnings

warnings.warn("module-level warning", stacklevel=2)
