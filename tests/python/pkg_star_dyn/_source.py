# Source module for the star-import dynamic-names test.  Mirrors
# the re._constants pattern: a helper function injects names into
# `globals()` at module-init time.  Parse-time star-import
# expansion can't see those names; only the runtime merge picks
# them up.

def _make_constants(*names):
    """Allocate sequential codes and inject each name as a
    module-level global.  Returns the list of values in order."""
    items = []
    for i, name in enumerate(names):
        items.append(i)
        globals().update({name: i})
    return items

# Static names — visible to parse-time star-import expansion.
STATIC_X = 'static-x'
STATIC_Y = 'static-y'

# Dynamic names — injected by _make_constants at module-init.
# Parse-time analysis cannot see these.
CODES = _make_constants('DYN_A', 'DYN_B', 'DYN_C')
