! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EnumDataclassReprTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EnumDataclassReprTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EnumDataclassReprTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EnumDataclassReprTestCase
!
! A member whose data type is a dataclass does NOT get the dataclass's GENERATED
! __repr__ (CPython _find_data_repr_ / _dataclass_repr):
!
!     @dataclass
!     class CreatureDataMixin:
!         size: str
!         legs: int
!         tail: bool = field(repr=False, default=True)
!
!     class Creature(CreatureDataMixin, Enum):
!         DOG = ('medium', 4)
!
!     repr(Creature.DOG)      -- "<Creature.DOG: size='medium', legs=4>"
!
! Grail rendered the value with plain repr, giving
! "<Creature.DOG: CreatureDataMixin(size='medium', legs=4, tail=True)>" -- the
! member IS the composite, so naming the mixin says it twice, and a field
! declared field(repr=False) is meant to stay out of the repr.
!
! CPython stores the answer on the class as _value_repr_ and applies it in
! Enum.__repr__ (``v_repr = cls._value_repr_ or repr''), computing it by walking
! the bases for the first __repr__.  Only the GENERATED-dataclass outcome
! differs from plain repr, so that is the only one ___grailFindDataRepr: names;
! the other three outcomes already fell out of ordinary repr dispatch and are
! pinned here because the new branch must not disturb them -- in particular a
! dataclass INSTANCE used as an ordinary member value, where the bases are just
! (Enum,) and CPython keeps the value's own full repr.
!
! Drives tests/python/enum_dataclass_repr.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EnumDataclassReprTestCase removeAllMethods.
EnumDataclassReprTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: EnumDataclassReprTestCase
setUp
	"Reload tests/python/enum_dataclass_repr.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_dataclass_repr' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_dataclass_repr.py')
		name: 'enum_dataclass_repr'.
%

category: 'Grail-Private'
method: EnumDataclassReprTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - The generated repr is replaced'
method: EnumDataclassReprTestCase
testTheMemberShowsOnlyTheReprFields
	"The defect in one line: the mixin's name and the repr=False field both
	appeared, where CPython prints the fields alone."

	self assert: (self resultAt: 'generated') asString
		equals: '<Creature.DOG: size=''medium'', legs=4>'.
	self assert: (self resultAt: 'every_member') asString
		equals: '<Creature.BEETLE: size=''small'', legs=6>;<Creature.DOG: size=''medium'', legs=4>'.
%

category: 'Grail-Tests - The generated repr is replaced'
method: EnumDataclassReprTestCase
testOnlyTheMemberReprChanges
	"str() is unaffected, the value keeps its own full repr, and the field left
	out of the member repr is still readable on the value -- which is the object
	CPython hands to v_repr in the first place."

	self assert: (self resultAt: 'str') asString equals: 'Creature.DOG'.
	self assert: (self resultAt: 'value_repr') asString
		equals: 'CreatureDataMixin(size=''medium'', legs=4, tail=True)'.
	self assert: (self resultAt: 'hidden_on_value').
	self assert: (self resultAt: 'field_on_value') asString equals: 'medium'.
%

category: 'Grail-Tests - The generated repr is replaced'
method: EnumDataclassReprTestCase
testMemberFieldAccessIsAKnownGap
	"Pinned so it is not mistaken for part of this fix: in CPython the member is
	itself an instance of the dataclass, so Creature.DOG.tail is True.  Grail
	leaves the fields on the value only, and the member falls through to the
	class attribute -- still the Field object, because Grail's @dataclass does
	not replace a field(...) declaration with its default either."

	self assert: (self resultAt: 'member_field_is_a_known_gap') asString
		equals: 'Field(name=''tail'', default=True, init=True)'.
%

category: 'Grail-Tests - The other outcomes are unchanged'
method: EnumDataclassReprTestCase
testAWrittenReprOnTheDataTypeStillWins
	"@dataclass(repr=False) plus a hand-written __repr__: the walk finds that
	one, and it is not the generated kind."

	self assert: (self resultAt: 'written') asString equals: '<Entries.ENTRY1: ha hah!>'.
	self assert: (self resultAt: 'written_member_type').
%

category: 'Grail-Tests - The other outcomes are unchanged'
method: EnumDataclassReprTestCase
testAnInheritedReprStillWins
	"@dataclass(repr=False) generates none, so the walk carries on past the
	mixin to the base that has one."

	self assert: (self resultAt: 'inherited') asString equals: '<Inherited.DOG: inherited>'.
%

category: 'Grail-Tests - The other outcomes are unchanged'
method: EnumDataclassReprTestCase
testNoReprAnywhereLeavesTheDefault
	"Nothing to find, so the value's default object repr stands.  Asserted by
	shape rather than in full: Grail's default repr omits the module and the
	address CPython prints, which is a separate gap and the reason test_enum
	test_repr_with_dataclass still fails -- on its LAST assertion now."

	self assert: (self resultAt: 'bare_has_class_name').
	self assert: (self resultAt: 'bare_starts').
%

category: 'Grail-Tests - The other outcomes are unchanged'
method: EnumDataclassReprTestCase
testADataclassInstanceAsAnOrdinaryValueKeepsItsOwnRepr
	"The rule is about the enum's data TYPE, not about the value happening to be
	a dataclass.  Bases of (Enum,) make CPython's walk stop at Enum and take its
	_value_repr_ (None), so the value reprs itself -- mixin name, hidden field
	and all."

	self assert: (self resultAt: 'plain_value') asString
		equals: '<Plain.A: Free(x=1, hidden=9)>'.
%
