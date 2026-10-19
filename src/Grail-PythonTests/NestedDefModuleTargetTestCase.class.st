Class {
	#name : 'NestedDefModuleTargetTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'irModule',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
NestedDefModuleTargetTestCase >> ___censusCountsForFixture___ [
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

]

{ #category : 'Grail-Private' }
NestedDefModuleTargetTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/nested_def_module_target.py'

]

{ #category : 'Grail-Private' }
NestedDefModuleTargetTestCase >> ___irModule___ [
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

]

{ #category : 'Grail-Private' }
NestedDefModuleTargetTestCase >> ___keys___ [
	^ #('defines_a_global_function' 'the_module_sees_it' 'redefines_it'
	    'the_module_sees_the_redefinition' 'defines_a_decorated_global'
	    'a_method_defining_a_global' 'the_module_sees_the_method_one'
	    'the_name_is_in_globals')

]

{ #category : 'Grail-Private' }
NestedDefModuleTargetTestCase >> ___reprOf___: aKey [
	^ ((self ___irModule___ @env1:___pyAttrLoad___: #'r') @env1:__getitem__: aKey)
		@env1:__repr__ @env0:asString

]

{ #category : 'Grail-Setup' }
NestedDefModuleTargetTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'ndm_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'ndm_census' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'ndm_ir'.
	self ___forgetCanonicalModule___: 'ndm_census'.
	irModule := nil

]

{ #category : 'Grail-Tests - a nested def binding a global' }
NestedDefModuleTargetTestCase >> testADecoratedModuleScopeDefStillRefuses [
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

]

{ #category : 'Grail-Tests - a nested def binding a global' }
NestedDefModuleTargetTestCase >> testBothGuardsAreGone [
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

]

{ #category : 'Grail-Tests - a nested def binding a global' }
NestedDefModuleTargetTestCase >> testEveryModuleScopeDefShapeAgreesWithCPythonUnderIR [
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

]

{ #category : 'Grail-Tests - a nested def binding a global' }
NestedDefModuleTargetTestCase >> testTheModuleReallyHoldsTheFunction [
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

]
