! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'FlagNumericReprTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
FlagNumericReprTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! FlagNumericReprTestCase
!
! A Flag class chooses how its UNNAMED bits read, through ``_numeric_repr_''.
!
! A KEEP-boundary flag keeps bits that no member covers, and CPython renders
! that leftover with ``cls._numeric_repr_(unknown)''.  Flag declares
! ``_numeric_repr_ = repr'' and a class may override it -- the stdlib itself
! does, in re:
!
!     class RegexFlag(boundary=KEEP): _numeric_repr_ = hex
!
! which is why CPython prints ``re.IGNORECASE|0x1000000'' rather than the
! decimal 16777216.
!
! The name was ALREADY exempt from enum''s reserved-_sunder_ check and from
! EnumDict''s member scan, so a class body could always set it.  Nothing read
! it: ___grailFlagDecomposePieces: rendered every leftover with printString, so
! an override was accepted and then silently ignored.
!
! WHY printString REMAINS THE FALLBACK.  CPython''s default IS repr, and for an
! Integer printString answers character-for-character what repr does.  So a
! class that sets nothing renders exactly as it did, and the change can only
! affect a class that asked for something else.
!
! WHAT THIS DOES NOT CLOSE.  Two gaps, both recorded in the fixture:
!
!   * Flag does not EXPOSE the default -- CPython answers <built-in function
!     repr> for a class that sets nothing, Grail has no such attribute.  The
!     RENDERING is right either way; it is the introspection that differs.
!   * A composite built from ANOTHER Flag class''s member loses that class.
!     CPython keeps the object it was handed as _value_, so the leftover is
!     itself an enum member and repr spells it out (``SINGLE|<Iron.TWO: 2>'').
!     Grail normalises _value_ to a plain integer because that slot doubles as
!     the int payload of an int-rooted member -- see ___grailIntFlagValue:value:.
!     That is the half of test_enum OldTestIntFlag.test_boundary still failing.
!
! Drives tests/python/flag_numeric_repr.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FlagNumericReprTestCase removeAllMethods.
FlagNumericReprTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: FlagNumericReprTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'flag_numeric_repr' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/flag_numeric_repr.py')
		name: 'flag_numeric_repr'.
%

category: 'Grail-Private'
method: FlagNumericReprTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - Override'
method: FlagNumericReprTestCase
testAClassBodyOverrideIsHonoured
	"``_numeric_repr_ = hex'' in the class body: the leftover bit reads as
	0x100, and the NAME carries it too -- the name is what __str__ answers on a
	non-ReprEnum flag, so the two cannot be allowed to disagree."

	self assert: (self resultAt: 'hexy_repr') asString
		equals: '<Hexy.A|0x100: 257>'.
	self assert: (self resultAt: 'hexy_name') asString equals: '''A|0x100'''.
%

category: 'Grail-Tests - Override'
method: FlagNumericReprTestCase
testTheOverrideAppliesAfterSeveralNamedMembers
	"The numeric piece is the LAST one, after every named member the value
	subsumes -- so an override has to reach the tail of the join, not the whole
	of it."

	self assert: (self resultAt: 'hexy_two_named_plus_leftover') asString
		equals: '<Hexy.A|B|0x100: 259>'.
%

category: 'Grail-Tests - Override'
method: FlagNumericReprTestCase
testANonIntFlagTakesTheSamePath
	"Flag, not IntFlag: the member is not int-rooted but the LEFTOVER still is,
	and the class still decides how it reads."

	self assert: (self resultAt: 'flag_hexy_repr') asString
		equals: '<HexyFlag.A|0x100: 257>'.
%

category: 'Grail-Tests - Default'
method: FlagNumericReprTestCase
testAClassThatSetsNothingIsUnchanged
	"REGRESSION GUARD, and the reason printString is a safe fallback: CPython's
	default is repr, which for an Integer is exactly printString.  Every flag in
	the corpus that never heard of _numeric_repr_ must render as before."

	self assert: (self resultAt: 'plain_repr') asString
		equals: '<Plain.A|256: 257>'.
	self assert: (self resultAt: 'plain_two_named_plus_leftover') asString
		equals: '<Plain.A|B|256: 259>'.
%

category: 'Grail-Tests - Default'
method: FlagNumericReprTestCase
testNoLeftoverMeansTheHookNeverRuns
	"A value fully covered by named members has no numeric piece at all, so an
	override must not appear anywhere in it."

	self assert: (self resultAt: 'hexy_fully_named') asString
		equals: '<Hexy.A|B: 3>'.
	self assert: (self resultAt: 'hexy_str') asString equals: '257'.
%

category: 'Grail-Tests - Known gaps'
method: FlagNumericReprTestCase
testTheDefaultIsNotExposedWhichIsAKnownGap
	"Recorded, NOT endorsed.  CPython answers <built-in function repr> for a
	class that sets nothing.  Only the introspection differs -- the rendering
	already matches, which is why this is a gap and not a bug in the above."

	self assert: (self resultAt: 'default_is_exposed') asString
		equals: '''<missing>'''.
%

category: 'Grail-Tests - Known gaps'
method: FlagNumericReprTestCase
testACrossClassCompositeLosesTheOtherClassWhichIsAKnownGap
	"Recorded, NOT endorsed.  ``Simple.SINGLE | Iron.TWO'' has _value_
	<Iron.ONE|TWO: 3> in CPython, so the leftover is <Iron.TWO: 2> and repr
	spells it out.  Grail normalises _value_ to a plain integer -- that slot
	doubles as the int payload of an int-rooted member -- so the leftover is the
	bare 2.  test_enum OldTestIntFlag.test_boundary asserts the CPython shape."

	self assert: (self resultAt: 'cross_class_value_type') asString equals: 'int'.
	self assert: (self resultAt: 'cross_class_name') asString equals: '''SINGLE|2'''.
%
