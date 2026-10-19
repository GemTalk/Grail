Class {
	#name : 'EnumSecondaryMixinTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
EnumSecondaryMixinTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
EnumSecondaryMixinTestCase >> setUp [
	"Reload tests/python/enum_secondary_mixin.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_secondary_mixin' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_secondary_mixin.py')
		name: 'enum_secondary_mixin'.

]

{ #category : 'Grail-Tests - Decorator survives the merge' }
EnumSecondaryMixinTestCase >> testClassPropertyFromEitherBasePosition [
	"The primary position always worked; the secondary one answered an
	UnboundMethod because only the method, not the decorator's rebinding, was
	copied down."

	self assert: (self resultAt: 'primary_max') equals: 3.
	self assert: (self resultAt: 'secondary_max') equals: 3.
	"...and the OTHER mixin, the one that got the primary slot, is unaffected."
	self assert: (self resultAt: 'secondary_str') asString equals: 'blue'.

]

{ #category : 'Grail-Tests - Non-data-type mixin leaves the value raw' }
EnumSecondaryMixinTestCase >> testFlagWithTwoPlainMixins [
	"OldTestFlag's shape: a Flag carrying both a classproperty mixin and a
	behaviour mixin.  Its member values are the bit values, not <AllMixin
	object>."

	self assert: (self resultAt: 'flag_all') equals: 7.
	self assert: (self resultAt: 'flag_value') equals: 1.

]

{ #category : 'Grail-Tests - Real data types untouched' }
EnumSecondaryMixinTestCase >> testIntAndStrEnumsUnchanged [
	self assert: (self resultAt: 'int_enum') asString equals: '<Ints.A: 1>/1'.
	self assert: (self resultAt: 'str_enum') asString equals: '<Texts.A: ''a''>/a'.

]

{ #category : 'Grail-Tests - Decorator survives the merge' }
EnumSecondaryMixinTestCase >> testPlainClassGetsItToo [
	"The merge is importlib's, not the enum metaclass's, so this is not an
	enum-only fix."

	self assert: (self resultAt: 'plain_secondary_tag') asString
		equals: 'tag:PlainSecondary'.

]

{ #category : 'Grail-Tests - Non-data-type mixin leaves the value raw' }
EnumSecondaryMixinTestCase >> testPlainMixinDoesNotBecomeTheMemberType [
	"_find_data_type_ answers nothing for a chain that never reaches a
	constructor, so member_type is object and the value is stored as written."

	self assert: (self resultAt: 'cool_value') equals: 1.
	self assert: (self resultAt: 'cool_member_type').

]

{ #category : 'Grail-Tests - Decorator survives the merge' }
EnumSecondaryMixinTestCase >> testSubclassOwnDefinitionBeatsTheBaseRebinding [
	"Nothing already on the subclass is overwritten: its own class body wins."

	self assert: (self resultAt: 'own_wins') asString equals: 'mine'.

]

{ #category : 'Grail-Tests - Decorator survives the merge' }
EnumSecondaryMixinTestCase >> testTheDescriptorsOwnStoreStillWins [
	"MAX assigns ``cls.MAX = m'' over itself, so the second read must come from
	the class-attribute store rather than re-running the descriptor -- the
	ordinary monkey-patch, which the copied rebinding must not displace."

	self assert: (self resultAt: 'secondary_max_again') equals: 3.

]

{ #category : 'Grail-Tests - Non-data-type mixin leaves the value raw' }
EnumSecondaryMixinTestCase >> testTheMixinsBehaviourIsStillInherited [
	"Only the VALUE construction changes -- the mixin's methods, and a second
	enum base's, still reach the members."

	self assert: (self resultAt: 'cool_str') asString equals: 'blue'.
	self assert: (self resultAt: 'cool_behavior') asString equals: 'booyah'.

]

{ #category : 'Grail-Tests - Real data types untouched' }
EnumSecondaryMixinTestCase >> testUserPrimitiveSubclassStillConstructs [
	"The guard must not swallow the data types that DO construct: HexInt is
	_find_data_type_'s answer and the value has to BE one for 0x1 to show."

	self assert: (self resultAt: 'hex_repr') asString equals: '<Hexed.A: 0x1>'.
	self assert: (self resultAt: 'hex_value_type') asString equals: 'HexInt'.

]
