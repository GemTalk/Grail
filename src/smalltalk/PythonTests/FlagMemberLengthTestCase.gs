! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for FlagMemberLengthTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FlagMemberLengthTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
FlagMemberLengthTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! FlagMemberLengthTestCase
!
! ``len(flag_member)'' is the number of single-bit flags set (CPython 3.11+):
! len(Color.BLACK) is 0, len(Color.WHITE) is 3.  Grail's flag members had no
! __len__ at all, so len(member) raised ``object of type 'Color' has no len()''.
!
! test_enum reaches it the UNBOUND way -- ``Color.__len__(Color.PURPLE)'' -- which
! is also what shows why the method must live on the class: the class's own
! __len__ shadows the metaclass one that counts MEMBERS, exactly as CPython's
! Flag.__len__ shadows EnumType.__len__.  Without it the unbound handle found the
! unary metaclass method and reported ``__len__() takes a different number of
! arguments (1 given)'' -- OldTestFlag and OldTestIntFlag test_member_length.
!
! IntFlag needs its own copy (AbstractPyInt-rooted, so it cannot inherit Flag).
! Both, and both __iter__s, now share ___grailFlagComponents: -- that walk was
! already written out twice, and __len__ would have made it four.
!
! Drives tests/python/flag_member_length.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FlagMemberLengthTestCase removeAllMethods.
FlagMemberLengthTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: FlagMemberLengthTestCase
setUp
	"Reload tests/python/flag_member_length.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'flag_member_length' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/flag_member_length.py')
		name: 'flag_member_length'.
%

category: 'Grail-Private'
method: FlagMemberLengthTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - len(member)'
method: FlagMemberLengthTestCase
testFlagMemberLength
	"BLACK/GREEN/PURPLE/WHITE -> 0/1/2/3 set bits."

	self assert: (self resultAt: 'flag_lens') asString equals: '0,1,2,3'.
%

category: 'Grail-Tests - len(member)'
method: FlagMemberLengthTestCase
testIntFlagMemberLength
	"IntFlag is AbstractPyInt-rooted and does not inherit Flag, so it needs its
	own __len__ -- the second of the two failing test_member_length cases."

	self assert: (self resultAt: 'intflag_lens') asString equals: '0,1,2,3'.
%

category: 'Grail-Tests - Unbound off the class'
method: FlagMemberLengthTestCase
testUnboundClassLenReachesTheMemberMethod
	"``Color.__len__(member)'' -- the exact spelling test_member_length uses,
	and the one that was resolving to the metaclass method."

	self assert: (self resultAt: 'unbound') asString equals: '0,1,2,3'.
	self assert: (self resultAt: 'unbound_int') asString equals: '0,1,2,3'.
%

category: 'Grail-Tests - Existing behaviour preserved'
method: FlagMemberLengthTestCase
testLenOfTheClassStillCountsMembers
	"Only INSTANCE access is shadowed: len(Color) must still be the canonical
	member count, not a bit count."

	self assert: (self resultAt: 'class_lens') asString equals: '3/3'.
%

category: 'Grail-Tests - Existing behaviour preserved'
method: FlagMemberLengthTestCase
testIterationStillDecomposes
	"__iter__ moved onto the shared helper, so pin it: a multi-bit member is
	decomposed into its canonical single-bit components, never yielded whole,
	and a zero member yields nothing."

	self assert: (self resultAt: 'iter') asString
		equals: '-;GREEN;RED,BLUE;RED,GREEN,BLUE'.
	self assert: (self resultAt: 'iter_int') asString
		equals: '-;GREEN;RED,BLUE;RED,GREEN,BLUE'.
%

category: 'Grail-Tests - Existing behaviour preserved'
method: FlagMemberLengthTestCase
testLenAgreesWithIteration
	"The two now come from one decomposition, so they cannot drift."

	self assert: (self resultAt: 'agree').
%
