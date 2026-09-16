## Progress — cut 65 (lambdas)

Roadmap item 4, second cut: `value:LambdaAst` (19 stdlib top-level defs +
28 class methods after cut 64).

**What the text emits** (LambdaAst>>printSmalltalkOn:; trace of `lam(x)`,
`lam_defaults(x)`, `lam_arg(xs)`, `K.lam(self)`):

    f := ([:___positional___ :___kwargs___ | | ___curPos___ a |
        ((___positional___ size) < 1) ifTrue: [TypeError ___checkMissingPositional___: ___positional___
            kwargs: ___kwargs___ names: #( 'a' ) posonly: 0 qualifiedName: '<lambda>'].
        a := (___positional___ size >= 1) ifTrue: [___positional___ at: 1]
            ifFalse: [(___kwargs___ isNil not and: [___kwargs___ includesKey: 'a'])
                ifTrue: [___kwargs___ at: 'a']
                ifFalse: [TypeError ___signalMissingArguments___: #( 'a' ) kind: 'positional' qualifiedName: '<lambda>']].
        ___curPos___ := ...
        (a) ___binOpAdd___: (x)
    ] @env0:___pyNamed___: '<lambda>'; @env0:___pyModuleNamed___: 'nprobe';
      @env0:___pyQualname___: 'lam.<locals>.<lambda>';
      @env0:___pyCode___: (PyCode @env0:name: '<lambda>' filename: '...' firstlineno: 32
          argcount: 1 posonlyargcount: 0 kwonlyargcount: 0)).

    f := ([| ___lamdef_b_35_8___ | ___lamdef_b_35_8___ := 2.               (defaults: a wrapper whose
        [:___positional___ :___kwargs___ | | ___curPos___ a b rest kw |      temps carry the lambda's
        a := ...  b := ... ifFalse: [___lamdef_b_35_8___]].                  source position)
        rest := tuple perform: #withAll: env: 0 withArguments: { ___positional___ copyFrom: 3 to: ___positional___ size }.
        kw := ___kwargs___ isNil ifTrue: [PyDict new] ifFalse: [___kwargs___ copy].
        kw removeKey: 'a' ifAbsent: [].  kw removeKey: 'b' ifAbsent: [].
        <body>
        ] ___pyNamed___: '<lambda>'; ...; ___pyCode___: (...)] value)

The same closure block as a def's with an EXPRESSION body and a lighter
prologue: no arg-count guards (a lambda silently ignores extra arguments --
the text records it as a known gap), the missing-positional check only when
some positional is required, every positional -- positional-only included --
through the kwargs gate, the `*args` tail, a required-keyword-only check and
per-parameter keyword-only bindings, a `**kw` that is a COPY minus the
regular and keyword-only names; no shallowCopy, no signature spec, no closure
cells, no flags or freevars on the PyCode; the stamps cascaded onto the inner
block INSIDE the defaults wrapper.  The arity messages say ``<lambda>()``,
where CPython says ``lam.<locals>.<lambda>()`` -- so the fixture compares only
the message tail.

**What the IR emits** (`LambdaAst>>___emitIRValueOn___:`,
`___emitIRLambdaBlockOn___:`, `___emitIRLambdaPrologueOn___:pos:kw:`): that,
send for send, through cut 64's builder machinery -- `blockWithArgs:temps:do:`
over the two block arguments with every parameter a block temp bound by
`withLocals:do:`, `nestedFunctionDo:` for the closure's own helper temps (and
`inNestedFunction`, unused by an expression body), `blockWithTemps:do:` for
the `___lamdef_<p><line>_<col>___` wrapper (`defaultTempSuffix`, the text's
own), the body's `___emitIRValueOn___:` as the block's value, genLeaf cleared
for the body, and the cascade `___pyNamed___: '<lambda>'; ___pyModuleNamed___:;
___pyQualname___:` (from `CallAst ___qualnameFor___:name:` -- a lambda pushes
no scope, so the enclosing def's frame gives ``f.<locals>.<lambda>'' and a
method's ``K.lam.<locals>.<lambda>``) `; ___pyCode___:` with the six-field
PyCode.  The prologue is the lambda's own (it cannot share a def's: the
qualified name is the literal ``<lambda>`` and positional-only parameters take
the kwargs gate), written against the same builder primitives.

**Eligibility** (`___irLambdaReason___:`, guarded): the body must be an
emittable value against the enclosing locals plus the parameters
(`___irNestedLocals___:`, also its `___irChildLocals___:` for the census);
defaults and keyword defaults emittable in the enclosing scope; refused, each
a census row: `LambdaAst:walrus` (a walrus target is a block temp the text
declares; NamedExprAst is refused as a value anyway), `LambdaAst:yield` (a
generator lambda), `LambdaAst:reservedName` (a pseudo-variable parameter --
the text's `_self` transport).  For the enclosing flow analysis a lambda reads
its defaults and its body's free variables (`___irReadLocalNamesInto___:locals:`
drops its own parameters); nothing inside can be unbound, so no flow walk of
its own.  A lambda as a MODULE def's default (`___irDefaultsReason___`) is
judged against an empty local set, as before, and now passes when it reads
nothing but its parameters.  Free-variable reads inside a lambda take the
cut-64 guard rule (`___irFreeReadNeedsGuard___` walks to the innermost def
OR lambda).

Fixture: twelve module defs -- a plain closure, a `key=` argument, defaults +
`*rest` + `**kw` on three call routes, keyword-only, positional-only, `__name__`
/ `__qualname__` / `__module__` / `co_name` / `co_argcount`, the loop-capture
idiom (`lambda m=v:` binds early, `lambda: v` late), a lambda returning a
lambda, a lambda as a nested def's default and as a keyword override, the
three arity messages (tails), a conditional body, an immediately-invoked
lambda -- and class `Lammer` (a lambda over `self.v` inside a comprehension,
a `key=` tuple, a method's `<lambda>` qualname).  Compiled 390 -> 407 (all 17),
fallbacks 0, first try; flag OFF ALL_OK at compiled=0.  The probe modules:
nprobe.py 11 -> 15 (`lam`, `lam_default`, `lam_arg`, `K.lam`), nprobe2.py
8 -> 9 (`lam_defaults`), OUT unchanged; the fixture census shows no
`LambdaAst:` row.

**Gates** (wt/d, gs40, Claude3):

* smoke tripwire: `4 run, 4 passed`, compiled = 407, fallbacks = 0; flag OFF ALL_OK at compiled=0;
* flag-off `./scripts/run_tests.sh`: `main suite (sharded: 4 of x4): 6431 run, 6431 passed, 0 failed, 0 errors`;
* flag-on cold sweep `GRAIL_TEST_COLD=1 GRAIL_IR_CODEGEN=1 ./scripts/run_tests.sh`:
  `main suite (sharded: 4 of x4): 6431 run, 6420 passed, 10 failed, 1 errors`,
  every shard reporting, 0 AlmostOutOfMemory notifications -- exactly cut 64's
  residue by name: the known nine at 91041f20 plus the two WithItemPositions
  column tests reached through IR nested frames.  Nothing lambda-specific.
