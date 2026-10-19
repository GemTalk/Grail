Class {
	#name : 'EnumMemberPropertyTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
EnumMemberPropertyTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
EnumMemberPropertyTestCase >> setUp [
	"Reload tests/python/enum_member_properties.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_member_properties' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_member_properties.py')
		name: 'enum_member_properties'.

]

{ #category : 'Grail-Tests - Enum can hold a class attribute' }
EnumMemberPropertyTestCase >> testAClassLevelStoreOnAnEnumWorks [
	"``Color.extra = ...'' used to reach ___classHolderAttrStore___ and die on
	the missing holder.  Set after the class is built, so it is an ordinary
	class attribute and not a member."

	self assert: (self resultAt: 'class_attribute_store') asString equals: '''set-later'''.
	self assert: (self resultAt: 'store_is_not_a_member') asString equals: 'True'.

]

{ #category : 'Grail-Tests - The flag masks still refuse' }
EnumMemberPropertyTestCase >> testAPlainEnumHasNoFlagMasks [
	"REGRESSION GUARD, and the one that stopped test_enum importing.  These three
	raise AttributeError for a non-flag enum deliberately -- answering 0 would
	make every enum look like an empty flag -- and the secondary-base merge walked
	into Enum and evaluated them the moment Enum had an attribute holder."

	self assert: (self resultAt: 'plain_enum_has_no_masks') asString
		equals: '[''AttributeError'', ''AttributeError'', ''AttributeError'']'.

]

{ #category : 'Grail-Tests - Mixin enums' }
EnumMemberPropertyTestCase >> testAStorageRootedEnumGetsItsOwnCopy [
	"``class Mixed(int, Enum)'' is rooted at AbstractPyInt, so the class-attribute
	walk from it never reaches Enum's holder.  Without a per-class copy the class
	read answered the UnboundMethod ___mergeSecondaryBases___ had copied down --
	so Color.name raised and Mixed.name did not, which is worse than both being
	wrong."

	self assert: (self resultAt: 'int_mixin_class_access') asString
		equals: 'AttributeError'.
	self assert: (self resultAt: 'int_mixin_still_builds') asString
		equals: '[''ONE'', 1, 2]'.

]

{ #category : 'Grail-Tests - The descriptor' }
EnumMemberPropertyTestCase >> testClassAccessIsRefused [
	"The whole point of a DynamicClassAttribute: the enum CLASS keeps its own
	meaning for the name.  An ordinary property answers the descriptor for class
	access and a method answers an UnboundMethod; both are wrong here."

	self assert: (self resultAt: 'class_access_refused') asString
		equals: '[''AttributeError'', ''AttributeError'']'.

]

{ #category : 'Grail-Tests - inspect' }
EnumMemberPropertyTestCase >> testGetmembersFindsBothAndAnswersTheDescriptors [
	"getmembers finds them by sweeping the bases for a DynamicClassAttribute --
	dir() must NOT offer them, which is what makes that sweep necessary -- and
	then falls back to the base's __dict__ because the getattr raises."

	self assert: (self resultAt: 'getmembers_has_both') asString equals: '[True, True]'.
	self assert: (self resultAt: 'getmembers_values_are_the_descriptors') asString
		equals: '[True, True]'.
	self assert: (self resultAt: 'dir_hides_them') asString equals: '[False, False]'.

]

{ #category : 'Grail-Tests - The descriptor' }
EnumMemberPropertyTestCase >> testNameAndValueAreDynamicClassAttributes [
	"``Enum.__dict__['name']'' is the descriptor itself, which is what both
	inspect tests compare their result against -- so it has to BE one, not
	merely answer the same value."

	self assert: (self resultAt: 'dict_holds_descriptor') asString
		equals: '[True, True]'.
	self assert: (self resultAt: 'descriptor_is_stable') asString equals: 'True'.

]

{ #category : 'Grail-Tests - The descriptor' }
EnumMemberPropertyTestCase >> testTheMemberReadIsUnchanged [
	"The hot path.  ___grailBuildMembers: stores name and value as INSTANCE
	dynamic instVars, which ___pyAttrLoad___ finds before it ever consults the
	class, so a member read never reaches the descriptor at all."

	self assert: (self resultAt: 'member_reads') asString equals: '[''CYAN'', 1]'.
	self assert: (self resultAt: 'sunder_reads') asString equals: '[''CYAN'', 1]'.

]
