Class {
	#name : 'AsyncGenExpTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'irModule',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
AsyncGenExpTestCase >> ___disagreeingKeys___ [
	"Every fixture key whose actual value differs from its EXPECTED one,
	compared by repr so a failure prints both sides whole."

	| mod results expected bad |
	mod := self ___irModule___.
	results := mod @env1:___pyAttrLoad___: #'r'.
	expected := mod @env1:___pyAttrLoad___: #'EXPECTED'.
	bad := OrderedCollection new.
	self ___keys___ do: [:k |
		| got want |
		got := ((results @env1:__getitem__: k) @env1:__repr__) @env0:asString.
		want := ((expected @env1:__getitem__: k) @env1:__repr__) @env0:asString.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	^ bad

]

{ #category : 'Grail-Private' }
AsyncGenExpTestCase >> ___irModule___ [
	"The fixture with the seam FORCED ON, under a second module name.

	Forced rather than inherited: what this pins is an ELIGIBILITY widening, so
	a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'async_genexp_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'async_genexp_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/async_generator_expression.py')
		name: 'async_genexp_ir'.
	^ irModule

]

{ #category : 'Grail-Private' }
AsyncGenExpTestCase >> ___keys___ [
	"Named rather than read from the dict so a fixture key that stops being
	produced fails here instead of silently dropping out of the comparison."

	^ #('a_plain_async_genexp'
	    'a_filtered_async_genexp'
	    'async_then_sync_clause'
	    'sync_then_async_clause'
	    'each_genexp_binds_its_own_loop_variable'
	    'a_one_shot_source_is_not_restarted'
	    'it_is_lazy'
	    'the_element_may_await'
	    'an_empty_source'
	    'it_is_an_async_generator'
	    'async_comp_over_a_plain_list'
	    'async_genexp_over_a_plain_list'
	    'awaits_in_a_genexp_from_a_plain_def'
	    'awaits_in_a_genexp_from_an_async_def')

]

{ #category : 'Grail-Setup' }
AsyncGenExpTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'async_genexp_ir' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'async_genexp_ir'.
	irModule := nil.

]

{ #category : 'Grail-Tests - async generator expressions' }
AsyncGenExpTestCase >> testAsyncComprehensionOverAPlainListStillRaises [
	"THE REGRESSION THIS CUT SHIPPED WITH FOR THREE SESSIONS, pinned.

	A LIST comprehension supplies no construction-time iterator, so its
	outermost clause MUST acquire one, and a plain list has no __aiter__ --
	CPython raises TypeError and so must both Grail paths.  When the
	already-acquired flag is derived from the wrong variable this silently
	answers an uncatchable ``a UndefinedObject does not understand nil''
	instead, while every genexp assertion above still passes.

	Asserted separately from the sweep above so a failure names the shape
	rather than appearing as one entry in a list of fourteen."

	| mod got |
	mod := self ___irModule___.
	got := ((mod @env1:___pyAttrLoad___: #'r')
		@env1:__getitem__: 'async_comp_over_a_plain_list') @env0:asString.
	self assert: got = 'TypeError: True'
		description: 'an async comprehension over a plain list no longer raises '
			, 'the TypeError CPython raises: ' , got printString

]

{ #category : 'Grail-Tests - async generator expressions' }
AsyncGenExpTestCase >> testEveryShapeAgreesWithCPythonUnderIR [
	"All fourteen shapes with the seam forced on.

	``a_one_shot_source_is_not_restarted'' is the one that fails if the
	outermost clause acquires the iterator twice: its hand-written iterator
	counts how often __aiter__ is asked for, and the answer must be one.
	``each_genexp_binds_its_own_loop_variable'' is the one that fails if the
	outermost iterable is evaluated lazily instead of at construction."

	| bad |
	bad := self ___disagreeingKeys___.
	self assert: bad isEmpty
		description: 'async genexp shapes disagreeing with CPython under IR: '
			, bad asArray printString

]

{ #category : 'Grail-Tests - async generator expressions' }
AsyncGenExpTestCase >> testTheIRArmActuallyCompiledTheFixture [
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
