# Exercises ImportAst's dotted-import-as-alias codegen.
#
# `import a.b.c as x` binds `x` to the leaf (a.b.c), not to the
# top-level package `a`.  Before the fix, blinker's
# `import collections.abc as c` ended up with `c = collections`
# instead of `c = collections.abc`.

import collections.abc as cabc

# Direct attribute fetch on the alias.  cabc is the LEAF
# (collections.abc) — Callable is defined there.  defaultdict
# is defined on the TOP (collections) and isn't on the leaf;
# referencing it via cabc.defaultdict would raise.
LEAF_NAME = cabc.__name__

# Unaliased dotted import: `import a.b` binds `a` (the top).
import collections.abc  # noqa
TOP_NAME = collections.__name__
ABC_VIA_TOP = collections.abc.__name__
