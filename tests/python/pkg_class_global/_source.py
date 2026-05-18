# Source module: declares one static opcode and injects two
# runtime-only opcodes via globals().update(...) — mirrors the
# re._constants `_makecodes` idiom.

def _make_opcodes(*names):
    items = []
    for i, name in enumerate(names):
        items.append(i)
        globals().update({name: i})
    return items

STATIC_OP = 99

OPCODES = _make_opcodes('DYN_OP_A', 'DYN_OP_B')
