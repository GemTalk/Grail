Class {
	#name : 'EnumMidbuildLookupTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
EnumMidbuildLookupTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
EnumMidbuildLookupTestCase >> setUp [
	"Reload tests/python/enum_midbuild_lookup.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_midbuild_lookup' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_midbuild_lookup.py')
		name: 'enum_midbuild_lookup'.

]

{ #category : 'Grail-Tests - cls(value) during construction' }
EnumMidbuildLookupTestCase >> testAnEarlierMemberIsReachable [
	"Not merely non-recursive -- the lookup gives the RIGHT answer, growing as
	members are added."

	self assert: (self resultAt: 'backwards') asString
		equals: 'none-yet;<BackEnum.one: 1>;<BackEnum.one: 1>'.

]

{ #category : 'Grail-Tests - The ordinary path is unchanged' }
EnumMidbuildLookupTestCase >> testAWellFormedEnumStillBuilds [
	"The same UniqueEnum base with no duplicate defines cleanly -- the lookup
	running during construction must not reject honest members."

	self assert: (self resultAt: 'clean') asString
		equals: '<Color.red: 1>;<Color.green: 2>;<Color.blue: 3>'.

]

{ #category : 'Grail-Tests - The ordinary path is unchanged' }
EnumMidbuildLookupTestCase >> testLookupAfterConstruction [
	"Moving the metaclass fixup earlier must leave the finished class calling
	exactly as before: by value, by name, identity, and the ValueError."

	self assert: (self resultAt: 'after_lookup') asString equals: '<Color.green: 2>'.
	self assert: (self resultAt: 'after_by_name') asString equals: '<Color.blue: 3>'.
	self assert: (self resultAt: 'after_identity').
	self assert: (self resultAt: 'after_bad') asString equals: '99 is not a valid Color'.

]

{ #category : 'Grail-Tests - cls(value) during construction' }
EnumMidbuildLookupTestCase >> testTheMessageThatUsedToRecurse [
	"The defect in one line: building this message called cls(self.value), which
	built an instance and re-entered __init__ until RecursionError.  It now
	answers the member and reads exactly as CPython's does."

	self assert: (self resultAt: 'message') asString
		equals: 'aliases not allowed in UniqueEnum:  ''grene'' --> ''green'''.

]

{ #category : 'Grail-Tests - cls(value) during construction' }
EnumMidbuildLookupTestCase >> testWhatEachMemberSeesOfItself [
	"A member is registered AFTER its __init__ returns, in CPython as in Grail,
	so its own value does not resolve while it is being built -- and the FIRST
	member, with nothing registered at all, gets CPython's ``has no members''
	TypeError rather than a ValueError."

	self assert: (self resultAt: 'progressive') asString
		equals: 'a(1) own=TypeError:has-no-members earlier=[];b(2) own=ValueError earlier=[''a''];c(3) own=ValueError earlier=[''a'', ''b'']'.

]
