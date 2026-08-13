! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EnumNamedFlagsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EnumNamedFlagsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EnumNamedFlagsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EnumNamedFlagsTestCase
!
! ``@verify(NAMED_FLAGS)'' -- raise when an ALIAS carries a bit that no NAMED
! member covers (CPython enum.verify NAMED_FLAGS).  Grail accepted every such
! class: the check was stubbed advisory, returning the class unchanged, which
! the stub said in as many words.
!
!     @verify(NAMED_FLAGS)
!     class Bizarre(Flag):
!         b = 3
!         c = 4
!         d = 6
!
! Only c is named -- b and d are multi-bit, so they are aliases -- and between
! them they need bits 1 and 2, which nothing names:
!
!     invalid Flag 'Bizarre': aliases b and d are missing combined values of
!     0x3 [use enum.show_flag_values(value) for details]
!
! The bits accumulate across all offending aliases into ONE number, reported as
! ``value 0x%x'' when it is a single bit and ``combined values of 0x%x'' when it
! is several.  enum.show_flag_values -- the function that message points at --
! arrives with it, and is CPython's list(_iter_bits_lsb(value)).
!
! ORDER.  CPython walks _member_map_, a dict in declaration order, so its
! message lists aliases as written.  Grail's is hash-ordered (which ``unique''
! already works around), so declaration order comes from the record's
! definition-order roll -- which holds exactly the multi-bit and zero members
! this check is about.  A same-VALUE alias builds no member of its own and is
! gathered after; that can order the two kinds differently from CPython when
! one class has both, which nothing reachable pins and which does not change
! the bits reported.
!
! Drives tests/python/enum_named_flags.py.  test_enum TestVerify.test_composite.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EnumNamedFlagsTestCase removeAllMethods.
EnumNamedFlagsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: EnumNamedFlagsTestCase
setUp
	"Reload tests/python/enum_named_flags.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_named_flags' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_named_flags.py')
		name: 'enum_named_flags'.
%

category: 'Grail-Private'
method: EnumNamedFlagsTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - The check raises'
method: EnumNamedFlagsTestCase
testSeveralAliasesReportCombinedBits
	"The exact message test_composite matches, plural wording and all."

	self assert: (self resultAt: 'combined') asString
		equals: 'invalid Flag ''Bizarre'': aliases b and d are missing combined values of 0x3 [use enum.show_flag_values(value) for details]'.
%

category: 'Grail-Tests - The check raises'
method: EnumNamedFlagsTestCase
testOneAliasOneBitReadsSingular
	"``alias d is missing value 0x2'' -- both halves of the message switch on
	count and on whether the accumulated value is a single bit."

	self assert: (self resultAt: 'single') asString
		equals: 'invalid Flag ''Bizarre'': alias d is missing value 0x2 [use enum.show_flag_values(value) for details]'.
%

category: 'Grail-Tests - The check raises'
method: EnumNamedFlagsTestCase
testTheSameClassIsLegalUnverified
	"NAMED_FLAGS checks; it does not repair.  Without the decorator the class
	still defines, keeps its three values, and iterates only the named member."

	self assert: (self resultAt: 'unverified') asString
		equals: '[<Unverified.c: 4>];3;4;6'.
%

category: 'Grail-Tests - Classes that pass'
method: EnumNamedFlagsTestCase
testAnAliasWhoseBitsAreAllNamed
	"``ab = 3'' is an alias too, but 1 and 2 are both named, so it passes -- and
	is still reachable with its value."

	self assert: (self resultAt: 'fine') asString
		equals: '[<Fine.a: 1>, <Fine.b: 2>];3'.
	self assert: (self resultAt: 'no_aliases') asString
		equals: '[<NoAliases.a: 1>, <NoAliases.b: 2>]'.
%

category: 'Grail-Tests - Classes that pass'
method: EnumNamedFlagsTestCase
testAPlainEnumHasNoBitsToCheck
	"Not a flag, so the check says nothing about it -- ``three = 3'' beside
	``one = 1'' is not a composite."

	self assert: (self resultAt: 'plain_enum') asString
		equals: '[<Plain.one: 1>, <Plain.three: 3>]'.
%

category: 'Grail-Tests - show_flag_values'
method: EnumNamedFlagsTestCase
testItDecomposesLeastSignificantFirst
	"CPython list(_iter_bits_lsb(value)): the set bits from the bottom up, and a
	MEMBER decomposes by its value."

	self assert: (self resultAt: 'show_3') asString equals: '[1, 2]'.
	self assert: (self resultAt: 'show_2') asString equals: '[2]'.
	self assert: (self resultAt: 'show_0') asString equals: '[]'.
	self assert: (self resultAt: 'show_13') asString equals: '[1, 4, 8]'.
	self assert: (self resultAt: 'show_member') asString equals: '[1, 2]'.
%

category: 'Grail-Tests - show_flag_values'
method: EnumNamedFlagsTestCase
testANegativeValueIsRefused
	"_iter_bits_lsb will not decompose one -- which is also why the NAMED_FLAGS
	check skips a negative alias rather than reporting it."

	self assert: (self resultAt: 'show_negative') asString
		equals: '-1 is not a positive integer'.
%

category: 'Grail-Tests - Alongside the other checks'
method: EnumNamedFlagsTestCase
testVerifyAppliesEveryCheckItIsGiven
	"verify(UNIQUE, NAMED_FLAGS) runs both: a clean flag passes both, and a
	duplicate value is still caught by UNIQUE with its own message."

	self assert: (self resultAt: 'both_ok') asString
		equals: '[<Both.a: 1>, <Both.b: 2>]'.
	self assert: (self resultAt: 'both_unique') asString
		equals: 'duplicate values found in <enum ''BothBad''>: dupe -> a'.
%
