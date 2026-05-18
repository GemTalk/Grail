# Consumer module — does `from ._source import *` then reads
# both static and dynamic names from the source's namespace.
# The dynamic reads (DYN_A etc.) only work if the star import
# brought them in via a runtime merge, not just parse-time.

from ._source import *

# Static reads — work even with the old parse-time-only expansion.
static_x_value = STATIC_X
static_y_value = STATIC_Y

# Dynamic reads — need the runtime merge.
dyn_a_value = DYN_A
dyn_b_value = DYN_B
dyn_c_value = DYN_C

codes_count = len(CODES)
