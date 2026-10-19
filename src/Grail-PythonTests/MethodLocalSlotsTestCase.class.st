Class {
	#name : 'MethodLocalSlotsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'irModule',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
MethodLocalSlotsTestCase >> ___censusCountsForFixture___ [
	"Load the fixture under the ELIGIBILITY CENSUS and answer its counts."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'mls_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'mls_census'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib loadModuleFromPath: self ___fixturePath___ name: 'mls_census']
		ensure: [importlib ___irCensusOn: false].
	^ importlib ___irCensus___ at: #counts

]

{ #category : 'Grail-Private' }
MethodLocalSlotsTestCase >> ___disagreeingKeys___ [
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
MethodLocalSlotsTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/method_local_slots.py'

]

{ #category : 'Grail-Private' }
MethodLocalSlotsTestCase >> ___irModule___ [
	"The fixture with the seam FORCED ON, under a second module name.

	Forced rather than inherited: what this pins is an ELIGIBILITY widening, so
	a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'mls_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'mls_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'mls_ir'.
	^ irModule

]

{ #category : 'Grail-Private' }
MethodLocalSlotsTestCase >> ___keys___ [
	"Named rather than read from the dict so a fixture key that stops being
	produced fails here instead of silently dropping out of the comparison."

	^ #('a_method_local_class_with_slots' 'slots_over_a_slotted_base'
	    'a_runtime_base_one' 'a_runtime_base_two' 'a_name_mangled_slot'
	    'an_unset_slot_raises_then_reads' 'a_non_slot_assignment_raises'
	    'two_instances_of_one_method_local_class'
	    'a_classmethod_on_a_slotted_local_class' 'the_same_def_called_twice')

]

{ #category : 'Grail-Setup' }
MethodLocalSlotsTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'mls_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'mls_census' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'mls_ir'.
	self ___forgetCanonicalModule___: 'mls_census'.
	irModule := nil

]

{ #category : 'Grail-Tests - method-local slots' }
MethodLocalSlotsTestCase >> testASlottedMethodLocalClassMethodIsNowEligible [
	"The assertion that fails if the cut is reverted, and the only instrument
	that can see it.

	MEASURED BOTH WAYS on this fixture.  With the refusal restored it censuses
	21 `method:methodLocalSlots' against 2 eligible, and the behavioural test
	above STILL PASSES -- the text twin answers all ten correctly.  With the
	cut, 23 eligible and no refusal of any kind."

	| counts |
	importlib ___irCodegenEnabled___ ifFalse: [^ self].
	counts := self ___censusCountsForFixture___.
	self assert: (counts at: #'cm:method:methodLocalSlots' ifAbsent: [0]) = 0
		description: 'a slotted method-local class method still refuses: '
			, counts printString.
	self assert: (counts at: #'cm:eligible' ifAbsent: [0]) >= 23
		description: 'fewer class methods eligible than the cut measured (23): '
			, counts printString

]

{ #category : 'Grail-Tests - method-local slots' }
MethodLocalSlotsTestCase >> testEverySlottedMethodLocalShapeAgreesWithCPythonUnderIR [
	"All ten shapes with the seam forced on.

	``an_unset_slot_raises_then_reads'' is the one a bare instVar read would
	get wrong in the quiet direction: an unset slot is nil, and nil must fall
	through to ___pyAttrLoad___ so __getattr__ / AttributeError still apply
	rather than the read answering None."

	| bad |
	bad := self ___disagreeingKeys___.
	self assert: bad isEmpty
		description: 'method-local __slots__ shapes disagreeing with CPython under IR: '
			, bad asArray printString

]

{ #category : 'Grail-Tests - method-local slots' }
MethodLocalSlotsTestCase >> testTheIRArmActuallyCompiledTheFixture [
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
	self assert: (stats at: #compiled) >= 32
		description: 'fewer methods compiled than the cut measured (32), so some '
			, 'method-local class method went to text; compiled = '
			, (stats at: #compiled) printString

]
