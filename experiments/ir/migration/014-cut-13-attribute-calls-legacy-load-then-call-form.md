## Progress — cut 13 (attribute calls, legacy load-then-call form)

`obj.attr(args)` -> `((obj) @env1:___pyAttrLoad___: #attr) @env1:value:
{ args } value: nil` — the text path's legacy fallback (Python is load THEN
call: the attribute might be a BoundMethod, a class, or any callable value;
`value:value:` routes all three through the unified call protocol; empty
keywords print as `nil`). Exactness: every earlier fast path in CallAst's
printSmalltalkOn: must stand down — the eligibility probe requires
moduleSelfSend*/classSelfSend*/attributeCallFastPath/attributeCallVarargs all
nil (the branches before them are NameAst-function-guarded and cannot match an
AttributeAst), so a call any fast path would claim stays on text. No
splat/keywords. CallAst's read collector now includes the FUNCTION position
(the receiver of `s.upper()` reads `s`) — exact for the bare-builtin shape too,
whose function name is never a local. Fixture: shout (0-arg), find_pos (1-arg),
dashed (`sep.join([a, b])`, composing the cut-12 list literal); compiled
33 -> 36. Flag-on 6235/6236 (inherent only), flag-off 6236/6236.
