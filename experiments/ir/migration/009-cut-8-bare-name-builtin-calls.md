## Progress — cut 8 (bare-name builtin calls)

A fixed-arity builtin call — `abs(x)`, `max(a, b)`, `pow(x, y)` — emits the same
shape `printBareCallFastPathOn:` does: `(((Python @env0:at: #builtins) instance)
name: arg1 _: arg2)`, i.e. three nested sends (`at:` in env 0, `instance` and the
`name:_:` fast-path selector in env 1). Eligibility reuses
`CallAst>>bareCallFastPathSelector` verbatim (bare NameAst, arity ≥ 1, no
kwargs/starred, not shadowed by a local, builtins actually has the selector), so
the IR path admits exactly what the text fast path would take. Nested calls work
(`abs(a) + max(a, b)`). Verified absval/biggest/power/combo IR-compiled.

The OTHER call forms are deferred and more involved: the module self-send is a
probe-then-branch BLOCK (`[:___f___ | ___f___ == nil ifTrue: [self name: args]
ifFalse: [___f___ ___pyCallValue___: {args} kw: nil]] value: (self
@env0:dynamicInstVarAt: #name)`), which needs block ARGUMENTS + an array builder;
attribute calls, class-call `__new__`, and the varargs/keyword forms each have
their own shape. `While` (exception-based break/continue) is also still open.
