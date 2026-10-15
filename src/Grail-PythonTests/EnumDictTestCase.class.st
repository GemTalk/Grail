Class {
	#name : 'EnumDictTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
EnumDictTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
EnumDictTestCase >> setUp [
	"Reload tests/python/enum_dict.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_dict' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_dict.py')
		name: 'enum_dict'.

]

{ #category : 'Grail-Tests - A member name cannot be reused' }
EnumDictTestCase >> testAMemberCannotBecomeADescriptorEither [
	"However the second binding is spelled, the name is taken."

	self assert: (self resultAt: 'member_then_descriptor') asString
		equals: '''one'' already defined as 1'.

]

{ #category : 'Grail-Tests - Sunder and dunder names' }
EnumDictTestCase >> testAReservedSunderIsRefused [
	"Same message the enum class body gives, and for the same reason."

	self assert: (self resultAt: 'bad_sunder') asString
		equals: '_sunder_ names, such as ''_a_sunder_'', are reserved for future Enum use'.

]

{ #category : 'Grail-Tests - Merge operators' }
EnumDictTestCase >> testInPlaceOrKeepsTheClass [
	"``d |= other'' mutates in place, so the object stays an EnumDict and its
	member tracking survives.

	THIS TEST ASSERTED 'dict' -- the opposite -- and was right to, as a record
	of a real divergence.  The cause was not EnumDict's: AugAssignAst emitted
	the bare BINARY operator for a module-scope target, so ``|='' never
	reached __ior__ at all and EVERY mutable type at module scope was replaced
	rather than mutated.  Fixing that closed this with nothing here to change.
	See AugmentedAssignmentTestCase, and note that a recorded gap is worth
	re-measuring when anything underneath it moves."

	self assert: (self resultAt: 'ior_keeps_the_class') asString equals: 'EnumDict'.

]

{ #category : 'Grail-Tests - What is tracked' }
EnumDictTestCase >> testMembersAndValuesInDeclarationOrder [
	"A descriptor between them is skipped, so the two lists stay in step."

	self assert: (self resultAt: 'member_order') asString equals: '[''one'', ''two'', ''three'']'.
	self assert: (self resultAt: 'values_order') asString equals: '[1, 2, 3]'.
	self assert: (self resultAt: 'members') asString equals: '[''a'']'.
	self assert: (self resultAt: 'last_values') asString equals: '[1]'.
	self assert: (self resultAt: 'cls_name') asString equals: 'None'.

]

{ #category : 'Grail-Tests - Sunder and dunder names' }
EnumDictTestCase >> testOrderDunderIsStoredUnderItsModernName [
	"CPython renames __order__ to _order_ on the way in, so the old spelling is
	not left in the mapping."

	self assert: (self resultAt: 'order_rename') asString equals: 'a b;False'.

]

{ #category : 'Grail-Tests - Sunder and dunder names' }
EnumDictTestCase >> testSupportedSunderAndDunderNamesAreNotMembers [
	"They are stored, and they stay out of _member_names."

	self assert: (self resultAt: 'ok_sunder') asString equals: 'x y;[]'.
	self assert: (self resultAt: 'dunder') asString equals: 'docs;[]'.

]

{ #category : 'Grail-Tests - A member name cannot be reused' }
EnumDictTestCase >> testTheDuplicateIsRefused [
	"The whole point of the class, and what ``dict'' could not do."

	self assert: (self resultAt: 'stored') equals: 1.
	self assert: (self resultAt: 'type') asString equals: 'EnumDict'.
	self assert: (self resultAt: 'duplicate') asString equals: '''a'' already defined as 1'.

]

{ #category : 'Grail-Tests - A member name cannot be reused' }
EnumDictTestCase >> testTheMutableMappingInterfaceIsTheOnlyOneOverridden [
	"CPython's own test pins this: |= goes through dict.__ior__ and overwrites
	the value __setitem__ just refused."

	self assert: (self resultAt: 'after_ior') asString equals: 'other value'.

]
