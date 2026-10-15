Class {
	#name : 'NoSelfParameterTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'irModule',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
NoSelfParameterTestCase >> ___censusCountsForFixture___ [
	"Load the fixture under the ELIGIBILITY CENSUS and answer its counts."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'no_self_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'no_self_census'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/no_self_parameter.py')
		name: 'no_self_census']
			ensure: [importlib ___irCensusOn: false].
	^ importlib ___irCensus___ at: #counts

]

{ #category : 'Grail-Private' }
NoSelfParameterTestCase >> ___disagreeingKeys___ [
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

]

{ #category : 'Grail-Private' }
NoSelfParameterTestCase >> ___irModule___ [
	"The fixture with the seam FORCED ON, under a second module name.

	Forced rather than inherited: what this pins is an ELIGIBILITY widening, so
	a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'no_self_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'no_self_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/no_self_parameter.py')
		name: 'no_self_ir'.
	^ irModule

]

{ #category : 'Grail-Private' }
NoSelfParameterTestCase >> ___keys___ [
	"Named rather than read from the dict so a fixture key that stops being
	produced fails here instead of silently dropping out of the comparison."

	^ #('receiver_is_args_zero' 'no_arguments_still_passes_receiver'
	    'one_argument_follows_the_receiver' 'several_arguments_keep_their_order'
	    'kwargs_bind_separately' 'kwargs_alone_still_carry_the_receiver'
	    'classmethod_receiver_is_the_class'
	    'classmethod_receiver_precedes_the_arguments'
	    'dunder_eq_with_no_parameters' 'class_getitem_sees_the_class_first'
	    'method_local_class_keeps_the_receiver'
	    'super_with_no_declared_parameter_raises'
	    'subclass_receiver_is_the_subclass_instance')

]

{ #category : 'Grail-Setup' }
NoSelfParameterTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'no_self_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'no_self_census' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'no_self_ir'.
	self ___forgetCanonicalModule___: 'no_self_census'.
	irModule := nil

]

{ #category : 'Grail-Tests - no declared parameter' }
NoSelfParameterTestCase >> testEveryNoSelfShapeAgreesWithCPythonUnderIR [
	"All twelve shapes with the seam forced on.

	``receiver_is_args_zero'' and the three argument-order checks are the ones a
	dropped receiver fails: the tuple comes back one element short with
	everything shifted.  The rest pin the pieces around that -- **kwargs binding
	independently, a @classmethod getting the CLASS as args[0], a method-local
	class and a subclass each binding their own receiver."

	| bad |
	bad := self ___disagreeingKeys___.
	self assert: bad isEmpty
		description: 'no-parameter shapes disagreeing with CPython under IR: '
			, bad asArray printString

]

{ #category : 'Grail-Tests - no declared parameter' }
NoSelfParameterTestCase >> testNoSelfIsNowEligible [
	"The assertion that fails if the cut is reverted, and the only instrument
	that can see it.

	MEASURED BOTH WAYS on this fixture.  With the refusal restored it censuses
	8 `cm:method:noSelf' and 0 `cm:eligible', and the behavioural test above
	STILL PASSES because the text twin answers identically.  With the cut, 8
	`cm:eligible' and no refusal of any kind."

	| counts |
	importlib ___irCodegenEnabled___ ifFalse: [^ self].
	counts := self ___censusCountsForFixture___.
	self assert: (counts at: #'cm:method:noSelf' ifAbsent: [0]) = 0
		description: 'a no-parameter def still refuses: ' , counts printString.
	self assert: (counts at: #'cm:eligible' ifAbsent: [0]) >= 8
		description: 'fewer class methods eligible than the cut measured (8): '
			, counts printString

]

{ #category : 'Grail-Tests - no declared parameter' }
NoSelfParameterTestCase >> testTheIRArmActuallyCompiledTheFixture [
	"A guard on the guard: correct answers prove nothing if the seam fell back
	to text.

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

]
