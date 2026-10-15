Class {
	#name : 'DunderClassMethodLocalTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'irModule',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
DunderClassMethodLocalTestCase >> ___censusCountsForFixture___ [
	"Load the fixture under the ELIGIBILITY CENSUS and answer its counts."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'dunder_mlc_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'dunder_mlc_census'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib loadModuleFromPath: self ___fixturePath___ name: 'dunder_mlc_census']
		ensure: [importlib ___irCensusOn: false].
	^ importlib ___irCensus___ at: #counts

]

{ #category : 'Grail-Private' }
DunderClassMethodLocalTestCase >> ___disagreeingKeys___ [
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
DunderClassMethodLocalTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/dunder_class_method_local.py'

]

{ #category : 'Grail-Private' }
DunderClassMethodLocalTestCase >> ___irModule___ [
	"The fixture with the seam FORCED ON, under a second module name.

	Forced rather than inherited: what this pins is an ELIGIBILITY widening, so
	a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'dunder_mlc_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'dunder_mlc_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___
		name: 'dunder_mlc_ir'.
	^ irModule

]

{ #category : 'Grail-Private' }
DunderClassMethodLocalTestCase >> ___keys___ [
	"Named rather than read from the dict so a fixture key that stops being
	produced fails here instead of silently dropping out of the comparison."

	^ #('it_is_the_defining_class' 'defining_class_not_receiver_class'
	    'each_class_gets_its_own' 'separate_calls_make_separate_classes'
	    'resolves_from_a_nested_function' 'resolves_inside_a_comprehension'
	    'works_alongside_zero_arg_super' 'the_class_name_reads_back')

]

{ #category : 'Grail-Setup' }
DunderClassMethodLocalTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'dunder_mlc_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'dunder_mlc_census' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'dunder_mlc_ir'.
	self ___forgetCanonicalModule___: 'dunder_mlc_census'.
	irModule := nil

]

{ #category : 'Grail-Tests - __class__ in a method-local class' }
DunderClassMethodLocalTestCase >> testDunderClassInAMethodLocalClassIsNowEligible [
	"The assertion that fails if the cut is reverted, and the only instrument
	that can see it.

	MEASURED BOTH WAYS on this fixture.  Reverted, it censuses 9
	`cm:NameAst:__class__-methodLocalClass' against 2 `cm:eligible' and compiles
	11 of the 20 -- and the behavioural test above STILL PASSES, because the
	text twin answers all eight correctly."

	| counts |
	importlib ___irCodegenEnabled___ ifFalse: [^ self].
	counts := self ___censusCountsForFixture___.
	self assert: (counts at: #'cm:NameAst:__class__-methodLocalClass' ifAbsent: [0]) = 0
		description: '__class__ in a method-local class still refuses: '
			, counts printString.
	self assert: (counts at: #'cm:eligible' ifAbsent: [0]) >= 11
		description: 'fewer class methods eligible than the cut measured (11): '
			, counts printString

]

{ #category : 'Grail-Tests - __class__ in a method-local class' }
DunderClassMethodLocalTestCase >> testEveryDunderClassShapeAgreesWithCPythonUnderIR [
	"All eight shapes with the seam forced on.

	``defining_class_not_receiver_class'' is the one a wrong recovery passes
	while being wrong: reading ``type(self)'' instead of the cell gives the
	same answer for every instance of the defining class and only diverges on a
	SUBCLASS instance, which is precisely why CPython uses a cell.
	``separate_calls_make_separate_classes'' catches the opposite error, a
	binding shared across calls of the enclosing function."

	| bad |
	bad := self ___disagreeingKeys___.
	self assert: bad isEmpty
		description: '__class__ shapes disagreeing with CPython under IR: '
			, bad asArray printString

]

{ #category : 'Grail-Tests - __class__ in a method-local class' }
DunderClassMethodLocalTestCase >> testTheIRArmDidNotFallBack [
	"Correct answers prove nothing if the seam fell back to text."

	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'

]
