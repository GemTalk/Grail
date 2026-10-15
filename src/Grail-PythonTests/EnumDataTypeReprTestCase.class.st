Class {
	#name : 'EnumDataTypeReprTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
EnumDataTypeReprTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
EnumDataTypeReprTestCase >> setUp [
	"Reload tests/python/enum_data_type_repr.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_data_type_repr' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_data_type_repr.py')
		name: 'enum_data_type_repr'.

]

{ #category : 'Grail-Tests - Data type repr replaced' }
EnumDataTypeReprTestCase >> testDataclassMixin [
	"test_repr_with_dataclass.  A @dataclass has no __new__ -- it is admitted by
	__dataclass_fields__, exactly CPython's own probe."

	self assert: (self resultAt: 'dataclass_repr') asString
		equals: '<Entries.ENTRY1: ha hah!>'.
	self assert: (self resultAt: 'dataclass_member_type').

]

{ #category : 'Grail-Tests - Non-data-type mixins keep theirs' }
EnumDataTypeReprTestCase >> testEnumsOwnDefinitionWins [
	"CPython exempts the enum's OWN class body -- ``if name not in classdict''."

	self assert: (self resultAt: 'own_repr') asString equals: 'mine'.

]

{ #category : 'Grail-Tests - Non-data-type mixins keep theirs' }
EnumDataTypeReprTestCase >> testInitOnlyMixinKeepsItsRepr [
	"test_repr_with_init_mixin -- the guard rail that rules out __init__ as the
	probe.  A mixin supplying only __init__ is not a data type, so CPython keeps
	its __repr__; treating it as one replaced this with <InitEntries.ENTRY1: 1>."

	self assert: (self resultAt: 'init_mixin_repr') asString
		equals: 'InitOnly(a=1)'.

]

{ #category : 'Grail-Tests - Data type repr replaced' }
EnumDataTypeReprTestCase >> testNamedtupleMixin [
	"test_namedtuple_as_value's first assertion."

	self assert: (self resultAt: 'namedtuple_repr') asString
		equals: '<NTCEnum.NONE: TTuple(id=0, a=0, blist=[])>'.

]

{ #category : 'Grail-Tests - Known gaps' }
EnumDataTypeReprTestCase >> testPlainBehaviourMixinStrIsAKnownGap [
	"Recorded, NOT endorsed.  ``class DumbStrEnum(DumbMixin, CustomStrEnum)''
	should keep DumbMixin's __str__ (it is neither the data type's nor
	object's), so CPython answers ``don't do this''; Grail answers the enum
	str.  Verified PRE-EXISTING -- identical with this change stashed -- and
	test_strenum, which pins the same shape, is unchanged by it.  Asserted so
	that whoever fixes it sees this fail rather than the gap going unnoticed."

	self assert: (self resultAt: 'plain_mixin_str') asString
		equals: 'DumbStrEnum.seven'.

]

{ #category : 'Grail-Tests - Ordinary enums untouched' }
EnumDataTypeReprTestCase >> testPlainEnumsUnchanged [
	self assert: (self resultAt: 'plain') asString equals: '<Plain.A: 1>/Plain.A'.
	self assert: (self resultAt: 'strenum') asString equals: '<Text.A: ''a''>/a'.

]

{ #category : 'Grail-Tests - Ordinary enums untouched' }
EnumDataTypeReprTestCase >> testStrEnumMemberStillShadows [
	"test_shadowed_attr.  Widening the value construction to _find_data_type_'s
	answer wholesale sent a plain StrEnum through AbstractPyStr -- Grail's
	STORAGE root, not a Python data type -- and the boxed value stopped str's
	``title'' method winning over the same-named member."

	self assert: (self resultAt: 'shadowed') asString equals: 'Author/author'.

]

{ #category : 'Grail-Tests - Data type repr replaced' }
EnumDataTypeReprTestCase >> testUserIntSubclassMixin [
	"test_inherited_data_type.  The candidate rule is what makes HexInt the data
	type rather than int, and the value must BE a HexInt for 0x1 to show."

	self assert: (self resultAt: 'hexint_repr') asString equals: '<MyEnum.A: 0x1>'.
	self assert: (self resultAt: 'hexint_value_type') asString equals: 'HexInt'.
	self assert: (self resultAt: 'hexint_member_type').

]
