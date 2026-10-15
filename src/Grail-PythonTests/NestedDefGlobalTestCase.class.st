Class {
	#name : 'NestedDefGlobalTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'irModule',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
NestedDefGlobalTestCase >> ___expectedReprOf___: aKey [
	^ ((self ___irModule___ @env1:___pyAttrLoad___: #'EXPECTED')
		@env1:__getitem__: aKey) @env1:__repr__ @env0:asString

]

{ #category : 'Grail-Private' }
NestedDefGlobalTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/nested_def_global.py'

]

{ #category : 'Grail-Private' }
NestedDefGlobalTestCase >> ___irModule___ [
	"The fixture with the seam FORCED ON, under its own module name.

	Forced rather than inherited: what this pins is an ELIGIBILITY widening, so
	a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'ndg_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'ndg_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'ndg_ir'.
	^ irModule

]

{ #category : 'Grail-Private' }
NestedDefGlobalTestCase >> ___keys___ [
	"Named rather than read from the fixture so a key that stops being produced
	fails here instead of silently dropping out of the comparison."

	^ #('inside_a_method' 'augassign_shadowed' 'two_names_one_statement'
	    'doubly_nested_reads_it' 'a_loop_target_is_global'
	    'an_except_target_is_global' 'a_del_of_a_global'
	    'a_lambda_inside_reads_it' 'an_unbound_global'
	    'the_enclosing_declares_it_too' 'a_parameter_of_the_enclosing')

]

{ #category : 'Grail-Private' }
NestedDefGlobalTestCase >> ___reprOf___: aKey [
	^ ((self ___irModule___ @env1:___pyAttrLoad___: #'r') @env1:__getitem__: aKey)
		@env1:__repr__ @env0:asString

]

{ #category : 'Grail-Setup' }
NestedDefGlobalTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'ndg_ir' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'ndg_ir'.
	irModule := nil

]

{ #category : 'Grail-Tests - global in a nested def' }
NestedDefGlobalTestCase >> testEveryBinderRoutesToTheModule [
	"The four binders that are NOT a plain assignment, each of which decides
	local-versus-module through its own ``leafFor:'' test: an augmented assign,
	a ``for'' target, an except-as target and a ``del''.  Removing the name
	from the local table is what makes all of them route together; a fix in
	AssignAst alone would have left these four wrong."

	| bad |
	bad := OrderedCollection new.
	#('augassign_shadowed' 'a_loop_target_is_global'
	  'an_except_target_is_global' 'a_del_of_a_global') do: [:k |
		| got want |
		got := self ___reprOf___: k.
		want := self ___expectedReprOf___: k.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	self assert: bad isEmpty
		description: 'a binder still routes to the enclosing local: '
			, bad asArray printString

]

{ #category : 'Grail-Tests - global in a nested def' }
NestedDefGlobalTestCase >> testEveryNestedGlobalShapeAgreesWithCPythonUnderIR [
	"Eleven shapes with the seam forced on.

	Every one of them has an ENCLOSING LOCAL of the same name as the global and
	reports both bindings, so a store landing in the wrong place cannot be
	masked by a read landing in the same wrong place -- which is exactly how
	this defect looked before the shapes were written that way."

	| bad |
	bad := OrderedCollection new.
	self ___keys___ do: [:k |
		| got want |
		got := self ___reprOf___: k.
		want := self ___expectedReprOf___: k.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	self assert: bad isEmpty
		description: 'nested-def global shapes disagreeing with CPython under IR: '
			, bad asArray printString

]

{ #category : 'Grail-Tests - global in a nested def' }
NestedDefGlobalTestCase >> testTheIRArmActuallyCompiledTheFixture [
	"A guard on the guard, and the only instrument that could see the
	doubly-nested shape: its closure-cell build RAISED, the seam caught it, and
	the enclosing method compiled as text with every value still correct.  A
	behavioural assertion cannot tell that apart from a clean IR compile.

	On a platform without IR support the forced flag is correctly a no-op and
	there is nothing to assert."

	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'.
	self assert: (stats at: #compiled) >= 9
		description: 'fewer defs compiled than the cut measured (9, against 1 '
			, 'with the refusal): compiled = ' , (stats at: #compiled) printString

]

{ #category : 'Grail-Tests - global in a nested def' }
NestedDefGlobalTestCase >> testTheStoreAndTheReadAgreeWithEachOther [
	"The defect, stated on its own rather than as one of eleven.

	``inside_a_method'' reports the nested def's own read first and the
	ENCLOSING method's local second.  Before the cut those two came back as
	('' the stale module value '', '' the value the nested def stored '') --
	the store had gone to the enclosing temp and the read to the module.  Both
	halves are asserted here, because either alone is satisfied by the bug."

	| got |
	got := self ___reprOf___: 'inside_a_method'.
	self assert: got = '(''set from a method nested def'', ''method local'')'
		description: 'the nested store and read disagree about where ''g1'' lives: '
			, got

]
