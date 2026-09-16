## What the next big cut needs: the control-flow / block machinery

`If`/`While`/`For` and every `Call` form share one prerequisite the experiments
already proved (05_real_blocks, 04_while_plain, 07_array_builder, and
PyIRBuilder's `if:then:` / `while:do:`): the builder must grow `GsComBlockNode`
contexts, optimized `ifTrue:`/`ifFalse:`/`whileTrue:` sends (set the send's
`controlOp` from `GsCompilerIRNode _classVars` COMPAR_*), `GsComArrayBuilderNode`,
and **env-0 sends** (`send:to:with:env:` is already in place) for
`dynamicInstVarAt:` and truthiness. Even the "simple" module self-send is a
probe-then-branch block (`[:___f___ | ___f___ == nil ifTrue: [self name: args]
ifFalse: [___f___ ___pyCallValue___: {args} kw: nil]] value: (self
@env0:dynamicInstVarAt: #name)`), so Call depends on this machinery too. Port it
into `PyMethodIRBuilder` next, then If/While, then the call forms.
