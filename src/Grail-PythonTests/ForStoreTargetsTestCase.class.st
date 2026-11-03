"tests/python/for_store_targets.py -- a for / async for loop whose target is a
subscript or an attribute, alone or as a tuple leaf -- held to CPython on both
codegen paths, with the IR arm proven to have compiled it."
Class {
	#name : 'ForStoreTargetsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'irModule',
		'textModule',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ForStoreTargetsTestCase >> ___censusCounts___ [
	"Load the fixture under the ELIGIBILITY CENSUS and answer its counts."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'fstores_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'fstores_census'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib loadModuleFromPath: self ___fixturePath___ name: 'fstores_census']
		ensure: [importlib ___irCensusOn: false].
	^ importlib ___irCensus___ at: #counts

]

{ #category : 'Grail-Private' }
ForStoreTargetsTestCase >> ___disagreeingKeysIn___: aModule [
	| bad |
	bad := OrderedCollection new.
	self ___keys___ do: [:k |
		| got want |
		got := self ___reprOf___: aModule key: k.
		want := self ___expectedReprOf___: aModule key: k.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	^ bad

]

{ #category : 'Grail-Private' }
ForStoreTargetsTestCase >> ___expectedReprOf___: aModule key: aKey [
	^ ((aModule @env1:___pyAttrLoad___: #'EXPECTED') @env1:__getitem__: aKey)
		@env1:__repr__ @env0:asString

]

{ #category : 'Grail-Private' }
ForStoreTargetsTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/for_store_targets.py'

]

{ #category : 'Grail-Private' }
ForStoreTargetsTestCase >> ___irModule___ [
	"Forced on, under its own module name: what this pins is an ELIGIBILITY
	widening, so a flag-off run would exercise none of it."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'fstores_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'fstores_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'fstores_ir'.
	^ irModule

]

{ #category : 'Grail-Private' }
ForStoreTargetsTestCase >> ___keys___ [
	"Named rather than read from the dict, so a key the fixture stops producing
	fails here instead of silently dropping out of the comparison."

	^ #('subscript_list_target' 'subscript_dict_target' 'subscript_slice_target'
	    'attribute_target' 'slot_attribute_target' 'tuple_of_store_leaves'
	    'nested_and_starred_store_leaves' 'order_subscript' 'order_attribute'
	    'order_tuple_leaves' 'zero_trip_evaluates_no_target'
	    'store_raises_mid_loop' 'store_raising_stop_iteration_propagates'
	    'break_skips_else' 'else_runs_after_drain' 'closure_cell_target'
	    'self_attribute_target' 'async_subscript_target' 'async_attribute_target'
	    'async_tuple_of_store_leaves' 'async_order_subscript'
	    'async_store_raising_stop_async_iteration' 'async_break_and_else')

]

{ #category : 'Grail-Private' }
ForStoreTargetsTestCase >> ___reprOf___: aModule key: aKey [
	^ ((aModule @env1:___pyAttrLoad___: #'r') @env1:__getitem__: aKey)
		@env1:__repr__ @env0:asString

]

{ #category : 'Grail-Private' }
ForStoreTargetsTestCase >> ___textModule___ [
	textModule ifNotNil: [^ textModule].
	(importlib @env1:modules) removeKey: #'fstores_text' ifAbsent: [].
	self ___forgetCanonicalModule___: 'fstores_text'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: false.
	textModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'fstores_text'.
	^ textModule

]

{ #category : 'Grail-Setup' }
ForStoreTargetsTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	#('fstores_ir' 'fstores_text' 'fstores_census') do: [:n |
		(importlib @env1:modules) removeKey: n asSymbol ifAbsent: [].
		self ___forgetCanonicalModule___: n].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	irModule := nil.
	textModule := nil

]

{ #category : 'Grail-Tests - a store for target' }
ForStoreTargetsTestCase >> testEveryShapeAgreesWithCPythonOnTheTextPath [
	"The text twin agrees too -- in particular on the ORDER: it used to pass
	the step to the store as an argument, so the target's object and index
	ran before each item was fetched and once more on the draining step
	(``order_*'', ``zero_trip_evaluates_no_target'')."

	| bad |
	bad := self ___disagreeingKeysIn___: self ___textModule___.
	self assert: bad isEmpty
		description: 'store for targets disagreeing with CPython on the text path: '
			, bad asArray printString

]

{ #category : 'Grail-Tests - a store for target' }
ForStoreTargetsTestCase >> testEveryShapeAgreesWithCPythonUnderIR [
	| bad |
	bad := self ___disagreeingKeysIn___: self ___irModule___.
	self assert: bad isEmpty
		description: 'store for targets disagreeing with CPython under IR: '
			, bad asArray printString

]

{ #category : 'Grail-Tests - a store for target' }
ForStoreTargetsTestCase >> testNoLoopInTheFixtureRefuses [
	"The assertion that fails if the cut is reverted, and the only instrument
	that can see it: an eligibility refusal never reaches the seam, so it is
	not a FALLBACK, and the agreement tests above would keep passing on the
	text twin.  Every top-level def in the fixture compiles -- 25 of them --
	and no row of any kind names a ForAst."

	| counts forRows |
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	counts := self ___censusCounts___.
	forRows := counts keys select: [:k | k asString includesString: 'ForAst'].
	self assert: forRows isEmpty
		description: 'a for loop still refuses: ' , counts printString.
	self assert: (counts at: #fallback ifAbsent: [0]) = 0
		description: 'an eligible def fell back: ' , counts printString.
	self assert: (counts at: #compiled ifAbsent: [0]) >= 25
		description: 'fewer top-level defs compiled than the fixture holds (25): '
			, counts printString

]

{ #category : 'Grail-Tests - a store for target' }
ForStoreTargetsTestCase >> testTheIRArmActuallyCompiledTheFixture [
	"A guard on the guard: correct answers prove nothing if the seam fell back
	to text."

	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'.
	self assert: (stats at: #compiled) >= 25
		description: 'fewer defs compiled than the fixture holds (25): compiled = '
			, (stats at: #compiled) printString

]
