! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for NestedDefModuleTargetTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'NestedDefModuleTargetTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
NestedDefModuleTargetTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! NestedDefModuleTargetTestCase
!
! A NESTED DEF WHOSE NAME LANDS AT MODULE SCOPE, ON THE IR PATH.
!
! `cm:nestedDef:moduleScopeTarget' (3) plus the module-program row (1).
! ``global f'' then ``def f(): ...'' inside a function binds no local: the def
! STATEMENT stores the closure on the module.  The closure is ordinary; only
! where its name goes differs, and it goes through the same
! ``dynamicInstVarAt:put:'' the plain assignment, the augmented assignment and
! the unpack all use -- with ___emitIRModuleReceiverOn___: as the receiver, so a
! def and an assignment to the same global cannot reach different objects.
!
! IT REFUSED TWICE OVER, AND THE SECOND ONE IS THE POINT.  Dropping the
! ``moduleScopeTarget'' guard alone moved all three corpus sites to
! `nestedDef:nameNotLocal' and gained NOTHING -- the def's name is not a local
! precisely BECAUSE it is a module name, so the very next guard caught it.  The
! census read 13213 either way; only the row-by-row diff showed the move, and
! ``cm:eligible'' would have looked like an honest +0.  Both guards are part of
! this cut.
!
! A DECORATED module-scope def IS STILL REFUSED, under its own row
! `nestedDef:moduleScopeTargetDecorated'.  printSmalltalkOn: re-stores the
! module binding for EACH decorator step and reads it back between them with
! ``dynamicInstVarAt: #f ifAbsent: [nil]'', which is a different emit from the
! leaf-based decorator tail -- a separate shape rather than a harder one.  None
! of the corpus's four sites is decorated.  The fixture covers it anyway, so
! that what still refuses is measured rather than assumed.
! ===============================================================================

doit
NestedDefModuleTargetTestCase removeAllMethods.
NestedDefModuleTargetTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: NestedDefModuleTargetTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'ndm_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'ndm_census' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'ndm_ir'.
	self ___forgetCanonicalModule___: 'ndm_census'.
	irModule := nil
%

category: 'Grail-Private'
method: NestedDefModuleTargetTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/nested_def_module_target.py'
%

category: 'Grail-Private'
method: NestedDefModuleTargetTestCase
___keys___
	^ #('defines_a_global_function' 'the_module_sees_it' 'redefines_it'
	    'the_module_sees_the_redefinition' 'defines_a_decorated_global'
	    'a_method_defining_a_global' 'the_module_sees_the_method_one'
	    'the_name_is_in_globals')
%

category: 'Grail-Private'
method: NestedDefModuleTargetTestCase
___irModule___
	"Forced rather than inherited: what this pins is an ELIGIBILITY widening,
	so a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'ndm_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'ndm_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'ndm_ir'.
	^ irModule
%

category: 'Grail-Private'
method: NestedDefModuleTargetTestCase
___reprOf___: aKey
	^ ((self ___irModule___ @env1:___pyAttrLoad___: #'r') @env1:__getitem__: aKey)
		@env1:__repr__ @env0:asString
%

category: 'Grail-Private'
method: NestedDefModuleTargetTestCase
___censusCountsForFixture___
	"Load the fixture under the ELIGIBILITY CENSUS.  ___irStats___ cannot see
	this cut on its own -- a refusal never reaches the seam, so the refused
	defs compiled the old way and every value was already right."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'ndm_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'ndm_census'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib loadModuleFromPath: self ___fixturePath___ name: 'ndm_census']
		ensure: [importlib ___irCensusOn: false].
	^ importlib ___irCensus___ at: #counts
%

category: 'Grail-Tests - a nested def binding a global'
method: NestedDefModuleTargetTestCase
testEveryModuleScopeDefShapeAgreesWithCPythonUnderIR
	"Eight checks: defining a global function, calling it from MODULE scope
	afterwards, redefining it, the decorated shape that still refuses, the same
	statement inside a METHOD (whose receiver is not the module), and the name
	appearing in globals()."

	| bad |
	bad := OrderedCollection new.
	self ___keys___ do: [:k |
		| got want |
		got := self ___reprOf___: k.
		want := ((self ___irModule___ @env1:___pyAttrLoad___: #'EXPECTED')
			@env1:__getitem__: k) @env1:__repr__ @env0:asString.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	self assert: bad isEmpty
		description: 'module-scope nested defs disagreeing with CPython under '
			, 'IR: ' , bad asArray printString
%

category: 'Grail-Tests - a nested def binding a global'
method: NestedDefModuleTargetTestCase
testTheModuleReallyHoldsTheFunction
	"A store into a method temp is right-looking inside its own function and
	invisible outside it, so the created functions are CALLED from module scope
	here -- including the one a method defined, whose receiver is not the
	module and which therefore takes the other half of the receiver rule."

	| bad |
	bad := OrderedCollection new.
	#('the_module_sees_it' 'the_module_sees_the_redefinition'
	  'the_module_sees_the_method_one') do: [:k |
		| got want |
		got := self ___reprOf___: k.
		want := ((self ___irModule___ @env1:___pyAttrLoad___: #'EXPECTED')
			@env1:__getitem__: k) @env1:__repr__ @env0:asString.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	self assert: bad isEmpty
		description: 'a def did not reach the module binding: '
			, bad asArray printString
%

category: 'Grail-Tests - a nested def binding a global'
method: NestedDefModuleTargetTestCase
testBothGuardsAreGone
	"THE ASSERTION THAT FAILS IF EITHER HALF IS REVERTED, and the only one that
	can: the values above are right either way, because a refusal falls back to
	the very text they are compared against.

	Two rows, not one.  Dropping ``moduleScopeTarget'' alone moved every site to
	``nameNotLocal'' for a +0 net, so both are asserted here -- measured on this
	fixture, where the undecorated defs are three and the decorated one still
	refuses."

	| counts |
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	counts := self ___censusCountsForFixture___.
	self assert: (counts at: #'nestedDef:moduleScopeTarget' ifAbsent: [0]) = 0
		description: 'a module-scope nested def still refuses: ' , counts printString.
	self assert: (counts at: #'nestedDef:nameNotLocal' ifAbsent: [0]) = 0
		description: 'the refusal moved to nameNotLocal instead of closing -- '
			, 'the +0 shape this cut exists to avoid: ' , counts printString
%

category: 'Grail-Tests - a nested def binding a global'
method: NestedDefModuleTargetTestCase
testADecoratedModuleScopeDefStillRefuses
	"The shape deliberately left out, asserted rather than assumed: the text
	re-stores the module binding for each decorator step and reads it back
	between them, which this emit does not spell.  When that is cut, this fails
	and the row retires."

	| counts |
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	counts := self ___censusCountsForFixture___.
	self assert: (counts at: #'nestedDef:moduleScopeTargetDecorated' ifAbsent: [0]) = 1
		description: 'the decorated module-scope def no longer refuses under its '
			, 'own row: ' , counts printString
%
