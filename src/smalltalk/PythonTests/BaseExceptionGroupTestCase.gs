! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for BaseExceptionGroupTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BaseExceptionGroupTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
BaseExceptionGroupTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! BaseExceptionGroupTestCase - Tests for Python BaseExceptionGroup
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
BaseExceptionGroupTestCase removeAllMethods.
BaseExceptionGroupTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-BaseExceptionGroup'
method: BaseExceptionGroupTestCase
test_creation
	"Test creating a BaseExceptionGroup instance."
	
	| exc |
	exc := BaseExceptionGroup ___new___:  BaseExceptionGroup .
	self assert: exc notNil.
%

category: 'Grail-Tests-BaseExceptionGroup'
method: BaseExceptionGroupTestCase
test_inheritance
	"Test that BaseExceptionGroup inherits from BaseException."
	
	| exc |
	exc := BaseExceptionGroup ___new___:  BaseExceptionGroup .
	self assert: (exc isKindOf: BaseException).
%

! ------------------- PEP 654 narrowing

category: 'Grail-Setup'
method: BaseExceptionGroupTestCase
___narrowingProbe___
	"tests/python/exception_group_narrowing.py, whose eight checks were measured
	against CPython 3.14.6 (it is self-running, so scripts/
	check_python_fixtures.sh runs them there too).  Loaded once per test; the
	module body runs every check at import."

	probe ifNotNil: [^ probe].
	importlib @env1:modules removeKey: #'exception_group_narrowing' ifAbsent: [].
	probe := (importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/exception_group_narrowing.py')
		name: 'exception_group_narrowing') @env1:___pyAttrLoad___: #'r'.
	^ probe
%

category: 'Grail-Private'
method: BaseExceptionGroupTestCase
narrowingAt: aKey
	^ self ___narrowingProbe___ @env1:__getitem__: aKey
%

category: 'Grail-Tests - PEP 654 narrowing'
method: BaseExceptionGroupTestCase
testAGroupOfOrdinaryExceptionsAnswersAnExceptionGroup
	"PEP 654: ``BaseExceptionGroup(msg, excs)'' hands construction to
	EXCEPTIONGROUP when every member is an Exception.  Grail always built a
	BaseExceptionGroup, so the ordinary spelling ``except ExceptionGroup''
	caught nothing and the group escaped as an uncaught Smalltalk error.

	That was 17 of the 96 tests in test.test_asyncio.test_taskgroups, whose
	TaskGroup raises ``BaseExceptionGroup('unhandled errors in a TaskGroup',
	self._errors)'' and every one of whose tests catches ExceptionGroup."

	self assert: (self narrowingAt: 'a_group_of_exceptions_narrows') equals: true.
	self
		assert: (self narrowingAt: 'the_narrowed_group_is_caught_as_an_exceptiongroup')
		equals: true.
%

category: 'Grail-Tests - PEP 654 narrowing'
method: BaseExceptionGroupTestCase
testAGroupOfGroupsNarrowsThroughHandlesRatherThanTheHierarchy
	"THE NESTED CASE, and the reason the implementation cannot ask
	#isKindOf:.  CPython declares ``class ExceptionGroup(BaseExceptionGroup,
	Exception)'' -- two bases -- so an ExceptionGroup IS an Exception and a
	group of groups narrows.  GemStone is single-inheritance: Grail's
	ExceptionGroup descends from BaseExceptionGroup alone, and the rule that
	makes ``except Exception'' catch one lives in Exception class >> handles:.
	___classForArgs___: asks that, rather than restating it.

	Nested TaskGroups are exactly this shape -- and they are what anyio and
	FastAPI build, not a corner case: test_taskgroup_11 / _12 / _14."

	self assert: (self narrowingAt: 'a_group_of_groups_narrows_too') equals: true.
%

category: 'Grail-Tests - PEP 654 narrowing'
method: BaseExceptionGroupTestCase
testNarrowingStopsAtABaseExceptionAtAnyDepth
	"The other half of the contract, and the one with the safety argument: a
	group carrying a KeyboardInterrupt or SystemExit must STAY a
	BaseExceptionGroup, so ``except Exception'' cannot swallow it -- including
	when the BaseException is one level down inside a nested group."

	self
		assert: (self narrowingAt: 'a_group_containing_a_baseexception_does_not')
		equals: true.
	self
		assert: (self narrowingAt: 'a_group_of_groups_does_not_narrow_if_one_carries_a_baseexception')
		equals: true.
%

category: 'Grail-Tests - PEP 654 narrowing'
method: BaseExceptionGroupTestCase
testNarrowingAppliesToBaseExceptionGroupOnly
	"CPython narrows only when cls IS BaseExceptionGroup.  A user subclass keeps
	its identity even with all-Exception members, and ExceptionGroup itself must
	not recurse into the hook."

	self
		assert: (self narrowingAt: 'a_subclass_of_baseexceptiongroup_is_never_replaced')
		equals: true.
	self
		assert: (self narrowingAt: 'exceptiongroup_itself_is_unaffected')
		equals: true.
%

category: 'Grail-Tests - PEP 654 narrowing'
method: BaseExceptionGroupTestCase
testExceptStarStillMatchesInsideANarrowedGroup
	"A GUARD, not a discriminator -- measured with the narrowing reverted, this
	still passed, because Grail's except* machinery matches against
	BaseExceptionGroup directly and never needed the narrowed class.  Here so
	that stays true."

	self
		assert: (self narrowingAt: 'except_star_matches_inside_a_narrowed_group')
		equals: true.
%
