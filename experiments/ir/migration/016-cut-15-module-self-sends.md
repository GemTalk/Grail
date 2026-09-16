## Progress — cut 15 (module self-sends)

`f(x)` where f is a top-level def of the module being compiled — the deferred
probe-then-branch block, now emittable since the builder has block ARGS and the
array builder. Shape for shape with printModuleSelfSendOn::

    ([:___f___ | ___f___ == nil
        ifTrue: [self name: arg1 _: arg2]
        ifFalse: [___f___ @env1:___pyCallValue___: { args } kw: nil]]
        value: (self @env0:dynamicInstVarAt: #name))

Builder grew `selfNode` (GsComVarLeaf initializeSelf) and `blockWithArg:do:`
(a one-arg block whose arg leaf the emit block receives for reads). The arg
expressions appear once per branch — separate node trees, as in the text,
since IR nodes cannot be shared. Eligibility (`___irModuleSelfSendSelector___`)
is exact: the special-cased ids (globals/locals/vars/dir/eval/exec/super) are
denied, and bareCallFastPath/bareCallVarargs/bareCallClassNew/knownBuiltinName
must all answer nil before moduleSelfSendSelector decides. Varargs self-sends
(kwargs/defaults) stay on text.

**Landmine: `GsComSelectorLeaf newSelector:env:` is unusable per-user.** It
reads a lazily-initialized special-selector table; cold it raises
(`nil at:otherwise:`), and initializing it (`_initializeSpecialSelectors`)
writes an objectSecurityPolicyId-1 dictionary — SecurityError for a per-user
session. So `#==` and `#value:` are REAL env-0 sends (bare-Symbol selLeaf):
kernel `Object>>==` is the identity test and `ExecBlock>>value:` the block
invoke — semantically identical to the special opcodes, just not inlined.

Fixture: double/quadruple (nested self-sends), dispatch_add (two self-sends in
one expression), base_impl/call_base plus a module-level rebind
(`base_impl = lambda: 2`) proving the probe's REBOUND branch answers the new
value; compiled 41 -> 46. Flag-on 6235/6236 (inherent only), flag-off 6236/6236.
