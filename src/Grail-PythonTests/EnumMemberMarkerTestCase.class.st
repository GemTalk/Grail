Class {
	#name : 'EnumMemberMarkerTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
EnumMemberMarkerTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
EnumMemberMarkerTestCase >> setUp [
	"Reload tests/python/enum_member_marker.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_member_marker' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_member_marker.py')
		name: 'enum_member_marker'.

]

{ #category : 'Grail-Tests - @member' }
EnumMemberMarkerTestCase >> testMemberDecoratorOnNestedClass [
	"``@member class Inner(Enum)'' makes Inner a MEMBER of the outer enum whose
	value is the inner class (test_enum test_nested_classes_in_enum_with_member,
	which used to die with a raw Smalltalk doesNotUnderstand)."

	self assert: (self resultAt: 'outer_members') asString equals: 'a,b,Inner'.
	self assert: (self resultAt: 'inner_is_member').
	self assert: (self resultAt: 'inner_value_foo') equals: 10.
	self assert: (self resultAt: 'inner_value_members') asString equals: 'foo,bar'.
	self assert: (self resultAt: 'a_value') equals: 1.

]

{ #category : 'Grail-Tests - @member' }
EnumMemberMarkerTestCase >> testMemberForcesADescriptor [
	"The point of member(): a descriptor is normally NOT a member (the
	_EnumDict rule), and member() overrides exactly that."

	self assert: (self resultAt: 'forced_members') asString equals: 'plain,forced'.

]

{ #category : 'Grail-Tests - @member' }
EnumMemberMarkerTestCase >> testMemberLeavesAnOrdinaryValueAlone [
	"``a = member(7)'' is still just the member 7 -- the marker unwraps."

	self assert: (self resultAt: 'ordinary_value') equals: 7.

]

{ #category : 'Grail-Tests - @member' }
EnumMemberMarkerTestCase >> testNonmemberDecoratorOnNestedClass [
	"Its mirror: ``@nonmember class Inner2'' is NOT a member, and
	``Outer2.Inner2'' is the class itself (test_nested_classes_in_enum_with_
	nonmember, which died the same way)."

	self assert: (self resultAt: 'outer2_members') asString equals: 'a'.
	self assert: (self resultAt: 'inner2_is_class').
	self assert: (self resultAt: 'inner2_x') equals: 5.

]
