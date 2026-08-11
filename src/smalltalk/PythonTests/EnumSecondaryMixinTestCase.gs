! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EnumSecondaryMixinTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EnumSecondaryMixinTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EnumSecondaryMixinTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EnumSecondaryMixinTestCase
!
! A mixin used as a SECONDARY base -- ``class Color(StrMixin, MaxMixin, Enum)''
! rather than ``class Color(MaxMixin, StrMixin, Enum)''.  Grail gives a class ONE
! Smalltalk superclass, so only the primary base is inherited and the others are
! merged by copying their compiled methods down.  Two things went wrong with that,
! and both are test_enum's test_multiple_mixin (TestSpecial and OldTestFlag).
!
! (1) A class-body DECORATOR rebinds the name it decorates: the compiled method
!     stays put and the DECORATED object lands in the base's class-attribute
!     store, which is what ``Cls.name'' actually reads.  Copying the method alone
!     handed the subclass the RAW, undecorated function, so ``@classproperty def
!     MAX(cls)'' answered an UnboundMethod instead of running the descriptor --
!     but only from the secondary position, since as the primary base the store
!     is inherited through the chain.  Fixed in importlib
!     ___mergeSecondaryBases___, tied to the method copy rather than done as its
!     own sweep of the store: this is exactly the rebinding that belongs to a
!     def, so it inherits the copy's precedence and setattr-style class
!     attributes -- and an enum base's member state -- are left alone.
!
!     The merge is importlib's, not the enum's, so a plain class is pinned too.
!
! (2) CPython's member_type is ``_find_data_type_(bases) or object'', and when it
!     is object the value is stored RAW -- ``new_member._value_ = value'' rather
!     than ``member_type(*args)''.  Grail reached its member-type walk through
!     "the enum is the storage root", which is exactly the shape ``class
!     CoolColor(StrMixin, SomeEnum, Enum)'' takes -- a plain mixin is no storage
!     base -- and the walk answered the first non-enum ancestor, StrMixin.
!     Constructing through it made CoolColor.RED.value a <StrMixin object> rather
!     than 1.  ___grailValueMixinFor: now settles that question with
!     _find_data_type_ BEFORE either of its layers is consulted.
!
! Drives tests/python/enum_secondary_mixin.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EnumSecondaryMixinTestCase removeAllMethods.
EnumSecondaryMixinTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: EnumSecondaryMixinTestCase
setUp
	"Reload tests/python/enum_secondary_mixin.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_secondary_mixin' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_secondary_mixin.py')
		name: 'enum_secondary_mixin'.
%

category: 'Grail-Private'
method: EnumSecondaryMixinTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - Decorator survives the merge'
method: EnumSecondaryMixinTestCase
testClassPropertyFromEitherBasePosition
	"The primary position always worked; the secondary one answered an
	UnboundMethod because only the method, not the decorator's rebinding, was
	copied down."

	self assert: (self resultAt: 'primary_max') equals: 3.
	self assert: (self resultAt: 'secondary_max') equals: 3.
	"...and the OTHER mixin, the one that got the primary slot, is unaffected."
	self assert: (self resultAt: 'secondary_str') asString equals: 'blue'.
%

category: 'Grail-Tests - Decorator survives the merge'
method: EnumSecondaryMixinTestCase
testTheDescriptorsOwnStoreStillWins
	"MAX assigns ``cls.MAX = m'' over itself, so the second read must come from
	the class-attribute store rather than re-running the descriptor -- the
	ordinary monkey-patch, which the copied rebinding must not displace."

	self assert: (self resultAt: 'secondary_max_again') equals: 3.
%

category: 'Grail-Tests - Decorator survives the merge'
method: EnumSecondaryMixinTestCase
testSubclassOwnDefinitionBeatsTheBaseRebinding
	"Nothing already on the subclass is overwritten: its own class body wins."

	self assert: (self resultAt: 'own_wins') asString equals: 'mine'.
%

category: 'Grail-Tests - Decorator survives the merge'
method: EnumSecondaryMixinTestCase
testPlainClassGetsItToo
	"The merge is importlib's, not the enum metaclass's, so this is not an
	enum-only fix."

	self assert: (self resultAt: 'plain_secondary_tag') asString
		equals: 'tag:PlainSecondary'.
%

category: 'Grail-Tests - Non-data-type mixin leaves the value raw'
method: EnumSecondaryMixinTestCase
testPlainMixinDoesNotBecomeTheMemberType
	"_find_data_type_ answers nothing for a chain that never reaches a
	constructor, so member_type is object and the value is stored as written."

	self assert: (self resultAt: 'cool_value') equals: 1.
	self assert: (self resultAt: 'cool_member_type').
%

category: 'Grail-Tests - Non-data-type mixin leaves the value raw'
method: EnumSecondaryMixinTestCase
testTheMixinsBehaviourIsStillInherited
	"Only the VALUE construction changes -- the mixin's methods, and a second
	enum base's, still reach the members."

	self assert: (self resultAt: 'cool_str') asString equals: 'blue'.
	self assert: (self resultAt: 'cool_behavior') asString equals: 'booyah'.
%

category: 'Grail-Tests - Non-data-type mixin leaves the value raw'
method: EnumSecondaryMixinTestCase
testFlagWithTwoPlainMixins
	"OldTestFlag's shape: a Flag carrying both a classproperty mixin and a
	behaviour mixin.  Its member values are the bit values, not <AllMixin
	object>."

	self assert: (self resultAt: 'flag_all') equals: 7.
	self assert: (self resultAt: 'flag_value') equals: 1.
%

category: 'Grail-Tests - Real data types untouched'
method: EnumSecondaryMixinTestCase
testUserPrimitiveSubclassStillConstructs
	"The guard must not swallow the data types that DO construct: HexInt is
	_find_data_type_'s answer and the value has to BE one for 0x1 to show."

	self assert: (self resultAt: 'hex_repr') asString equals: '<Hexed.A: 0x1>'.
	self assert: (self resultAt: 'hex_value_type') asString equals: 'HexInt'.
%

category: 'Grail-Tests - Real data types untouched'
method: EnumSecondaryMixinTestCase
testIntAndStrEnumsUnchanged
	self assert: (self resultAt: 'int_enum') asString equals: '<Ints.A: 1>/1'.
	self assert: (self resultAt: 'str_enum') asString equals: '<Texts.A: ''a''>/a'.
%
