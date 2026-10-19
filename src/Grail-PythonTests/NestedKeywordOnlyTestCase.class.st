Class {
	#name : 'NestedKeywordOnlyTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'irModule',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
NestedKeywordOnlyTestCase >> ___censusCountsForFixture___ [
	"Load the fixture under the ELIGIBILITY CENSUS and answer its counts."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'nested_kwonly_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'nested_kwonly_census'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib loadModuleFromPath: self ___fixturePath___ name: 'nested_kwonly_census']
		ensure: [importlib ___irCensusOn: false].
	^ importlib ___irCensus___ at: #counts

]

{ #category : 'Grail-Private' }
NestedKeywordOnlyTestCase >> ___disagreeingKeys___ [
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
NestedKeywordOnlyTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/nested_keyword_only.py'

]

{ #category : 'Grail-Private' }
NestedKeywordOnlyTestCase >> ___irModule___ [
	"The fixture with the seam FORCED ON, under a second module name.

	Forced rather than inherited: what this pins is an ELIGIBILITY widening, so
	a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'nested_kwonly_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'nested_kwonly_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___
		name: 'nested_kwonly_ir'.
	^ irModule

]

{ #category : 'Grail-Private' }
NestedKeywordOnlyTestCase >> ___keys___ [
	"Named rather than read from the dict so a fixture key that stops being
	produced fails here instead of silently dropping out of the comparison."

	^ #('required_and_defaulted' 'both_supplied'
	    'missing_required_keyword_only'
	    'keyword_only_cannot_be_passed_positionally'
	    'keyword_only_names_are_not_in_kwargs'
	    'kwargs_empty_when_only_kwonly_passed'
	    'the_callers_dict_is_not_mutated' 'kwdefaults_reads_back'
	    'assigning_kwdefaults_changes_the_next_call'
	    'deleting_a_default_makes_the_parameter_required'
	    'the_default_expression_runs_at_def_time'
	    'a_mutable_default_is_shared_between_calls'
	    'each_closure_has_its_own_cell' 'star_args_and_keyword_only')

]

{ #category : 'Grail-Setup' }
NestedKeywordOnlyTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'nested_kwonly_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'nested_kwonly_census' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'nested_kwonly_ir'.
	self ___forgetCanonicalModule___: 'nested_kwonly_census'.
	irModule := nil

]

{ #category : 'Grail-Tests - nested keyword-only' }
NestedKeywordOnlyTestCase >> testEveryNestedKeywordOnlyShapeAgreesWithCPythonUnderIR [
	"All fourteen shapes with the seam forced on.

	The three that distinguish a LIVE cell from an inlined default are
	``assigning_kwdefaults_changes_the_next_call'',
	``deleting_a_default_makes_the_parameter_required'' and
	``each_closure_has_its_own_cell''.  The rest pin what surrounds it: the
	keyword-only names kept out of **kwargs, the caller's dict left unmutated,
	and the default expression evaluated once at DEF time rather than per call."

	| bad |
	bad := self ___disagreeingKeys___.
	self assert: bad isEmpty
		description: 'nested keyword-only shapes disagreeing with CPython under IR: '
			, bad asArray printString

]

{ #category : 'Grail-Tests - nested keyword-only' }
NestedKeywordOnlyTestCase >> testNestedKeywordOnlyIsNowEligible [
	"The assertion that fails if the cut is reverted.

	MEASURED BOTH WAYS on this fixture.  With the refusal restored it censuses
	9 `nestedDef:kwonly' and compiles 3 of the 12; the behavioural test above
	STILL PASSES, because the text twin answers all fourteen correctly.  With
	the cut, 12 compiled and no refusal of any kind."

	| counts |
	importlib ___irCodegenEnabled___ ifFalse: [^ self].
	counts := self ___censusCountsForFixture___.
	self assert: (counts at: #'nestedDef:kwonly' ifAbsent: [0]) = 0
		description: 'a nested keyword-only def still refuses: ' , counts printString.
	self assert: (counts at: #'compiled' ifAbsent: [0]) >= 12
		description: 'fewer defs compiled than the cut measured (12): '
			, counts printString

]

{ #category : 'Grail-Tests - nested keyword-only' }
NestedKeywordOnlyTestCase >> testTheIRArmActuallyCompiledTheFixture [
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
