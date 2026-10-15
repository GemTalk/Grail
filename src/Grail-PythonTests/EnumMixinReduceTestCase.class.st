Class {
	#name : 'EnumMixinReduceTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
EnumMixinReduceTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
EnumMixinReduceTestCase >> setUp [
	"Reload tests/python/enum_mixin_reduce.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_mixin_reduce' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_mixin_reduce.py')
		name: 'enum_mixin_reduce'.

]

{ #category : 'Grail-Tests - Lookup and the functional API stay apart' }
EnumMixinReduceTestCase >> testFunctionalApiStillRoutesThere [
	"A string first argument followed by something that could BE names -- a
	names string, a mapping -- is still the functional API."

	self assert: (self resultAt: 'functional') asString equals: 'a,b,c'.
	self assert: (self resultAt: 'functional_dict') asString equals: 'p=1,q=2'.

]

{ #category : 'Grail-Tests - Enum supplies __reduce_ex__' }
EnumMixinReduceTestCase >> testMemberRoundTripsByIdentity [
	self assert: (self resultAt: 'roundtrip').
	self assert: (self resultAt: 'roundtrip_class').

]

{ #category : 'Grail-Tests - A mixin may override __reduce_ex__' }
EnumMixinReduceTestCase >> testMixinReduceExWinsAndStillRoundTrips [
	"Then the member pickles as its CONSTRUCTOR arguments and unpickling is the
	multi-value call NEIEx('the-y', 2) -- which used to reach the functional API
	and die on ``'int' object is not iterable''."

	self assert: (self resultAt: 'ex_reduce_ex') asString
		equals: '(<enum ''NEIEx''>, (''the-y'', 2))'.
	self assert: (self resultAt: 'ex_roundtrip').

]

{ #category : 'Grail-Tests - A mixin may override __reduce_ex__' }
EnumMixinReduceTestCase >> testMultiValueCallWithAStringFirstArgument [
	"The same call written directly.  A mixed-in enum's value is
	member_type(*args), so the lookup must construct before it can match."

	self assert: (self resultAt: 'ex_direct_call').

]

{ #category : 'Grail-Tests - Ordinary enums untouched' }
EnumMixinReduceTestCase >> testPlainEnumReduceExAndRoundTrip [
	self assert: (self resultAt: 'plain_reduce_ex') asString
		equals: '(<enum ''Plain''>, (2,))'.
	self assert: (self resultAt: 'plain_roundtrip_member').

]

{ #category : 'Grail-Tests - Enum supplies __reduce_ex__' }
EnumMixinReduceTestCase >> testPlainMixinInstanceStillUsesItsOwnReduce [
	"Only the MEMBER changes: an ordinary NamedInt is not an enum member and
	round-trips through the mixin's own __reduce__."

	self assert: (self resultAt: 'plain_roundtrip').

]

{ #category : 'Grail-Tests - Lookup and the functional API stay apart' }
EnumMixinReduceTestCase >> testPlainMultiValueMemberUnchanged [
	"Cardinal's value IS the tuple, so the packed lookup matches directly and
	never reaches the constructor retry."

	self assert: (self resultAt: 'cardinal').
	self assert: (self resultAt: 'cardinal_tuple').

]

{ #category : 'Grail-Tests - Enum supplies __reduce_ex__' }
EnumMixinReduceTestCase >> testTheMixinKeepsReduceAndEnumSuppliesReduceEx [
	"Both halves of the MRO split, which is the whole point: __reduce__ is the
	mixin's, __reduce_ex__ -- the one pickle asks for -- is Enum's, and answers
	the member's VALUE."

	self assert: (self resultAt: 'member_reduce') asString
		equals: '(<enum ''NEI''>, (''the-y'', 2))'.
	self assert: (self resultAt: 'member_reduce_ex') asString
		equals: '(<enum ''NEI''>, (NamedInt(''the-y'', 2),))'.

]
