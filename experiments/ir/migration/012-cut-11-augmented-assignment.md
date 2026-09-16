## Progress — cut 11 (augmented assignment)

`x += v` (simple LOCAL target) -> `x := (x) @env1:___augmentedOp___: (v)
inplace: #'__iadd__:' binary: #'__add__:'.` — the text path's simple-local
branch verbatim: one runtime-helper send that tries the in-place dunder and
falls back to the binary one, exactly as CPython. The selector pair is derived
from the op printer just as `printSmalltalkOn:` derives it (guarded, non-raising).
The other target branches (attribute, subscript, module-scope, class-body,
closure-cell) stay on text via `___irLocalNameTarget___:`.

Flow analysis grew a polymorphic hook: `___irLocalWriteTarget___:` (AbstractNode
default nil, overridden by Assign and AugAssign) replaces the `isKindOf: AssignAst`
tests in `___irAssignFlowSafe___:`, and AugAssign's `___irReadLocalNamesInto___:`
adds its own TARGET to the read set — `x += v` reads x before writing it, so a
def whose only binding of x is the aug-assign correctly fails bound-before-read
and stays on text (where the UnboundLocalError guard lives). An aug-assign to a
PARAMETER is already ineligible: the parser's `declareWrite:` puts the target in
`assignedNamesInBody`, which fails `___irAllParamsAreReadOnlyArgs___`.

Fixture: bump (`+=`), scale (`*=`, `-=`), concat (str `+=`, exercising the
`__iadd__` -> `__add__` fallback); compiled count 25 -> 28. Flag-on suite
6235/6236 (only the inherent temps-fast-path test), flag-off 6236/6236.
