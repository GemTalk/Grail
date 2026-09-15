! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for BareEvalExecScopeTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BareEvalExecScopeTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
BareEvalExecScopeTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! BareEvalExecScopeTestCase
!
! THE BARE ONE-ARGUMENT eval(expr) / exec(src), THROUGH THE DIRECT-TO-IR PATH.
!
! Grail does not dispatch that spelling to the builtin.  printSmalltalkOn:'s
! step 0c rewrites it at COMPILE time into
!
!     (builtins instance) _eval: { <expr>. (builtins instance)
!         ___evalScopeFor___: <module> locals: <locals snapshot> } kw: nil
!
! because _eval/_exec otherwise run in an EMPTY scope, and
! ``eval('val.split()[0]')'' referencing the local ``val'' raised ``undefined
! symbol''.  The injected namespace is the enclosing function's locals laid over
! the defining module's globals, which is what CPython gives by default.
!
! So an IR path that merely emitted the ordinary builtin call would not be a
! smaller version of the text -- it would be a WRONG ANSWER.  That is why the
! shape refused until this cut, under the census row
! `CallAst:frameSensitive-eval-bareRewrite' / `-exec-bareRewrite': 37 + 14
! class methods on the suite manifest, the largest rows left after the family
! was split by reason.
!
! WHAT THE CUT ADMITS, AND WHAT IT STILL REFUSES.  The rewrite has five scope
! cases and this path can spell two: a top-level def and a method.  Both build
! the snapshot through ___emitIRLocalsSnapshotOn___: (cut 84) and take the
! module receiver from ___emitIRModuleStoreReceiverOn___:, so the whole emit is
! two pieces that were already here plus the send that joins them.  The other
! three -- a class body, a comprehension, a nested def or lambda -- print
! through different helpers with no IR twin, and ___irEvalScopeShape___ answers
! #nested for each so they stay on text.
!
! THE SCOPE TEST IS READ OFF THE PARENT CHAIN, never from the compile context.
! Step 0c asks ``CallAst functionBeingCompiled notNil'', which is a
! compile-context read and answers about a DIFFERENT frame's def while an
! eligibility probe is walking this one -- the trap that has now cost three
! cuts a session each.  ___irEvalScopeKinds___ walks ``parent'' instead and
! says the same thing in the probe and in the emit.
!
! The fixture self-verifies under CPython 3.14, so every expectation here is
! CPython's behaviour rather than Grail's opinion of it, and it carries the
! refused scopes as well as the admitted ones: a shape is only correctly
! refused if it still gives the right answer.
! ===============================================================================

doit
BareEvalExecScopeTestCase removeAllMethods.
BareEvalExecScopeTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: BareEvalExecScopeTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'bare_eval_exec_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'bare_eval_exec_census' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'bare_eval_exec_ir'.
	self ___forgetCanonicalModule___: 'bare_eval_exec_census'.
	irModule := nil.
%

category: 'Grail-Private'
method: BareEvalExecScopeTestCase
___irModule___
	"The fixture with the seam FORCED ON, under a second module name.

	Forced rather than inherited: what this pins is an ELIGIBILITY widening, so
	a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'bare_eval_exec_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'bare_eval_exec_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/bare_eval_exec_scope.py')
		name: 'bare_eval_exec_ir'.
	^ irModule
%

category: 'Grail-Private'
method: BareEvalExecScopeTestCase
___disagreeingKeys___
	"Every fixture key whose actual value differs from its EXPECTED one,
	compared by repr so a failure prints both sides whole."

	| mod results expected bad |
	mod := self ___irModule___.
	results := mod @env1:___pyAttrLoad___: #'r'.
	expected := mod @env1:___pyAttrLoad___: #'EXPECTED'.
	bad := OrderedCollection new.
	self ___keys___ do: [:k |
		| got want |
		got := (results @env1:__getitem__: k) @env1:__repr__ @env0:asString.
		want := (expected @env1:__getitem__: k) @env1:__repr__ @env0:asString.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	^ bad
%

category: 'Grail-Private'
method: BareEvalExecScopeTestCase
___keys___
	"Named rather than read from the dict so a fixture key that stops being
	produced fails here instead of silently dropping out of the comparison."

	^ #('a_local_in_a_top_level_def'
	    'exec_mutates_a_local_in_a_top_level_def'
	    'a_module_global_from_a_top_level_def'
	    'a_local_shadows_a_module_global'
	    'a_parameter_is_in_the_snapshot'
	    'an_unbound_local_is_not_in_the_snapshot'
	    'a_local_in_a_method'
	    'exec_mutates_a_local_in_a_method'
	    'self_is_in_the_snapshot'
	    'a_module_global_from_a_method'
	    'builtins_still_resolve_in_a_method'
	    'a_nested_def_sees_its_own_local'
	    'a_comprehension_target_is_visible'
	    'at_module_scope_is_not_the_rewrite')
%

category: 'Grail-Tests - the bare eval/exec rewrite'
method: BareEvalExecScopeTestCase
testEveryScopeAgreesWithCPythonUnderIR
	"All fourteen shapes, admitted and refused alike, with the seam forced on.

	The refused ones are here on purpose: a nested def, a comprehension and
	module scope each stay on the text path, and a cut that admits the wrong
	scope would show up as one of those answering with the wrong namespace
	rather than as a compile failure."

	| bad |
	bad := self ___disagreeingKeys___.
	self assert: bad isEmpty
		description: 'bare eval/exec shapes disagreeing with CPython under IR: '
			, bad asArray printString
%

category: 'Grail-Tests - the bare eval/exec rewrite'
method: BareEvalExecScopeTestCase
testTheIRArmActuallyCompiledTheFixture
	"A guard on the guard: correct answers prove nothing if the seam fell back
	to text, which is precisely the failure an eligibility widening can hide --
	the widened defs would simply be compiled the old way and every assertion
	above would still pass.

	On a platform without IR support the forced flag is correctly a no-op and
	there is nothing to assert."

	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'.
	self assert: (stats at: #compiled) > 0
		description: 'the IR arm compiled NOTHING, so it was re-testing the text '
			, 'path; compiled = ' , (stats at: #compiled) printString
%

category: 'Grail-Private'
method: BareEvalExecScopeTestCase
___censusCountsForFixture___
	"Load the fixture under the ELIGIBILITY CENSUS and answer its counts.

	___irStats___ cannot see this cut and the test above says so; this is the
	instrument that can.  An eligibility refusal never reaches the seam, so it
	is not a FALLBACK -- the refused defs are compiled the old way, and
	``compiled > 0'' stays true on the strength of the fixture's other defs."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'bare_eval_exec_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'bare_eval_exec_census'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/bare_eval_exec_scope.py')
		name: 'bare_eval_exec_census']
			ensure: [importlib ___irCensusOn: false].
	^ importlib ___irCensus___ at: #counts
%

category: 'Grail-Tests - the bare eval/exec rewrite'
method: BareEvalExecScopeTestCase
testTheBareRewriteIsNowEligible
	"The assertion that fails if the cut is reverted.

	MEASURED BOTH WAYS on this fixture.  With the rewrite refused it censuses
	7 top-level defs compiled, 0 eligible class methods, and 7 + 1 + 4 + 1
	`-bareRewrite' rows.  With the cut: 12 compiled, 5 eligible, and no
	`-bareRewrite' row at all -- what still refuses refuses as `-nested', which
	is the frame-machinery cut and a different one.

	Holder's five methods are the class-method half and they are the point: the
	corpus rows this cut retires are 37 + 14 CLASS METHODS.

	On a platform without IR support the forced flag is a no-op and the census
	collects nothing to assert."

	| counts bare |
	importlib ___irCodegenEnabled___ ifFalse: [^ self].
	counts := self ___censusCountsForFixture___.
	bare := (counts at: #'CallAst:frameSensitive-eval-bareRewrite' ifAbsent: [0])
		+ (counts at: #'cm:CallAst:frameSensitive-eval-bareRewrite' ifAbsent: [0])
		+ (counts at: #'CallAst:frameSensitive-exec-bareRewrite' ifAbsent: [0])
		+ (counts at: #'cm:CallAst:frameSensitive-exec-bareRewrite' ifAbsent: [0]).
	self assert: bare = 0
		description: 'the bare rewrite still refuses: ' , bare printString
			, ' of ' , counts printString.
	self assert: (counts at: #'compiled' ifAbsent: [0]) >= 12
		description: 'fewer top-level defs compiled than the cut measured (12): '
			, counts printString.
	self assert: (counts at: #'cm:eligible' ifAbsent: [0]) >= 5
		description: 'Holder''s bare-eval methods are not IR-eligible: '
			, counts printString
%
