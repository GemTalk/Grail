! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EnumRootPickleIdentityTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EnumRootPickleIdentityTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EnumRootPickleIdentityTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EnumRootPickleIdentityTestCase
!
! A pickled enum member must come back as the SAME object.  It did for a plain
! Enum, for a Flag, and for a user's ``class E(int, Enum)'' -- but not for the
! three storage-rooted roots Grail SHIPS:
!
!     IntEnum   DIFFERENT
!     IntFlag   DIFFERENT
!     StrEnum   DIFFERENT
!
! Enum's __reduce__ / __reduce_ex__ live on Enum, and those three are rooted on
! AbstractPyInt / AbstractPyStr -- they do not inherit Enum on the Smalltalk
! chain.  A USER's ``class E(int, Enum)'' does get them, because
! ___mergeSecondaryBases___ copies Enum's instance methods down; that is exactly
! why the SHIPPED roots were the ones that went wrong, and why a survey across
! all seven flavours was what found it rather than reading either class.  With
! no __reduce__ and no __reduce_ex__ to answer with, pickle fell through to
! newobj(cls) and rebuilt a member-shaped object EQUAL to the canonical member
! but not it.
!
! The body is shared (Enum class >> ___grailReduceOf:) rather than copied four
! times, and each root gets BOTH spellings: pickle asks for __reduce_ex__ first,
! and a data type nearer in the MRO that defines only __reduce__ must still keep
! its own (the NamedInt/NEI case, PR #318).
!
! test_enum OldTestFlag.test_pickle and TestSpecial.test_subclassing.
!
! Drives tests/python/enum_root_pickle_identity.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EnumRootPickleIdentityTestCase removeAllMethods.
EnumRootPickleIdentityTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: EnumRootPickleIdentityTestCase
setUp
	"Reload tests/python/enum_root_pickle_identity.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_root_pickle_identity' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_root_pickle_identity.py')
		name: 'enum_root_pickle_identity'.
%

category: 'Grail-Private'
method: EnumRootPickleIdentityTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - Round-trip identity'
method: EnumRootPickleIdentityTestCase
testEveryFlavourRoundTripsToTheSameObject
	"All seven, every protocol.  The four that already worked are in the list on
	purpose: they are what showed the three that did not."

	self assert: (self resultAt: 'identity') asString
		equals: 'IntEnum=ok;IntFlag=ok;StrEnum=ok;Flag=ok;Enum=ok;int,Enum=ok;str,Enum=ok'.
%

category: 'Grail-Tests - Round-trip identity'
method: EnumRootPickleIdentityTestCase
testTheClassesRoundTripToo
	"By reference, through the module -- unaffected by the member protocol, and
	pinned so a change to one is not mistaken for the other."

	self assert: (self resultAt: 'classes') asString
		equals: 'IntEnum=True;IntFlag=True;StrEnum=True;Flag=True;Enum=True;int,Enum=True;str,Enum=True'.
%

category: 'Grail-Tests - What __reduce__ answers'
method: EnumRootPickleIdentityTestCase
testReduceShape
	"(cls, (value,)) -- unpickling calls cls(value), and the value lookup is what
	returns the canonical singleton."

	self assert: (self resultAt: 'reduce') asString equals: '(<flag ''IF''>, (2,))'.
	self assert: (self resultAt: 'reduce_ex') asString equals: '(<flag ''IF''>, (2,))'.
	self assert: (self resultAt: 'reduce_agrees').
%

category: 'Grail-Tests - Flag composites'
method: EnumRootPickleIdentityTestCase
testCompositeFlagValue
	"``LARRY | CURLY'' is a cached composite pseudo-member, so it has an identity
	to preserve as much as a named member does."

	self assert: (self resultAt: 'composite').
	self assert: (self resultAt: 'composite_value') equals: 3.
%

category: 'Grail-Tests - The value survives'
method: EnumRootPickleIdentityTestCase
testValuesKeepTheirType
	self assert: (self resultAt: 'int_value') asString equals: '2'.
	self assert: (self resultAt: 'str_value') asString equals: '''b'''.
%

category: 'Grail-Tests - A mixin keeps its own __reduce__'
method: EnumRootPickleIdentityTestCase
testDataTypeReduceIsNotDisplaced
	"NamedInt defines __reduce__ and NEI mixes it in.  By MRO the mixin's wins
	for __reduce__, and Enum's __reduce_ex__ -- which pickle asks for first --
	is what makes the MEMBER pickle by value while a plain NamedInt still uses
	the mixin's own."

	self assert: (self resultAt: 'mixin_member').
	self assert: (self resultAt: 'mixin_plain') asString equals: '5'.
%
