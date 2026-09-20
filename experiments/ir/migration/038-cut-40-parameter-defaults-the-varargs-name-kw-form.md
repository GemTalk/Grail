## Progress — cut 40 (parameter defaults: the varargs `_name:kw:` form)

The first signature cut.  A def with positional defaults compiles, as in the
text, to the ONE varargs method `_name: positional kw: kwargs` (the same
selector the stub pre-pass registered and `CallAst>>moduleSelfSendVarargs
Selector` / `___irCallShape___` already reach), whose body opens with
generateModuleMethodSourceOn:'s non-simple prologue, statement for statement
(oracle: the GRAIL_CODEGEN_TRACE_DIR dump of a nine-def probe module):

    ((positional size) > 2) ifTrue: [TypeError ___signal___: ('f() takes from 1 to 2
        positional arguments but ' , positional size printString , (positional size > 1
        ifTrue: [' were given'] ifFalse: [' was given']))].            printArgCountChecksOn:
    (kwargs isNil) not ifTrue: [kwargs keysDo: [:___k___ | ({ 'a'. 'b' } includes:
        ___k___ asString) ifFalse: [TypeError ___signal___: ('f() got an unexpected
        keyword argument ''' , ___k___ asString , '''')]]].
    ((positional size) < 1) ifTrue: [TypeError ___checkMissingPositional___: positional
        kwargs: kwargs names: #( 'a' ) posonly: 0 qualifiedName: 'f'].   printMissingPositionalCheckOn:
    a := ((positional size) >= 1) ifTrue: [positional at: 1]
        ifFalse: [(kwargs isNil not and: [kwargs includesKey: 'a']) ifTrue: [kwargs at: 'a']
        ifFalse: [TypeError ___signalMissingArguments___: #( 'a' ) kind: 'positional'
        qualifiedName: 'f']].                                            printPositionalUnpackingOn:
    b := ... ifFalse: [(self ___moduleDefaultAt: #'___default_f__b___' compute: [2])]].

In this form EVERY parameter is a method temp the prologue fills, so a
reassigned parameter needs no transport (cut 29's machinery is the fixed-arity
branch's alone), and the method's two arguments follow the text's collision
rule -- `positional` / `kwargs` unless a parameter or body local is spelled the
same, then `___pos___` / `___kw___` (`___irVarargsMethodParamNames___`).  The
`positional`-size compare, `at:`, `includesKey:`, `keysDo:`, `printString` and
`,` are the text's `@env0:` sends; `TypeError ___signal___:` and the two
argument-check class methods are env-1 sends to the symbol-list global.  Three
inlined control shapes the builder lacked -- `and:` (controlOp
COMPAR_AND_SELECTOR), `ifNil:ifNotNil:` (COMPAR_IF_NIL_IF_NOTNIL) and `ifNil:`
(COMPAR_IF_NIL), the values source compilation stamps -- are new builder
constructors (`andValue:then:`, `ifNilValue:then:else:`, `ifNilValue:then:`);
the last two wait for cuts 41/42.

**The default is the text's def-time memo, not a per-call expression.**  The
method body is neither the def's scope nor def time, so the text evaluates
each default through `module>>___moduleDefaultAt:compute:` -- once per module,
shared across calls, which is what keeps `def f(item, bucket=[])` accumulating
as CPython's def-time list does.  The IR emits the same send with the same
`___default_<f>__<p>___` key, so a module whose defs are split between the two
paths shares one memo per default.  The expression inside the `compute:` block
is emitted with `___emitIRValueOn___:` in the METHOD's frame, where the text
resolves its names as module globals; `___irDefaultsReason___` therefore admits
only a default that is an emittable value with NO local in scope
(`#'signature:defaultExpr'` otherwise -- a builtin function as a value, a
lambda) and refuses one that names a parameter or body local at all
(`#'signature:defaultReadsLocal'`) rather than emit it differently from the
text.

The parser registers `*vararg`, keyword-only and `**kwarg` names in
`body.variables` alongside the positional ones, so the IR's body-local
derivation, local-name set, flow seed, pseudo-variable check and annotation
check now run over `___irAllBoundParamNames___` (every kind) instead of
`allParameterNames` (positional only) -- otherwise `args` would have been a
"body local" read before binding.  `___irSignatureReason___` still names
`signature:*args` / `signature:**kwargs` / `signature:kwonly`, and now
`signature:posonly` (the varargs form's positional-only checks are their own
message shapes), each until its cut lands; a def refused for its signature no
longer hides a later reason (`returnAnnotation`, `decorators`) in the census.

Fixture: add_default, step_default (a module-global default, keyword call),
shared_default (the mutable-default memo, called twice), all_default (no
required parameter: no missing check emitted), rebind_default (a rebound
defaulted parameter), default_from_call (a module self-send in the default),
call_defaults (every call route), default_errors (the three TypeError
messages, asserted verbatim) -- plus cut 28's kw_target, on text until now by
its default; compiled 137 -> 146, first try.

Cut 40 flag-on sweep: the known families (`testForLoopExceptionPositions`,
`RaiseSpanTestCase`, `SpanEndTokenTestCase`, `WithItemPositionsTestCase`'s
columns, `testTheTempsFastPathNeedsNoSource`) plus two ERRORs the runner labels
``a AlmostOutOfMemory occurred (notification 6013)'' --
`StaticmethodShadowingTestCase>>testAMultiArgumentStaticmethodIsUnaffected`
(signalled during a cold import's compileMethod:) and
`ZipfileTestCase>>testOpenStreamsInSmallReads` (as in cut 33) -- the pressure
effect, not emit defects.
