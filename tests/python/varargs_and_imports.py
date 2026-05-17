# Fixture for VarargsAndImportsTestCase — exercises *args/**kwargs
# binding in def + the import machinery (dotted submodule, fromlist).

# --- *args binding ---
def take_args(*items):
    return list(items)

# --- **kwargs binding ---
def take_kwargs(**opts):
    # Return the sum of values and a sorted key list, avoiding tuple
    # comparison (Grail's tuple has no __lt__ yet).
    total = 0
    for v in opts.values():
        total = total + v
    keys = sorted(list(opts.keys()))
    return (total, keys)

# --- Mixed positional + *args + **kwargs ---
def mixed(a, b, *rest, **opts):
    return (a, b, list(rest), len(opts))

# --- Tuple-unpack assignment at module level ---
pair = (10, 20)
ta, tb = pair
abc_triple = (1, 2, 3)
ax, ay, az = abc_triple

# --- Tuple-unpack from a function return ---
def two_values():
    return 100, 200
tv1, tv2 = two_values()

# --- Star-unpack: target list may have one starred element that binds
# the "rest" as a list.  Star at end is the common form; star at start
# or middle binds the leading/trailing items by negative index.
star_end_head, *star_end_tail = (1, 2, 3, 4)
*star_start_init, star_start_last = (1, 2, 3, 4)
star_mid_head, *star_mid_middle, star_mid_last = (1, 2, 3, 4, 5)
star_only_one_head, *star_only_one_tail = (7,)

# --- Module import: dotted submodule ---
# `import re._constants` binds the package `re`; submodule reachable via attr.
import re._constants
LITERAL_via_dotted = re._constants.LITERAL

# --- from . import (relative) ---
# We can't write `from . import _constants` here because this fixture
# isn't a package member.  The relative-import path is exercised by
# re._parser itself, which loads in SreTestCase setup.  But we can test
# absolute `from X import Y`:
from re._constants import MAGIC, MAXREPEAT
from_import_magic = MAGIC
from_import_maxrep = MAXREPEAT

# --- Module-level results ---
take_args_result    = take_args('a', 'b', 'c')
take_kwargs_result  = take_kwargs(x=1, y=2)
mixed_result        = mixed(1, 2, 3, 4, 5, p=10, q=20)
