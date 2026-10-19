Class {
	#name : 'PartialCallableAndCopyTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
PartialCallableAndCopyTestCase >> setUp [
	"Reload tests/python/partial_callable_and_copy.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'partial_callable_and_copy' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/partial_callable_and_copy.py')
		name: 'partial_callable_and_copy'.

]

{ #category : 'Grail-Tests - keywords' }
PartialCallableAndCopyTestCase >> testAKeyWhoseStrMutatesTheKeywordsDict [
	"The repr renders each pair as f'{k}={v!r}', so formatting the KEY runs
	arbitrary Python -- and here that Python inserts into the very dict being
	formatted.  The pairs are snapshotted before any formatting runs, which
	both avoids mutation mid-iteration and keeps the ORIGINAL value as the one
	printed (CPython's GH-144475 fix)."

	self assert: testModule @env1:keystr_mutating_the_keywords_dict asArray
		equals: #( true true ).

]

{ #category : 'Grail-Tests - keywords' }
PartialCallableAndCopyTestCase >> testANonStringKeywordRepersThenRaisesOnCall [
	"``keywords'' is an ordinary mutable dict, so 1234 can be put in it.
	CPython tolerates that until the CALL -- where it is a TypeError -- and
	renders the key with str().  Grail used to pass the key straight down and
	let the callee make of it what it would."

	| got |
	got := testModule @env1:non_string_keyword_repr_and_call asArray.
	self assert: (got at: 1) equals: true.
	self assert: (got at: 2) equals: true.
	self assert: (got at: 3) @env0:asString
		equals: 'TypeError: keywords must be strings'.

]

{ #category : 'Grail-Tests - callable' }
PartialCallableAndCopyTestCase >> testCallableAcrossEveryKind [
	"In fixture order: a plain instance; __call__ at three arities; a
	partial; an lru_cache wrapper; a function; a lambda; a class; then
	int, str, None, list, dict, tuple and a module."

	self assert: testModule @env1:callable_across_kinds asArray
		equals: #( false true true true true true true true true
			false false false false false false false ).

]

{ #category : 'Grail-Tests - deepcopy' }
PartialCallableAndCopyTestCase >> testDeepcopyLeavesAtomsShared [
	"Immutables are still answered as themselves -- the new reduce branch
	must not start rebuilding ints, strings and unchanged tuples."

	self assert: testModule @env1:deepcopy_leaves_atoms_alone
		equals: 'atoms shared'.

]

{ #category : 'Grail-Tests - deepcopy' }
PartialCallableAndCopyTestCase >> testDeepcopyMemoKeepsOriginalsAlive [
	"The memo is keyed by id() and Grail recycles id slots on collection, so a
	temporary dying mid-copy could pass its id to a later object and make that
	object's lookup answer an unrelated copy (deepcopy of
	``partial(f, ['asdf'])'' answered [[<BoundMethod>]] for ['asdf']).
	copy.py now holds the originals for the duration, as CPython's does."

	self assert: testModule @env1:deepcopy_memo_keeps_originals_alive asArray
		equals: #( true true true ).

]

{ #category : 'Grail-Tests - deepcopy' }
PartialCallableAndCopyTestCase >> testDeepcopyOfAPartialCopiesItsState [
	"Object, __dict__ attribute, args tuple, an element of args, the
	keywords dict, and a keyword value -- all distinct from the original.
	deepcopy used to hand back the very same partial."

	self assert: testModule @env1:deepcopy_partial asArray
		equals: #( true true true true true true ).

]

{ #category : 'Grail-Tests - deepcopy' }
PartialCallableAndCopyTestCase >> testDeepcopyOfAPartialStillComputesTheSameThing [
	"A copy that no longer computes the same answer would be worse than an
	alias, so check the reconstruction and not only the identities."

	self assert: testModule @env1:deepcopy_partial_keeps_behaviour asArray
		equals: #( true true ).

]

{ #category : 'Grail-Tests - deepcopy' }
PartialCallableAndCopyTestCase >> testDeepcopyStillRecursesContainers [
	"Guard on the branches that already worked."

	self assert: testModule @env1:deepcopy_still_recurses_containers asArray
		equals: #( true true true true true ).

]

{ #category : 'Grail-Tests - callable' }
PartialCallableAndCopyTestCase >> testPartialIsCallableThroughTheIndirectProtocol [
	"A partial reached generically -- here a partialmethod wrapping one --
	used to hit object's ``not callable'' raiser.  Only that it now REACHES
	the partial is asserted: the argument order is still wrong, and belongs
	to the separate partialmethod gap."

	self assert: testModule @env1:partial_over_partial_no_longer_raises
		equals: 'called, keywords={''c'': 6}'.

]

{ #category : 'Grail-Tests - callable' }
PartialCallableAndCopyTestCase >> testWhatCallableAcceptsActuallyRuns [
	"Guard: the point of widening the probe is that these were always
	callable, so each must still produce its answer."

	| got |
	got := testModule @env1:callables_still_call asArray.
	self assert: (got at: 1) equals: 'no-args'.
	self assert: (got at: 2) asArray equals: #( 'one-arg' 7 ).
	self assert: (got at: 3) asArray first equals: 'varargs'.
	self assert: (got at: 4) asArray first asArray equals: #( 1 2 ).

]
