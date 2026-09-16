! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EvalInNestedScopeTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EvalInNestedScopeTestCase'
  instVarNames: #( irModule textModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EvalInNestedScopeTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EvalInNestedScopeTestCase
!
! ``eval'' AND ``exec'' INSIDE A NESTED DEF OR LAMBDA, THROUGH THE DIRECT-TO-IR
! PATH.
!
! `frameSensitive-eval-nested' (6 compiled-method sites + 1 module one) and
! `frameSensitive-exec-nested' (2) were the IR path refusing a whole family for
! a RUNTIME reason: eval whose globals/locals argument is None means "use the
! caller's namespaces", which Grail finds by walking out to the innermost frame
! whose temp names include a codegen marker (PyFrame >>
! ___namesIncludeCodegenMarker___:).
!
! THE WALK WAS NEVER WRONG.  What the IR path owed it was a frame to stop at.
! The text declares ``| ___curPos___ q |'' inside a lambda's block and inside a
! nested def's, and stores a position into it before every statement, so the walk
! stops THERE.  The IR path's two closure blocks carried no marker at all, so the
! walk ran past them to the enclosing method and read its temps instead --
! measured to diverge in both directions, which is why the refusal was written
! rather than the family narrowed.
!
! So the cut is one declaration and one store in each of two emits
! (FunctionDefAst >> ___emitIRNestedBlockOn___: and LambdaAst >>
! ___emitIRLambdaBlockOn___:), and the marker must be STORED because the IR
! generator drops a temp nothing references.
!
! THE CONTROL IS eval_caller_namespace.py, the fixture whose failure the refusal
! was written for.  Under a forced flag it used to raise ``NameError: name 'args'
! is not defined'' at 19 compiled; it now loads at 20 compiled, 0 fallbacks.
!
! ONE ASYMMETRY IS LEFT, AND IT FAVOURS THE IR PATH -- pinned by
! testTheTextPathCannotSeeANestedDefsParameters below rather than left in a
! comment.  The text wraps a nested def's body in
! ``[[...] value. None] on: PythonReturn do: [...]'', and the frame that walk
! lands on is the inner block's, whose temps are not the two-argument block's --
! so the TEXT cannot see a nested def's PARAMETERS at all.  Measured with
! ``eval('sorted(locals().keys())', None)'' inside ``def inner(p)'': the text
! reports ``b'' and not ``p''; the IR path and CPython report both.  Reproducing
! that would mean emitting a bug on purpose, so it is not reproduced.
!
! TWO SHAPES REMAIN WRONG ON BOTH PATHS and are the fixture's XFAILs: the walk is
! blind to a COMPREHENSION's own target, and to a name ``exec'' binds into the
! caller's namespace.  They are pinned here so that fixing either fails this
! test rather than passing silently.
!
! WHAT STILL REFUSES, correctly and under its own census row: a BARE
! ``eval(expr)'' / ``exec(src)'' in a nested scope.  The text does not dispatch
! that to the builtin at all -- step 0c rewrites it, injecting the enclosing
! scope's locals -- and the IR path has no spelling for the rewrite outside a
! top-level def and a method.  Four of the nine sites this cut freed are that
! shape, and they MOVED to `frameSensitive-eval-bareRewrite' /
! `-exec-bareRewrite' rather than closing.
! ===============================================================================

doit
EvalInNestedScopeTestCase removeAllMethods.
EvalInNestedScopeTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: EvalInNestedScopeTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'evns_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'evns_text' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'evns_control' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'evns_ir'.
	self ___forgetCanonicalModule___: 'evns_text'.
	self ___forgetCanonicalModule___: 'evns_control'.
	irModule := nil.
	textModule := nil
%

category: 'Grail-Private'
method: EvalInNestedScopeTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/eval_in_nested_scope.py'
%

category: 'Grail-Private'
method: EvalInNestedScopeTestCase
___xfailKeys___
	"The fixture's two XFAILs -- shapes Grail gets wrong on BOTH paths, so they
	are not this cut's to fix and are compared separately below."

	^ #('none_in_a_comprehension' 'exec_with_none_binds_into_the_caller')
%

category: 'Grail-Private'
method: EvalInNestedScopeTestCase
___keys___
	"Named rather than read from the fixture so a key that stops being produced
	fails here instead of silently dropping out of the comparison."

	^ #('explicit_globals_in_a_nested_def' 'explicit_globals_and_locals'
	    'explicit_globals_in_a_lambda' 'explicit_globals_in_a_comprehension'
	    'exec_with_explicit_globals' 'explicit_globals_hide_the_enclosing_local'
	    'explicit_globals_under_varargs' 'a_call_inside_the_evaluated_source'
	    'a_method_with_a_nested_explicit_eval'
	    'none_sees_the_nested_defs_own_local'
	    'none_sees_the_nested_defs_own_parameter'
	    'none_sees_the_nested_defs_own_varargs'
	    'none_cannot_see_the_enclosing_local'
	    'a_none_valued_variable_is_the_same_as_none'
	    'none_sees_a_module_global' 'none_in_a_lambda_sees_its_parameter'
	    'none_in_a_methods_nested_def_cannot_see_the_methods_local'
	    'three_arguments_with_none_for_locals')
%

category: 'Grail-Private'
method: EvalInNestedScopeTestCase
___irModule___
	"The fixture with the seam FORCED ON, under its own module name.

	Forced rather than inherited: what this pins is an ELIGIBILITY widening, so
	a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'evns_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'evns_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'evns_ir'.
	^ irModule
%

category: 'Grail-Private'
method: EvalInNestedScopeTestCase
___textModule___
	"The same fixture with the seam FORCED OFF -- the oracle, and the only way
	to state the one asymmetry as a measurement rather than as prose."

	textModule ifNotNil: [^ textModule].
	(importlib @env1:modules) removeKey: #'evns_text' ifAbsent: [].
	self ___forgetCanonicalModule___: 'evns_text'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: false.
	textModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'evns_text'.
	^ textModule
%

category: 'Grail-Private'
method: EvalInNestedScopeTestCase
___reprOf___: aModule key: aKey
	^ ((aModule @env1:___pyAttrLoad___: #'r') @env1:__getitem__: aKey)
		@env1:__repr__ @env0:asString
%

category: 'Grail-Private'
method: EvalInNestedScopeTestCase
___expectedReprOf___: aModule key: aKey
	^ ((aModule @env1:___pyAttrLoad___: #'EXPECTED') @env1:__getitem__: aKey)
		@env1:__repr__ @env0:asString
%

category: 'Grail-Private'
method: EvalInNestedScopeTestCase
___disagreeingKeysIn___: aModule
	| bad |
	bad := OrderedCollection new.
	self ___keys___ do: [:k |
		| got want |
		got := self ___reprOf___: aModule key: k.
		want := self ___expectedReprOf___: aModule key: k.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	^ bad
%

category: 'Grail-Tests - eval in a nested scope'
method: EvalInNestedScopeTestCase
testEveryNestedEvalShapeAgreesWithCPythonUnderIR
	"Eighteen shapes with the seam forced on.

	Nine name their namespaces outright and consult no frame at any depth; nine
	hand eval a None, which is what makes the walk run and therefore what says
	which frame it found."

	| bad |
	bad := self ___disagreeingKeysIn___: self ___irModule___.
	self assert: bad isEmpty
		description: 'nested eval shapes disagreeing with CPython under IR: '
			, bad asArray printString
%

category: 'Grail-Tests - eval in a nested scope'
method: EvalInNestedScopeTestCase
testTheEnclosingFramesLocalsStayInvisible
	"The divergence the refusal was written for, stated on its own.

	CPython's compiler makes no cell for a name that appears only inside an eval
	string, so ``x'' in the enclosing def is genuinely out of scope -- and the
	IR path answered its VALUE, which is a wrong answer rather than a missing
	feature.  A marker on the enclosing method alone could not fix it: the walk
	has to stop at the nested frame, which means the nested frame needs one."

	| got |
	got := self ___reprOf___: self ___irModule___
		key: 'none_cannot_see_the_enclosing_local'.
	self assert: got = '"NameError: name ''x'' is not defined"'
		description: 'a nested def saw the enclosing frame''s locals again: ' , got
%

category: 'Grail-Tests - eval in a nested scope'
method: EvalInNestedScopeTestCase
testANestedDefsOwnParametersAreVisibleUnderIR
	"The other direction of the same divergence: a nested def's own parameters
	-- a plain one and a ``*args'' -- ARE in scope for a None-namespace eval,
	and the walk landing on the enclosing method could see neither."

	| bad |
	bad := OrderedCollection new.
	#('none_sees_the_nested_defs_own_parameter'
	  'none_sees_the_nested_defs_own_varargs') do: [:k |
		| got want |
		got := self ___reprOf___: self ___irModule___ key: k.
		want := self ___expectedReprOf___: self ___irModule___ key: k.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	self assert: bad isEmpty
		description: 'a nested def''s own parameters are invisible to eval: '
			, bad asArray printString
%

category: 'Grail-Tests - eval in a nested scope'
method: EvalInNestedScopeTestCase
testTheTextPathCannotSeeANestedDefsParameters
	"THE ONE ASYMMETRY, pinned as a measurement.

	The text wraps a nested def's body in ``[[...] value. None] on: PythonReturn
	do: [...]'' and the marker walk lands on the INNER block, whose temps are
	not the two-argument block's -- so a None-namespace eval in a nested def
	cannot see the def's own parameters.  The IR path has no such wrapper and
	answers what CPython answers.

	This test FAILS when the text path is fixed, which is the point of it: the
	asymmetry is then gone and the note in ___irEligibleValueLocals___: and the
	class comment above both need retiring."

	| bad |
	bad := OrderedCollection new.
	#('none_sees_the_nested_defs_own_parameter'
	  'none_sees_the_nested_defs_own_varargs') do: [:k |
		| got want |
		got := self ___reprOf___: self ___textModule___ key: k.
		want := self ___expectedReprOf___: self ___textModule___ key: k.
		got = want ifTrue: [bad add: k , ' now agrees with CPython: ' , got]].
	self assert: bad isEmpty
		description: 'the text path''s nested-parameter blindness is gone -- '
			, 'retire the asymmetry note: ' , bad asArray printString
%

category: 'Grail-Tests - eval in a nested scope'
method: EvalInNestedScopeTestCase
testTheTwoWalkGapsAreStillThereOnBothPaths
	"The fixture's XFAILs.  Grail's caller-namespace walk is blind to a
	COMPREHENSION's own target and to a name ``exec'' binds into the caller's
	namespace, on the text path as much as the IR one -- so neither is this
	cut's, and neither is hidden.  When the walk learns either, this fails."

	| bad |
	bad := OrderedCollection new.
	self ___xfailKeys___ do: [:k |
		| got |
		got := self ___reprOf___: self ___irModule___ key: k.
		(got includesString: 'NameError')
			ifFalse: [bad add: k , ' under IR: ' , got].
		got := self ___reprOf___: self ___textModule___ key: k.
		(got includesString: 'NameError')
			ifFalse: [bad add: k , ' under text: ' , got]].
	self assert: bad isEmpty
		description: 'a caller-namespace walk gap closed -- retire the fixture''s '
			, 'XFAIL: ' , bad asArray printString
%

category: 'Grail-Tests - eval in a nested scope'
method: EvalInNestedScopeTestCase
testTheControlFixtureLoadsUnderIR
	"eval_caller_namespace.py is the fixture the refusal was written for: with
	eval/exec narrowed but the marker still missing it raised ``NameError: name
	'args' is not defined'' while the text path loaded it.  Loading is the whole
	assertion -- the module body runs every shape at import time."

	| mod |
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	(importlib @env1:modules) removeKey: #'evns_control' ifAbsent: [].
	self ___forgetCanonicalModule___: 'evns_control'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	mod := importlib loadModuleFromPath:
		(importlib grailDir , '/tests/python/eval_caller_namespace.py')
		name: 'evns_control'.
	self assert: mod notNil
		description: 'eval_caller_namespace.py did not load under a forced flag'.
	self assert: (importlib ___irStats___ at: #fallbacks) = 0
		description: 'the control fell back to text: '
			, (importlib ___irStats___ at: #fallbacks) printString
%

category: 'Grail-Tests - eval in a nested scope'
method: EvalInNestedScopeTestCase
testTheIRArmActuallyCompiledTheFixture
	"A guard on the guard: correct answers prove nothing if the seam fell back
	to text, which is what the refusal used to make it do.

	On a platform without IR support the forced flag is correctly a no-op and
	there is nothing to assert."

	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'.
	self assert: (stats at: #compiled) >= 21
		description: 'fewer defs compiled than the cut measured (21, against 8 '
			, 'with the refusal): compiled = ' , (stats at: #compiled) printString
%
