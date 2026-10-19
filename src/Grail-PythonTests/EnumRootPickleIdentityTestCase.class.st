Class {
	#name : 'EnumRootPickleIdentityTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
EnumRootPickleIdentityTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
EnumRootPickleIdentityTestCase >> setUp [
	"Reload tests/python/enum_root_pickle_identity.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_root_pickle_identity' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_root_pickle_identity.py')
		name: 'enum_root_pickle_identity'.

]

{ #category : 'Grail-Tests - Flag composites' }
EnumRootPickleIdentityTestCase >> testCompositeFlagValue [
	"``LARRY | CURLY'' is a cached composite pseudo-member, so it has an identity
	to preserve as much as a named member does."

	self assert: (self resultAt: 'composite').
	self assert: (self resultAt: 'composite_value') equals: 3.

]

{ #category : 'Grail-Tests - A mixin keeps its own __reduce__' }
EnumRootPickleIdentityTestCase >> testDataTypeReduceIsNotDisplaced [
	"NamedInt defines __reduce__ and NEI mixes it in.  By MRO the mixin's wins
	for __reduce__, and Enum's __reduce_ex__ -- which pickle asks for first --
	is what makes the MEMBER pickle by value while a plain NamedInt still uses
	the mixin's own."

	self assert: (self resultAt: 'mixin_member').
	self assert: (self resultAt: 'mixin_plain') asString equals: '5'.

]

{ #category : 'Grail-Tests - Round-trip identity' }
EnumRootPickleIdentityTestCase >> testEveryFlavourRoundTripsToTheSameObject [
	"All seven, every protocol.  The four that already worked are in the list on
	purpose: they are what showed the three that did not."

	self assert: (self resultAt: 'identity') asString
		equals: 'IntEnum=ok;IntFlag=ok;StrEnum=ok;Flag=ok;Enum=ok;int,Enum=ok;str,Enum=ok'.

]

{ #category : 'Grail-Tests - What __reduce__ answers' }
EnumRootPickleIdentityTestCase >> testReduceShape [
	"(cls, (value,)) -- unpickling calls cls(value), and the value lookup is what
	returns the canonical singleton."

	self assert: (self resultAt: 'reduce') asString equals: '(<flag ''IF''>, (2,))'.
	self assert: (self resultAt: 'reduce_ex') asString equals: '(<flag ''IF''>, (2,))'.
	self assert: (self resultAt: 'reduce_agrees').

]

{ #category : 'Grail-Tests - Round-trip identity' }
EnumRootPickleIdentityTestCase >> testTheClassesRoundTripToo [
	"By reference, through the module -- unaffected by the member protocol, and
	pinned so a change to one is not mistaken for the other."

	self assert: (self resultAt: 'classes') asString
		equals: 'IntEnum=True;IntFlag=True;StrEnum=True;Flag=True;Enum=True;int,Enum=True;str,Enum=True'.

]

{ #category : 'Grail-Tests - The value survives' }
EnumRootPickleIdentityTestCase >> testValuesKeepTheirType [
	self assert: (self resultAt: 'int_value') asString equals: '2'.
	self assert: (self resultAt: 'str_value') asString equals: '''b'''.

]
