! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for AugAssignModuleTargetTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'AugAssignModuleTargetTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
AugAssignModuleTargetTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! AugAssignModuleTargetTestCase
!
! ``global c; c += 1'' -- AN AUGMENTED ASSIGNMENT TO A MODULE NAME, ON THE IR
! PATH.
!
! `AugAssignAst:target-NameAst' (2, module-program).  An augmented assignment is
! a READ and a WRITE, and both halves have to land in the same place.  With
! ``global'' in force there is no local to augment: the parser strips a declared
! global from the scope's variables, so ___irLocalNameTarget___: answered nil
! and ___irComplexTargetKind___: knows only attribute and subscript targets.
! The statement fell through both and refused.
!
! THE SCOPE DECISION IS BORROWED, NOT RE-DERIVED.  ___irModuleScopeNameTarget___
! asks ___nameStoreRoutesToModule___: -- the same four-way rule AssignAst's
! store uses -- rather than testing ``is there a global declaration'' again.  An
! aug-assign that routed its store differently from the plain assign beside it
! would put the read and the write in different places, which is exactly the
! defect the nested-def global cut had to fix one level down.
!
! THE READ IS GUARDED AND THE WRITE IS NOT.  That asymmetry is what makes an
! unbound global raise NameError rather than answering nil, and it is the one
! shape of this statement that is an error rather than a value -- so the emit
! cannot be "read, apply, store".  testAnUnboundGlobalStillRaises pins it.
!
! THE RECEIVER DIFFERS BY SCOPE: a top-level def compiles to a method ON THE
! MODULE, so its ``self'' IS the module, while a class method's is not.  Both
! shapes are in the fixture and both must reach the SAME binding --
! ``module_sees_the_change'' reads it back from module scope after a method has
! bumped it.  The receiver comes from ___emitIRModuleReceiverOn___: (the
! delete-global cut) rather than being spelled twice.
!
! THE ROW IS A MODULE-PROGRAM ONE, so this cut moves `compiled' (1867 -> 1869)
! and not `cm:eligible': both corpus sites are top-level defs -- abc's
! _bump_invalidation_counter, whose whole job is to invalidate caches by
! bumping a module counter, and test_sort's check, which counts errors in a
! module global.
! ===============================================================================

doit
AugAssignModuleTargetTestCase removeAllMethods.
AugAssignModuleTargetTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: AugAssignModuleTargetTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'ama_ir' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'ama_ir'.
	irModule := nil
%

category: 'Grail-Private'
method: AugAssignModuleTargetTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/augassign_module_target.py'
%

category: 'Grail-Private'
method: AugAssignModuleTargetTestCase
___keys___
	^ #('bump_once' 'bump_twice' 'subtract' 'concat' 'in_place_extend'
	    'a_method_bumping_a_global' 'unbound_global' 'module_sees_the_change')
%

category: 'Grail-Private'
method: AugAssignModuleTargetTestCase
___irModule___
	"Forced rather than inherited: what this pins is an ELIGIBILITY widening,
	so a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'ama_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'ama_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'ama_ir'.
	^ irModule
%

category: 'Grail-Private'
method: AugAssignModuleTargetTestCase
___reprOf___: aKey
	^ ((self ___irModule___ @env1:___pyAttrLoad___: #'r') @env1:__getitem__: aKey)
		@env1:__repr__ @env0:asString
%

category: 'Grail-Tests - augmented assignment to a global'
method: AugAssignModuleTargetTestCase
testEveryOperatorAndScopeAgreesWithCPythonUnderIR
	"Eight checks: +=, -=, += on a str, += on a list (the in-place dunder), the
	same statement inside a METHOD (whose receiver is not the module), the
	unbound case, and a read-back from module scope proving all of them reached
	one binding."

	| bad |
	bad := OrderedCollection new.
	self ___keys___ do: [:k |
		| got want |
		got := self ___reprOf___: k.
		want := ((self ___irModule___ @env1:___pyAttrLoad___: #'EXPECTED')
			@env1:__getitem__: k) @env1:__repr__ @env0:asString.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	self assert: bad isEmpty
		description: 'module-scope augmented assignments disagreeing with '
			, 'CPython under IR: ' , bad asArray printString
%

category: 'Grail-Tests - augmented assignment to a global'
method: AugAssignModuleTargetTestCase
testAnUnboundGlobalStillRaises
	"The guarded half, on its own.  The READ carries a NameError guard and the
	WRITE does not; an emit that stored without reading, or read without the
	guard, would answer nil for a never-bound global instead of raising -- a
	wrong value rather than an error, and invisible in every other check here."

	| got |
	got := self ___reprOf___: 'unbound_global'.
	self assert: got = '"NameError: name ''never_set_anywhere'' is not defined"'
		description: 'an unbound global stopped raising NameError: ' , got
%

category: 'Grail-Tests - augmented assignment to a global'
method: AugAssignModuleTargetTestCase
testAMethodAndATopLevelDefReachTheSameBinding
	"The receiver differs by scope -- a top-level def's ``self'' IS the module,
	a class method's is not -- so the two could plausibly bump DIFFERENT
	bindings and each look right on its own.  The fixture bumps from both and
	then reads module scope: 1 + 1 from the two top-level calls, then 10 from
	the method, is 12."

	| got |
	got := self ___reprOf___: 'module_sees_the_change'.
	self assert: got = '12'
		description: 'a method and a top-level def bumped different bindings: '
			, got
%

category: 'Grail-Tests - augmented assignment to a global'
method: AugAssignModuleTargetTestCase
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
	self assert: (stats at: #compiled) >= 7
		description: 'fewer defs compiled than the cut measured (7, against 1 '
			, 'with the refusal): compiled = ' , (stats at: #compiled) printString
%
