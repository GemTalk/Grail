! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for UnpackModuleTargetTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'UnpackModuleTargetTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
UnpackModuleTargetTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! UnpackModuleTargetTestCase
!
! UNPACKING INTO MODULE NAMES -- ``global a, b; a, b = x, y'' -- ON THE IR PATH.
!
! `cm:AssignAst:target-TupleAst' (2) and, for free, `cm:shape:WithAst' (1).
!
! Every leaf of an unpacking target has to be stored somewhere, and a
! ``global''-declared leaf has no local to store into: the parser strips a
! declared global from the scope's variables, so ___irUnpackLeafEligible___:'s
! ``localNames includes:'' test refused it and with it the whole statement.
!
! THE SAME PREDICATE SERVES ``with ... as'', which is why one change closed two
! rows.  WithAst asks ___irUnpackTargetEligible___: / ___irUnpackLeafEligible___:
! for its as-target, so ``with cm() as some_global:'' was refused for exactly
! the same reason -- test.test_global's test_enter_result, the one site.
!
! THE LEAVES ARE DECIDED INDIVIDUALLY, which is the failure this guards
! against: routing a whole statement one way would be wrong for ``c, loc = ...''
! where one leaf is a global and the other a local.  Each leaf asks
! ___nameStoreRoutesToModule___:, the same four-way rule the plain assignment's
! store consults -- the rule this family keeps coming back to (the nested-def
! global cut, the augmented-assignment one, and now the unpack).
!
! ONE HELPER WAS LIFTED RATHER THAN COPIED.  ___emitIRModuleStoreOf___:to:on:
! lived on AssignAst and carried its OWN copy of the receiver rule (``self'' in
! a module def, ``<Mod> ___instance___'' in a class method) beside the copy in
! ___emitIRModuleReceiverOn___:.  The unpack needed it from AbstractNode, so it
! moved there and now reads the shared receiver: two copies of a rule that must
! not drift is how a store and a delete came to disagree once already.
!
! ONE OF THE TWO TUPLE SITES MOVED rather than closed, to
! `AssignAst:chained-target-NameAst' -- the same method holds a CHAINED
! assignment to a global, which is a different shape and the next refusal in
! line.  The board records the split; a row names the first refusal, not the
! only one.
! ===============================================================================

doit
UnpackModuleTargetTestCase removeAllMethods.
UnpackModuleTargetTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: UnpackModuleTargetTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'umt_ir' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'umt_ir'.
	irModule := nil
%

category: 'Grail-Private'
method: UnpackModuleTargetTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/unpack_module_target.py'
%

category: 'Grail-Private'
method: UnpackModuleTargetTestCase
___keys___
	^ #('two_globals' 'a_global_and_a_local' 'swap_two_globals'
	    'nested_tuple_target' 'starred_global' 'a_method_unpacking_globals'
	    'with_as_a_global' 'with_as_a_global_tuple' 'module_sees_the_change')
%

category: 'Grail-Private'
method: UnpackModuleTargetTestCase
___irModule___
	"Forced rather than inherited: what this pins is an ELIGIBILITY widening,
	so a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'umt_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'umt_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'umt_ir'.
	^ irModule
%

category: 'Grail-Private'
method: UnpackModuleTargetTestCase
___reprOf___: aKey
	^ ((self ___irModule___ @env1:___pyAttrLoad___: #'r') @env1:__getitem__: aKey)
		@env1:__repr__ @env0:asString
%

category: 'Grail-Tests - unpacking into module names'
method: UnpackModuleTargetTestCase
testEveryUnpackShapeAgreesWithCPythonUnderIR
	"Nine checks: two globals, a global beside a local, a swap, a nested tuple,
	a starred leaf, the same statement in a METHOD (whose receiver is not the
	module), both ``with ... as'' shapes, and a read-back from module scope."

	| bad |
	bad := OrderedCollection new.
	self ___keys___ do: [:k |
		| got want |
		got := self ___reprOf___: k.
		want := ((self ___irModule___ @env1:___pyAttrLoad___: #'EXPECTED')
			@env1:__getitem__: k) @env1:__repr__ @env0:asString.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	self assert: bad isEmpty
		description: 'module-target unpacks disagreeing with CPython under IR: '
			, bad asArray printString
%

category: 'Grail-Tests - unpacking into module names'
method: UnpackModuleTargetTestCase
testAGlobalAndALocalLeafGoToDifferentPlaces
	"The leaves are decided INDIVIDUALLY.  ``global c; c, loc = 'C', 'local'''
	must store one leaf on the module and the other in a temp; routing the
	statement as a whole would be wrong either way round, and each half looks
	right on its own -- only the read-back below catches it."

	| got |
	got := self ___reprOf___: 'a_global_and_a_local'.
	self assert: got = '(''C'', ''local'')'
		description: 'a mixed global/local unpack went one way for both leaves: '
			, got
%

category: 'Grail-Tests - unpacking into module names'
method: UnpackModuleTargetTestCase
testTheModuleSeesEveryStore
	"A leaf that stored into a method temp is right-looking inside its own
	function and invisible outside it, so every shape above is read back from
	MODULE SCOPE here -- including the ones a method and a ``with'' wrote."

	| got |
	got := self ___reprOf___: 'module_sees_the_change'.
	self assert: got = '(''wa'', ''wb'', ''from-with'', [2, 3])'
		description: 'a store did not reach the module binding: ' , got
%

category: 'Grail-Tests - unpacking into module names'
method: UnpackModuleTargetTestCase
testTheIRArmActuallyCompiledTheFixture
	"A guard on the guard: an eligibility refusal never reaches the seam, so
	the refused defs compiled the old way and every value above was already
	right."

	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'.
	self assert: (stats at: #compiled) >= 9
		description: 'fewer defs compiled than the cut measured (9): compiled = '
			, (stats at: #compiled) printString
%
