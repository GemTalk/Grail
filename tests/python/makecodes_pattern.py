# Fixture for MakecodesPatternTestCase.  Mirrors the
# ``_makecodes(*names) + globals().update(...)`` idiom that
# CPython's re._constants uses to declare its opcode constants.
# With Phase 1 (late module-name binding) in place, this should
# work end-to-end on the upstream form — no Strategy A patch
# (no expanded explicit-constant block) needed.

def _makecodes(*names):
    """Allocate sequential codes for `names` and inject them as
    module-level globals.  Returns the list of values in order."""
    items = []
    for i, name in enumerate(names):
        items.append(i)
        globals().update({name: i})
    return items

OPCODES = _makecodes(
    'OP_FAILURE',
    'OP_SUCCESS',
    'OP_ANY',
    'OP_LITERAL',
)

# Read the injected names back at module top level (this is what
# fails without Phase 1's runtime self-at-lookup).
got_failure = OP_FAILURE
got_success = OP_SUCCESS
got_any = OP_ANY
got_literal = OP_LITERAL
opcodes_count = len(OPCODES)
