! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for FlagCrossClassReprTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FlagCrossClassReprTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
FlagCrossClassReprTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! FlagCrossClassReprTestCase
!
! An IntFlag combined with a member of a DIFFERENT IntFlag class, and how the
! bits neither class names come out:
!
!     Simple.SINGLE | Iron.TWO   ->   <Simple.SINGLE|<Iron.TWO: 2>: 3>
!
! The leftover is spelled out as an IRON member, not as the bare int 2.  In
! CPython that falls out of _value_: Flag.__or__ computes
! ``self.__class__(value | other)'' WITHOUT reducing other to an int -- IntFlag
! reaches it through its int member type -- so ``1 | Iron.TWO'' is an ordinary
! Python operation whose right operand is an int SUBCLASS, its __ror__ wins,
! and the result <Iron.ONE|TWO: 3> becomes the new member's _value_.  The
! leftover ``value ^ combined'' is then computed THROUGH Iron.
!
! Grail cannot store that: an int-rooted member's #value slot doubles as its
! int payload, so it must hold a plain Integer.  It records the foreign CLASS
! instead (IntFlag >> ___foreignFlagClassOf___:) and rebuilds a member of it to
! render the leftover -- the only thing the naming path needs.  What _value_
! itself answers stays a recorded divergence.
!
! test_enum OldTestIntFlag.test_boundary is the upstream case.
! Drives tests/python/flag_cross_class_repr.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FlagCrossClassReprTestCase removeAllMethods.
FlagCrossClassReprTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: FlagCrossClassReprTestCase
setUp
	"Reload tests/python/flag_cross_class_repr.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'flag_cross_class_repr' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/flag_cross_class_repr.py')
		name: 'flag_cross_class_repr'.
%

category: 'Grail-Private'
method: FlagCrossClassReprTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - Cross-class leftover'
method: FlagCrossClassReprTestCase
testTheLeftoverIsSpelledOutAsAMemberOfTheOtherClass
	"The assertion test_boundary makes.  Before this, the uncovered bit read as
	the bare int 2 -- ``<Simple.SINGLE|2: 3>''."

	self assert: (self resultAt: 'repr') asString
		equals: '<Simple.SINGLE|<Iron.TWO: 2>: 3>'.
	self assert: (self resultAt: 'name') asString
		equals: 'SINGLE|<Iron.TWO: 2>'.
%

category: 'Grail-Tests - Cross-class leftover'
method: FlagCrossClassReprTestCase
testTheCompositeIsOtherwiseAnOrdinaryMemberOfItsOwnClass
	"Only the NAMING changes.  The composite is still a Simple, still equal to
	3, and still strs as an int -- IntFlag is a ReprEnum."

	self assert: (self resultAt: 'is_a_simple') equals: true.
	self assert: (self resultAt: 'equals_three') equals: true.
	self assert: (self resultAt: 'str') asString equals: '3'.
	self assert: (self resultAt: 'value_int') equals: 3.
%

category: 'Grail-Tests - Cross-class leftover'
method: FlagCrossClassReprTestCase
testTheRenderingClassIsStillTheReceiversOwn
	"CPython calls cls._numeric_repr_(unknown): the class that chooses the
	SPELLING is the receiver's, and only the ARGUMENT comes from the other
	enum.  So a class with ``_numeric_repr_ = hex'' still gets hex."

	self assert: (self resultAt: 'hexy_cross_class') asString
		equals: '<Hexy.A|0x2: 3>'.
%

category: 'Grail-Tests - Unchanged cases'
method: FlagCrossClassReprTestCase
testALeftoverTheOtherClassCannotNameStaysABareInt
	"Iron is STRICT and names no bit 16, so there is no member to show and the
	bare int is the answer -- which is also the pre-existing behaviour, so the
	fallback cannot make anything worse than it was."

	self assert: (self resultAt: 'unnameable_leftover') asString
		equals: '<Simple.SINGLE|16: 17>'.
%

category: 'Grail-Tests - Unchanged cases'
method: FlagCrossClassReprTestCase
testSameClassCombinationIsUntouched
	"No foreign operand, so nothing is recorded and the answer is exactly what
	it was: a fully-named composite, and a KEEP leftover as a bare int."

	self assert: (self resultAt: 'same_class') asString
		equals: '<Iron.ONE|TWO: 3>'.
	self assert: (self resultAt: 'same_class_keep_leftover') asString
		equals: '<Simple.SINGLE|4: 5>'.
%

category: 'Grail-Tests - Recorded gap'
method: FlagCrossClassReprTestCase
testAPlainFlagAcceptsAForeignOperandWhichIsAKnownGap
	"RECORDED DIVERGENCE, PRE-EXISTING and wider than the leftover naming this
	change is about -- found by writing the fixture, not caused by it (only
	IntFlag's operators changed).

	A plain Flag's _member_type_ is object, so CPython's Flag.__or__ takes
	neither of its two branches and answers NotImplemented: both
	``PlainA.A | PlainB.TWO'' and ``PlainA.A | 2'' are TypeError.  Grail's
	___flagOperand___: accepts any Flag member and any Integer, so both
	succeed.  Only IntFlag is meant to reach an operand through its int member
	type, which is what makes the cross-class case above legal at all.

	Closing it means tightening ___flagOperand___: for the non-int Flag root;
	no test_enum failure currently turns on it."

	self assert: (self resultAt: 'plain_flag_cross_class') asString
		equals: '<PlainA.A|2: 3>'.
	self assert: (self resultAt: 'plain_flag_with_int') asString
		equals: '<PlainA.A|2: 3>'.
%

category: 'Grail-Tests - Recorded gap'
method: FlagCrossClassReprTestCase
testTheValueItselfIsStillAPlainIntWhichIsAKnownGap
	"RECORDED DIVERGENCE.  CPython's _value_ for this composite is the Iron
	composite <Iron.ONE|TWO: 3>, so type(_value_).__name__ is 'Iron'.  Grail's
	is a plain Integer: an int-rooted member's value slot doubles as its int
	payload, and some 74 places read it as an Integer.

	Recording the foreign CLASS gives the naming path everything it needs, so
	this is the only observable remainder."

	self assert: (self resultAt: 'value_type') asString equals: 'int'.
%
