Class {
	#name : 'SuperNotRewrittenTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'irModule',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
SuperNotRewrittenTestCase >> ___censusCountsForFixture___ [
	"Load the fixture under the ELIGIBILITY CENSUS and answer its counts."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'snr_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'snr_census'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib loadModuleFromPath: self ___fixturePath___ name: 'snr_census']
		ensure: [importlib ___irCensusOn: false].
	^ importlib ___irCensus___ at: #counts

]

{ #category : 'Grail-Private' }
SuperNotRewrittenTestCase >> ___disagreeingKeys___ [
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
SuperNotRewrittenTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/super_not_rewritten.py'

]

{ #category : 'Grail-Private' }
SuperNotRewrittenTestCase >> ___irModule___ [
	"The fixture with the seam FORCED ON, under a second module name.

	Forced rather than inherited: what this pins is an ELIGIBILITY widening, so
	a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'snr_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'snr_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'snr_ir'.
	^ irModule

]

{ #category : 'Grail-Private' }
SuperNotRewrittenTestCase >> ___keys___ [
	"Named rather than read from the dict so a fixture key that stops being
	produced fails here instead of silently dropping out of the comparison."

	^ #('a_dotted_first_argument' 'a_subscript_first_argument'
	    'three_arguments_raise' 'a_non_type_first_argument_raises'
	    'a_non_type_first_argument_in_a_method' 'an_unrelated_instance_raises'
	    'one_argument_gives_an_unbound_super'
	    'a_dotted_first_argument_in_a_classmethod')

]

{ #category : 'Grail-Setup' }
SuperNotRewrittenTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'snr_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'snr_census' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'snr_ir'.
	self ___forgetCanonicalModule___: 'snr_census'.
	irModule := nil

]

{ #category : 'Grail-Tests - unrewritten super' }
SuperNotRewrittenTestCase >> testAnUnrewrittenSuperIsNowEligible [
	"The assertion that fails if the cut is reverted, and the only instrument
	that can see it.

	MEASURED BOTH WAYS on this fixture.  With the refusal restored it censuses
	7 `cm:CallAst:super-arity' and 2 `CallAst:super-noClass' against 2 eligible
	class methods and NOTHING compiled, and the behavioural test above STILL
	PASSES -- the text twin answers all eight correctly.  With the cut, 9
	eligible, 2 compiled, and no super refusal of any kind."

	| counts |
	importlib ___irCodegenEnabled___ ifFalse: [^ self].
	counts := self ___censusCountsForFixture___.
	self assert: (counts at: #'cm:CallAst:super-arity' ifAbsent: [0]) = 0
		description: 'an unrewritten super in a method still refuses: '
			, counts printString.
	self assert: (counts at: #'CallAst:super-noClass' ifAbsent: [0]) = 0
		description: 'an unrewritten super outside a class still refuses: '
			, counts printString.
	self assert: (counts at: #'cm:eligible' ifAbsent: [0]) >= 9
		description: 'fewer class methods eligible than the cut measured (9): '
			, counts printString

]

{ #category : 'Grail-Tests - unrewritten super' }
SuperNotRewrittenTestCase >> testEveryUnrewrittenSuperShapeAgreesWithCPythonUnderIR [
	"All eight shapes with the seam forced on.

	The four TypeError shapes are the ones a rewrite must not claim: a compiler
	that built a Super proxy for ``super(1, 2)'' would answer a working object
	where CPython raises, and no test that only checks working supers would see
	it."

	| bad |
	bad := self ___disagreeingKeys___.
	self assert: bad isEmpty
		description: 'unrewritten super shapes disagreeing with CPython under IR: '
			, bad asArray printString

]

{ #category : 'Grail-Tests - unrewritten super' }
SuperNotRewrittenTestCase >> testTheIRArmActuallyCompiledTheFixture [
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
	self assert: (stats at: #compiled) >= 8
		description: 'fewer methods compiled than the cut measured (8, against 2 '
			, 'with the refusal): compiled = ' , (stats at: #compiled) printString

]
