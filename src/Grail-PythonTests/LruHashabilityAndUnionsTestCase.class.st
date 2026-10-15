Class {
	#name : 'LruHashabilityAndUnionsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
LruHashabilityAndUnionsTestCase >> setUp [
	"Reload tests/python/lru_hashability_and_unions.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'lru_hashability_and_unions' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/lru_hashability_and_unions.py')
		name: 'lru_hashability_and_unions'.

]

{ #category : 'Grail-Tests - LRU key equality' }
LruHashabilityAndUnionsTestCase >> testEqualKeysShareAnEntry [
	"A user class's __eq__/__hash__ decides key identity, as in CPython.  With
	Smalltalk = (identity for an instance) a fresh _Key(1) missed, and in a
	bounded cache the hit could not TOUCH the stored entry."

	self assert: testModule @env1:equal_keys_share_an_entry asArray
		equals: #( 1 2 2 2 4 2 )

]

{ #category : 'Grail-Tests - LRU hashability' }
LruHashabilityAndUnionsTestCase >> testHashableArgumentsStillCache [
	"The check must not disturb the ordinary path: a repeated argument is
	still one miss, not two."

	self assert: testModule @env1:hashable_arguments_still_cache asArray
		equals: #( 6 6 8 2 ).

]

{ #category : 'Grail-Tests - LRU key equality' }
LruHashabilityAndUnionsTestCase >> testMixedNumericKeysDoNotCrash [
	"A bucket collision compared the cache's Array keys with SMALLTALK =, and
	``SmallFraction = complex'' is a doesNotUnderstand.  Collisions depend on
	object hashes (test_typing lost a different test on different runs);
	3000 complex and 3000 float keys make one certain.  Answers the number of
	wrong results."

	self assert: testModule @env1:mixed_numeric_keys_do_not_crash equals: 0

]

{ #category : 'Grail-Tests - LRU key equality' }
LruHashabilityAndUnionsTestCase >> testNotImplementedEqFallsBackToIdentity [
	"An __eq__ answering NotImplemented became the uncatchable ``Expected
	NotImplemented to be a Boolean'' on a collision; Python's == falls back
	to identity."

	self assert: testModule @env1:not_implemented_eq_falls_back_to_identity asArray
		equals: #( 0 0 3000 )

]

{ #category : 'Grail-Tests - Union registration' }
LruHashabilityAndUnionsTestCase >> testOptionalUnionRegistersNoneType [
	"``X | None'' is a union including type(None), so None dispatches to the
	registered implementation rather than the default."

	self assert: testModule @env1:optional_union_dispatch asArray
		equals: #( 'default' 'union' 'union' ).

]

{ #category : 'Grail-Tests - Union registration' }
LruHashabilityAndUnionsTestCase >> testPep604UnionRegisters [
	"The ``int | float'' spelling."

	self assert: testModule @env1:pep604_union_dispatch asArray
		equals: #( 'default' 'union' 'union' ).

]

{ #category : 'Grail-Tests - Union registration' }
LruHashabilityAndUnionsTestCase >> testSubscriptedUnionMemberIsStillRejected [
	"``list[int] | str'' is not a union of plain classes; CPython rejects it.
	Keeping this red is what stops the union support from degenerating into a
	bare ``contains a bracket'' test."

	self assert: testModule @env1:subscripted_union_member_is_still_rejected
		equals: 'TypeError'.

]

{ #category : 'Grail-Tests - Union registration' }
LruHashabilityAndUnionsTestCase >> testTypingUnionRegisters [

	self assert: testModule @env1:typing_union_dispatch asArray
		equals: #( 'default' 'union' 'union' ).

]

{ #category : 'Grail-Tests - LRU hashability' }
LruHashabilityAndUnionsTestCase >> testUnhashableArgumentRaisesTypeError [
	"list, dict and set, at both an unbounded and a bounded maxsize -- the two
	bounds take different paths through the wrapper."

	self assert: testModule @env1:unhashable_argument_raises_type_error asArray
		equals: #( 'TypeError' 'TypeError' 'TypeError' 'TypeError' ).

]

{ #category : 'Grail-Tests - LRU hashability' }
LruHashabilityAndUnionsTestCase >> testUnhashableKeywordArgumentRaisesTypeError [
	"Keyword values join the key too, so they need the same check."

	self assert: testModule @env1:unhashable_keyword_argument_raises_type_error
		equals: 'TypeError'.

]

{ #category : 'Grail-Tests - LRU hashability' }
LruHashabilityAndUnionsTestCase >> testUnhashableUserClassRaisesTypeError [
	"A class made unhashable at creation time (defines __eq__, no __hash__)
	is rejected as well -- the check asks for the Python hash rather than
	testing a fixed list of builtin types."

	self assert: testModule @env1:unhashable_by_class_body_raises
		equals: 'TypeError'.

]
