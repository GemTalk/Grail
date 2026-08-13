! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EnumAutoAtAssignmentTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EnumAutoAtAssignmentTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EnumAutoAtAssignmentTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EnumAutoAtAssignmentTestCase
!
! ``auto()'' resolved AS IT IS ASSIGNED, which is where CPython resolves it.
!
! CPython's _EnumDict.__setitem__ fills in the marker's ``value'' slot the moment
! the member is written, so the rest of the class body sees a number:
!
!     class Example(Flag):
!         A = auto()
!         B = auto()
!         ALL = nonmember(A | B)          -- 3
!
! Grail resolved every marker in a LATER pass over the finished class, so ``A |
! B'' saw two unresolved markers and the operator failed.  An enum body now runs
! against an EnumDict namespace, which is what makes assignment-time resolution
! possible at all -- see ClassBodyNamespaceTestCase and
! docs/Class_Body_Namespace.md.
!
! Nothing about WHICH value a member gets changed; only when it is chosen.  Every
! expectation below was checked against CPython 3.14 by running the fixture there
! -- it is plain Python and needs no Grail -- and all fourteen results agree.
!
! Drives tests/python/enum_auto_at_assignment.py.  test_enum
! TestSpecial.test_using_members_as_nonmember.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EnumAutoAtAssignmentTestCase removeAllMethods.
EnumAutoAtAssignmentTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: EnumAutoAtAssignmentTestCase
setUp
	"Reload tests/python/enum_auto_at_assignment.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_auto_at_assignment' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_auto_at_assignment.py')
		name: 'enum_auto_at_assignment'.
%

category: 'Grail-Private'
method: EnumAutoAtAssignmentTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - The body sees the number'
method: EnumAutoAtAssignmentTestCase
testANonmemberCanCombineMembersDefinedAboveIt
	"The CPython test this closes, verbatim: ``ALL = nonmember(A | B)'' after two
	auto()s.  The operands were unresolved markers, so the ``|'' raised."

	self assert: (self resultAt: 'flag_values') asString equals: '1,2'.
	self assert: (self resultAt: 'flag_all') asString equals: '3/int'.
%

category: 'Grail-Tests - The body sees the number'
method: EnumAutoAtAssignmentTestCase
testAnOrdinaryMemberCanBeComputedFromOneAlreadyWritten
	"Not only Flag, and not only inside a nonmember -- ``DOUBLE = SECOND * 2'' is
	just as much a read of the resolved value."

	self assert: (self resultAt: 'counting') asString equals: '1,2,4'.
%

category: 'Grail-Tests - Values are unchanged'
method: EnumAutoAtAssignmentTestCase
testEveryGeneratorRuleStillPicksTheSameValue
	"""WHEN a value is chosen moved; WHICH value did not.  A user
	_generate_next_value_ wins, else a StrEnum yields the lowercased name, else a
	Flag takes the next power of two and a plain enum the next integer -- and an
	explicit value in between still resets the sequence (Plain: 1, 10, 11)."""

	self assert: (self resultAt: 'plain') asString equals: '1,10,11'.
	self assert: (self resultAt: 'bits') asString equals: '1,2,4'.
	self assert: (self resultAt: 'strenum') asString equals: 'red,green'.
	self assert: (self resultAt: 'gnv') asString equals: 'a!,b!'.
%

category: 'Grail-Tests - Values are unchanged'
method: EnumAutoAtAssignmentTestCase
testATupleOfMarkersAdvancesElementByElement
	"``ONE = auto(), 'first''' -- each marker draws the next value in turn, and
	the tuple itself never counts as a last value (sorting [1, (2, 'x')] raises)."

	self assert: (self resultAt: 'tupled') asString
		equals: '(1, ''first''),(2, ''second'')'.
%

category: 'Grail-Tests - The marker is mutated'
method: EnumAutoAtAssignmentTestCase
testTheSameMarkerUnderASecondNameIsAnAlias
	"""CPython writes the generated number back INTO the marker (``v.value =
	...''), so the same object bound again answers a value and nothing is
	generated for it.  Without the write-back the second binding would call the
	generator afresh and the two names would become distinct members."""

	self assert: (self resultAt: 'alias_is_alias') asString equals: 'True'.
	self assert: (self resultAt: 'alias_value') asString equals: '3'.
%

category: 'Grail-Tests - The marker is mutated'
method: EnumAutoAtAssignmentTestCase
testAMarkerPresetOutsideTheBodyIsUsedVerbatim
	"CPython's ``if v.value == _auto_null'': a marker that already carries a
	value skips the generator entirely."

	self assert: (self resultAt: 'preset') asString
		equals: '''pathological case'',''generated'''.
%

category: 'Grail-Tests - The ordering rule'
method: EnumAutoAtAssignmentTestCase
testAGeneratorDefinedAfterAMemberIsStillRefused
	"""A class-body ``def _generate_next_value_'' must come BEFORE any member
	that needs generating, because CPython would already have numbered that
	member by the default rule.

	This rule is why the marker's preset-or-not distinction had to survive the
	move.  It used to be read off the class -- a member still holding an
	unresolved marker was one that would have needed the generator -- and
	resolving at assignment took that evidence away.  EnumDict records the names
	it actually generated for instead, and ___grailBuildMembers: reads that."""

	self assert: (self resultAt: 'too_late') asString
		equals: '_generate_next_value_ must be defined before members'.
%

category: 'Grail-Tests - Paths with no namespace'
method: EnumAutoAtAssignmentTestCase
testTheFunctionalApiStillResolvesInTheLaterPass
	"There is no class body, so nothing routes through EnumDict and the builder's
	own resolution numbers these.  Both spellings must agree, which is why that
	pass stays rather than being retired."

	self assert: (self resultAt: 'functional') asString equals: '1,2'.
%

category: 'Grail-Tests - Paths with no namespace'
method: EnumAutoAtAssignmentTestCase
testANamedtupleValueIsLeftToTheBuilder
	"Recorded, NOT endorsed.  The namespace resolves a bare marker and a plain
	tuple of markers; a namedtuple value is unwrapped and rebuilt by
	___grailBuildMembers:, and duplicating that here would put one rule in two
	places.  Such a member is numbered correctly, just not at assignment."

	self assert: (self resultAt: 'namedtuple') asString equals: '1,2'.
%
