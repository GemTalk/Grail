Class {
	#name : 'EnumNestedClassTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
EnumNestedClassTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
EnumNestedClassTestCase >> setUp [
	"Reload tests/python/enum_nested_class.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_nested_class' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_nested_class.py')
		name: 'enum_nested_class'.

]

{ #category : 'Grail-Tests - Naming a class is still a member' }
EnumNestedClassTestCase >> testAClassDefinedElsewhereMakesAnOrdinaryMember [
	"The case the __qualname__ test exists to keep: ``i = int'' binds a class
	too, and it IS a member whose value is that class."

	self assert: (self resultAt: 'named_is_member') asString
		equals: '[''i'', ''s'', ''f'']'.
	self assert: (self resultAt: 'named_value').
	self assert: (self resultAt: 'int_value').
	self assert: (self resultAt: 'str_value').

]

{ #category : 'Grail-Tests - Every flavour, and deeper nesting' }
EnumNestedClassTestCase >> testAnEnumThatIsItselfNested [
	"CPython tests endswith rather than equality because the qualname carries
	the whole chain (Wrapper.Deep.Inner).  Grail's __qualname__ stops at the
	immediately-enclosing class, so it answers Deep.Inner and the EQUALITY
	branch takes it -- a separate gap that does not change the answer here."

	self assert: (self resultAt: 'deep_is_type').
	self assert: (self resultAt: 'deep_list') asString equals: '[<Deep.a: 1>]'.

]

{ #category : 'Grail-Tests - Every flavour, and deeper nesting' }
EnumNestedClassTestCase >> testIntEnumAndFlag [
	"The rule lives in the shared member pass, so a plain helper class nested in
	an IntEnum or a Flag is excluded the same way."

	self assert: (self resultAt: 'int_enum_list') asString equals: '[<Ints.one: 1>]'.
	self assert: (self resultAt: 'int_enum_helper') equals: 3.
	self assert: (self resultAt: 'flag_list') asString equals: '[<Flags.RED: 1>]'.
	self assert: (self resultAt: 'flag_helper_is_type').

]

{ #category : 'Grail-Tests - The decorators still override' }
EnumNestedClassTestCase >> testMemberForcesANestedClassBack [
	"@member is precisely the escape hatch CPython's DeprecationWarning pointed
	at, so the pre-3.13 shape is still expressible."

	self assert: (self resultAt: 'forced_is_member').
	self assert: (self resultAt: 'forced_list') asString
		equals: '[<Forced.a: 1>, <Forced.Inner: <enum ''Inner''>>]'.
	self assert: (self resultAt: 'forced_reaches_class') equals: 10.

]

{ #category : 'Grail-Tests - The decorators still override' }
EnumNestedClassTestCase >> testNonmemberIsUnchanged [
	"Already excluded, and it stays excluded -- the two rules agree rather than
	fighting."

	self assert: (self resultAt: 'nonmember_is_type').
	self assert: (self resultAt: 'nonmember_list') asString equals: '[<Excluded.a: 1>]'.

]

{ #category : 'Grail-Tests - A nested class is not a member' }
EnumNestedClassTestCase >> testTheNameAnswersTheClassItself [
	"The defect in one line: Outer.Inner was a member WRAPPING the class, so it
	was not a type and its own members were unreachable through it."

	self assert: (self resultAt: 'is_type').
	self assert: (self resultAt: 'inner_repr') asString equals: '<enum ''Inner''>'.
	self assert: (self resultAt: 'inner_usable') equals: 10.
	self assert: (self resultAt: 'inner_list') asString
		equals: '[<Inner.foo: 10>, <Inner.bar: 11>]'.

]

{ #category : 'Grail-Tests - A nested class is not a member' }
EnumNestedClassTestCase >> testTheOuterEnumDoesNotCountIt [
	"Not in iteration, not in __members__, and not reachable by value -- it is
	an ordinary class attribute, so there is no member to find."

	self assert: (self resultAt: 'outer_list') asString
		equals: '[<Outer.a: 1>, <Outer.b: 2>]'.
	self assert: (self resultAt: 'outer_names') asString equals: '[''a'', ''b'']'.
	self assert: (self resultAt: 'not_by_value') asString equals: 'ValueError'.

]
