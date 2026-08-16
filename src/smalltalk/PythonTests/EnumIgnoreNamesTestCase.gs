! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EnumIgnoreNamesTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EnumIgnoreNamesTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EnumIgnoreNamesTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EnumIgnoreNamesTestCase
!
! ``_ignore_'' names the class-body scaffolding an enum builds its real members
! WITH, and CPython leaves no trace of it.  Grail had neither half working.
!
!   1. _EnumDict.__setitem__ records the list so the named entries are skipped
!      rather than becoming members.  Grail parsed the list into a LOCAL and
!      never stored it, so ``_ignore'' kept the empty collection its lazy default
!      installed: every ignored name went on being an ordinary binding, and a
!      loop reusing one raised ``'i' already defined as 0'' on its second turn.
!      The parse was wrong too -- ``'a,b''' split first and stripped commas
!      after, yielding the single name ``ab'' where CPython's
!      value.replace(',',' ').split() yields two.
!   2. EnumType.__new__ then POPS each ignored key, and ``_ignore_'' itself, out
!      of the class dict.  Grail had no equivalent, so they survived as class
!      attributes.  Grail cannot pop -- by then the names are real class state --
!      so the pop becomes ___classBodyDefinitionalDelete___:, which knows all
!      three homes a class-body binding can have.
!
! The list is read back off the CLASS rather than out of the EnumDict, because a
! MIXIN enum never gets an EnumDict: __prepare__ reaches a class through its
! metaclass, resolved along the SMALLTALK superclass chain, and ``class I(int,
! Enum)'' is rooted at Grail's int -- that chain never passes Enum.  Taking the
! list from the namespace made _ignore_ work on a plain Enum and do nothing at
! all on every mixin, silently.
!
! Two more faults met in the same test and fixed with it:
!
!   * ``timedelta.__new__(cls, value)'' -- the form CPython REQUIRES a mixed
!     enum's __new__ to use -- was rejected as if it were ``super().__new__''.
!     A local guard in PyTimedelta could not tell the two apart; the guard that
!     can is SuperBoundMethod's, which sees the super() call site.
!   * the ALIAS test ran on the class-body value instead of the _value_ __new__
!     produced, so ``month_1 = 30, 'month''' and ``day_30 = 30, 'day''' stayed
!     two members where CPython has one.
!
! Drives tests/python/enum_ignore_names.py.  test_enum
! TestSpecial.test_ignore.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EnumIgnoreNamesTestCase removeAllMethods.
EnumIgnoreNamesTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: EnumIgnoreNamesTestCase
setUp
	"Reload tests/python/enum_ignore_names.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_ignore_names' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_ignore_names.py')
		name: 'enum_ignore_names'.
%

category: 'Grail-Private'
method: EnumIgnoreNamesTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - The names leave no trace'
method: EnumIgnoreNamesTestCase
testAnIgnoredNameIsNotAnAttributeAndNeitherIsIgnoreItself
	"CPython pops every ignored key out of the class dict, having appended
	``_ignore_'' to the list it is about to walk.  All three used to be present."

	self assert: (self resultAt: 'ignored_names_absent') asString
		equals: '[False, False, False]'.
	self assert: (self resultAt: 'real_members_survive') asString
		equals: '[''RED'', ''GREEN'']'.
%

category: 'Grail-Tests - Parsing the list'
method: EnumIgnoreNamesTestCase
testCommasSeparate
	"value.replace(',',' ').split().  Splitting first and stripping commas after
	turned ``'a,b''' into the one name ``ab'', so neither was ignored."

	self assert: (self resultAt: 'comma_separated') asString
		equals: '[False, False, False]'.
	self assert: (self resultAt: 'comma_kept') asString equals: '[''KEPT'']'.
%

category: 'Grail-Tests - Parsing the list'
method: EnumIgnoreNamesTestCase
testAListIsAcceptedAsWellAsAString
	"CPython's ``list(value)'' branch."

	self assert: (self resultAt: 'list_form') asString equals: '[False, False]'.
	self assert: (self resultAt: 'list_kept') asString equals: '[''KEPT'']'.
%

category: 'Grail-Tests - Parsing the list'
method: EnumIgnoreNamesTestCase
testANameAlreadyTakenByAMemberCannotBeIgnored
	"``_ignore_ cannot specify already set names''.  A member is already built
	by then; un-making it is not on offer."

	self assert: (self resultAt: 'already_set') asString equals: 'ValueError'.
%

category: 'Grail-Tests - Mixin enums'
method: EnumIgnoreNamesTestCase
testAMixinEnumHonoursItToo
	"The case that silently did nothing while the list lived in the EnumDict.
	Neither an int- nor a str-mixin enum has one: its Smalltalk superclass is
	the DATA TYPE, so its metaclass chain never passes Enum and __prepare__
	never runs.  Reading the list back off the class is what covers all four."

	self assert: (self resultAt: 'mixin_int') asString equals: 'False'.
	self assert: (self resultAt: 'mixin_str') asString equals: 'False'.
	self assert: (self resultAt: 'mixin_intenum') asString equals: 'False'.
%

category: 'Grail-Tests - The upstream shape'
method: EnumIgnoreNamesTestCase
testTheScaffoldingBuildsTheMembersAndThenVanishes
	"test_enum's Period, entire: 97 members written through a namespace by three
	loops, then three attributes reading back names no statement mentions.

	Every layer meets here -- the body has to run in SOURCE ORDER for ``OneDay =
	day_1'' to see the loops (ClassBodySourceOrderTestCase), _ignore_ has to
	keep ``Period'' and ``i'' out, and timedelta.__new__(cls, value) has to
	answer an instance of cls."

	self assert: (self resultAt: 'period_scaffolding_gone') asString
		equals: '[False, False, False]'.
	self assert: (self resultAt: 'period_read_back') asString
		equals: '[True, True, True]'.
	self assert: (self resultAt: 'period_is_timedelta') asString equals: 'True'.
	self assert: (self resultAt: 'period_user_slot') asString equals: '''day'''.
%

category: 'Grail-Tests - The upstream shape'
method: EnumIgnoreNamesTestCase
testMembersAliasOnTheValueTheirNewProduced
	"``month_1 = 30, 'month''' and ``day_30 = 30, 'day''' are DIFFERENT
	class-body values and the SAME member, because __new__ sets _value_ to 30
	for both.  Grail decided alias-ness from the class-body value, which a user
	__new__ is free to ignore -- so it built two members where CPython has one.
	CPython looks up enum_member._value_, after the member is built."

	self assert: (self resultAt: 'period_aliases') asString equals: '[True, True]'.
%

category: 'Grail-Tests - Known gaps'
method: EnumIgnoreNamesTestCase
testTheMixinsOwnAccessorsDoNotReachTheMemberWhichIsAKnownGap
	"Recorded, NOT endorsed.  The member IS a timedelta and carries a
	timedelta's state -- three dynamic instVars, which is why re-homing the
	constructed value onto an instance of the enum works at all -- but
	timedelta's ACCESSORS are not reachable from it: ``class Period(timedelta,
	Enum)'' is rooted at Enum on the Smalltalk chain with timedelta merged as a
	secondary base, and that merge does not bring them down.  CPython answers
	1 / 0 / 86400.0.

	Rooting the class at PyTimedelta instead was tried and is the wrong lever:
	it takes the class off the Enum chain, and the 52 date-mixin enum tests that
	rely on ___grailValueMixinFor: building the member's value all break."

	self assert: (self resultAt: 'mixin_accessors_reach_the_member') asString
		equals: '[False, False, False]'.
%
