! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EnumDataTypeReprTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EnumDataTypeReprTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EnumDataTypeReprTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EnumDataTypeReprTestCase
!
! CPython's EnumType.__new__ replaces a member's __repr__/__str__/__format__
! with Enum's when the one the MRO gives is the DATA TYPE's (or object's):
!
!     if found_method in (data_type_method, object_method):
!         setattr(enum_class, name, enum_method)
!
! Grail asked which CATEGORY defined the method, and a mixin's def and the
! enum's own def are both Grail-Class Methods -- so a data type's __repr__ was
! kept and ``repr(MyEnum.A)'' answered '0x1' rather than '<MyEnum.A: 0x1>'.
!
! Two pieces were needed, both CPython's own algorithm:
!
! (1) _find_data_type_ (___grailFindDataType:), which is NOT "the first non-enum
!     ancestor" that ___grailMemberTypeFor: answers.  It carries a CANDIDATE and
!     commits it at the first class that actually constructs, so ``class
!     HexInt(int)'' -- which defines no __new__ of its own -- is the data type
!     rather than int.  A chain that never reaches a constructor contributes
!     nothing, which is what excludes a pure behaviour mixin, and equally a
!     mixin that only supplies __init__: the probe is __new__ /
!     __dataclass_fields__, NEVER __init__ (test_repr_with_init_mixin).
!
! (2) _value_ = member_type(*args), so the value IS the data type and its own
!     repr shows through Enum's.  ___grailValueMixinFor: had an allowlist of
!     Integer/Float/string that excluded every user subclass of a primitive; it
!     now widens to _find_data_type_'s answer -- but only for a data type
!     WRITTEN IN PYTHON.  _find_data_type_ can also answer one of Grail's own
!     storage roots (a plain StrEnum resolves to AbstractPyStr), and
!     constructing through the boxed root broke member shadowing:
!     ``Book.author.title'' answered the member Book.title instead of str's
!     title method (test_shadowed_attr).
!
! Member reprs also render the value with its own __repr__ now, not Smalltalk's
! printString -- which agrees for ints and strings and diverges for everything
! else (``aHexInt'', ``atuple( 3, 'x')'').
!
! Drives tests/python/enum_data_type_repr.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EnumDataTypeReprTestCase removeAllMethods.
EnumDataTypeReprTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: EnumDataTypeReprTestCase
setUp
	"Reload tests/python/enum_data_type_repr.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_data_type_repr' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_data_type_repr.py')
		name: 'enum_data_type_repr'.
%

category: 'Grail-Private'
method: EnumDataTypeReprTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - Data type repr replaced'
method: EnumDataTypeReprTestCase
testUserIntSubclassMixin
	"test_inherited_data_type.  The candidate rule is what makes HexInt the data
	type rather than int, and the value must BE a HexInt for 0x1 to show."

	self assert: (self resultAt: 'hexint_repr') asString equals: '<MyEnum.A: 0x1>'.
	self assert: (self resultAt: 'hexint_value_type') asString equals: 'HexInt'.
	self assert: (self resultAt: 'hexint_member_type').
%

category: 'Grail-Tests - Data type repr replaced'
method: EnumDataTypeReprTestCase
testDataclassMixin
	"test_repr_with_dataclass.  A @dataclass has no __new__ -- it is admitted by
	__dataclass_fields__, exactly CPython's own probe."

	self assert: (self resultAt: 'dataclass_repr') asString
		equals: '<Entries.ENTRY1: ha hah!>'.
	self assert: (self resultAt: 'dataclass_member_type').
%

category: 'Grail-Tests - Data type repr replaced'
method: EnumDataTypeReprTestCase
testNamedtupleMixin
	"test_namedtuple_as_value's first assertion."

	self assert: (self resultAt: 'namedtuple_repr') asString
		equals: '<NTCEnum.NONE: TTuple(id=0, a=0, blist=[])>'.
%

category: 'Grail-Tests - Non-data-type mixins keep theirs'
method: EnumDataTypeReprTestCase
testInitOnlyMixinKeepsItsRepr
	"test_repr_with_init_mixin -- the guard rail that rules out __init__ as the
	probe.  A mixin supplying only __init__ is not a data type, so CPython keeps
	its __repr__; treating it as one replaced this with <InitEntries.ENTRY1: 1>."

	self assert: (self resultAt: 'init_mixin_repr') asString
		equals: 'InitOnly(a=1)'.
%

category: 'Grail-Tests - Non-data-type mixins keep theirs'
method: EnumDataTypeReprTestCase
testEnumsOwnDefinitionWins
	"CPython exempts the enum's OWN class body -- ``if name not in classdict''."

	self assert: (self resultAt: 'own_repr') asString equals: 'mine'.
%

category: 'Grail-Tests - Ordinary enums untouched'
method: EnumDataTypeReprTestCase
testPlainEnumsUnchanged
	self assert: (self resultAt: 'plain') asString equals: '<Plain.A: 1>/Plain.A'.
	self assert: (self resultAt: 'strenum') asString equals: '<Text.A: ''a''>/a'.
%

category: 'Grail-Tests - Ordinary enums untouched'
method: EnumDataTypeReprTestCase
testStrEnumMemberStillShadows
	"test_shadowed_attr.  Widening the value construction to _find_data_type_'s
	answer wholesale sent a plain StrEnum through AbstractPyStr -- Grail's
	STORAGE root, not a Python data type -- and the boxed value stopped str's
	``title'' method winning over the same-named member."

	self assert: (self resultAt: 'shadowed') asString equals: 'Author/author'.
%

category: 'Grail-Tests - Known gaps'
method: EnumDataTypeReprTestCase
testPlainBehaviourMixinStrIsAKnownGap
	"Recorded, NOT endorsed.  ``class DumbStrEnum(DumbMixin, CustomStrEnum)''
	should keep DumbMixin's __str__ (it is neither the data type's nor
	object's), so CPython answers ``don't do this''; Grail answers the enum
	str.  Verified PRE-EXISTING -- identical with this change stashed -- and
	test_strenum, which pins the same shape, is unchanged by it.  Asserted so
	that whoever fixes it sees this fail rather than the gap going unnoticed."

	self assert: (self resultAt: 'plain_mixin_str') asString
		equals: 'DumbStrEnum.seven'.
%
