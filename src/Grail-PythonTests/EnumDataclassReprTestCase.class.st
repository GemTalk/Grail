Class {
	#name : 'EnumDataclassReprTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
EnumDataclassReprTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
EnumDataclassReprTestCase >> setUp [
	"Reload tests/python/enum_dataclass_repr.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_dataclass_repr' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_dataclass_repr.py')
		name: 'enum_dataclass_repr'.

]

{ #category : 'Grail-Tests - The other outcomes are unchanged' }
EnumDataclassReprTestCase >> testADataclassInstanceAsAnOrdinaryValueKeepsItsOwnRepr [
	"The rule is about the enum's data TYPE, not about the value happening to be
	a dataclass.  Bases of (Enum,) make CPython's walk stop at Enum and take its
	_value_repr_ (None), so the value reprs itself -- mixin name and all.  (A
	repr=False field is left out by the generated __repr__ itself.)"

	self assert: (self resultAt: 'plain_value') asString
		equals: '<Plain.A: Free(x=1)>'.

]

{ #category : 'Grail-Tests - The other outcomes are unchanged' }
EnumDataclassReprTestCase >> testAnInheritedReprStillWins [
	"@dataclass(repr=False) generates none, so the walk carries on past the
	mixin to the base that has one."

	self assert: (self resultAt: 'inherited') asString equals: '<Inherited.DOG: inherited>'.

]

{ #category : 'Grail-Tests - The other outcomes are unchanged' }
EnumDataclassReprTestCase >> testAWrittenReprOnTheDataTypeStillWins [
	"@dataclass(repr=False) plus a hand-written __repr__: the walk finds that
	one, and it is not the generated kind."

	self assert: (self resultAt: 'written') asString equals: '<Entries.ENTRY1: ha hah!>'.
	self assert: (self resultAt: 'written_member_type').

]

{ #category : 'Grail-Tests - The generated repr is replaced' }
EnumDataclassReprTestCase >> testMemberFieldAccessIsAKnownGap [
	"In CPython the member is itself an instance of the dataclass, so
	Creature.DOG.tail is True.  Grail leaves the fields on the value only, and
	the member falls through to the CLASS attribute -- which, now that
	dataclasses is CPython's, is the field's default (True) rather than the
	Field object the old stub left there.  So the answer agrees with CPython,
	though by a different route: a field whose class attribute is not its
	default (a default_factory) would still differ.  The fixture key keeps its
	old name."

	self assert: (self resultAt: 'member_field_is_a_known_gap') asString
		equals: 'True'.

]

{ #category : 'Grail-Tests - The other outcomes are unchanged' }
EnumDataclassReprTestCase >> testNoReprAnywhereLeavesTheDefault [
	"Nothing to find, so the value's default object repr stands.  Asserted by
	shape rather than in full: Grail's default repr omits the module and the
	address CPython prints, which is a separate gap and the reason test_enum
	test_repr_with_dataclass still fails -- on its LAST assertion now."

	self assert: (self resultAt: 'bare_has_class_name').
	self assert: (self resultAt: 'bare_starts').

]

{ #category : 'Grail-Tests - The generated repr is replaced' }
EnumDataclassReprTestCase >> testOnlyTheMemberReprChanges [
	"str() is unaffected, the value keeps its own repr (the generated one, which
	itself honours repr=False since dataclasses became CPython's), and the field
	left out of the member repr is still readable on the value -- which is the
	object CPython hands to v_repr in the first place."

	self assert: (self resultAt: 'str') asString equals: 'Creature.DOG'.
	self assert: (self resultAt: 'value_repr') asString
		equals: 'CreatureDataMixin(size=''medium'', legs=4)'.
	self assert: (self resultAt: 'hidden_on_value').
	self assert: (self resultAt: 'field_on_value') asString equals: 'medium'.

]

{ #category : 'Grail-Tests - The generated repr is replaced' }
EnumDataclassReprTestCase >> testTheMemberShowsOnlyTheReprFields [
	"The defect in one line: the mixin's name and the repr=False field both
	appeared, where CPython prints the fields alone."

	self assert: (self resultAt: 'generated') asString
		equals: '<Creature.DOG: size=''medium'', legs=4>'.
	self assert: (self resultAt: 'every_member') asString
		equals: '<Creature.BEETLE: size=''small'', legs=6>;<Creature.DOG: size=''medium'', legs=4>'.

]
