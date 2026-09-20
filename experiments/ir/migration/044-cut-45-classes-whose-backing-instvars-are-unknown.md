## Progress — cut 45 (classes whose backing instVars are unknown)

Roadmap item 1b (`method:unknownInstVars`, 1152 stdlib methods), and it
turned out to need no install-time check at all.  Both refusals --
`unknownInstVars` for a class not rooted at PythonInstance, `instVarShadow`
for a local spelled like a backing instVar -- were the TEXT's constraints: a
method temp that shadows an instance variable is a CompileError for the
source compiler, so the text keeps such locals in an outer `^ [ ... ] value`
block and cannot decide when it cannot enumerate the instVars at emit time (a
dict / str / Exception root brings slots the compile does not see).

The IR has no name resolution.  A method temp and an instVar are distinct
`GsComVarLeaf` nodes whatever they are called, and `generateFromIR:` accepts
the method -- measured before the cut, with a class carrying instVar `xval`
and an IR method declaring temp `xval`: it compiles, answers the temp's value
(7) and leaves the instVar untouched (99).  Every read and write of the Python
local resolves to the temp, which is exactly the text's block-temp semantics.
So both rules go; `method:slots` stays (a `__slots__` class stores `self.x`
in a mangled instVar the IR's dynamic-instVar emit does not reach -- 1c).

Fixture: Boom(Exception) with a local `args` (a named instVar of the
Smalltalk Exception beneath it) and a parameter `messageText`; Bag(dict) with
locals `count` / `total` and a `self[key] = value` store.  Compiled 184 -> 190.
