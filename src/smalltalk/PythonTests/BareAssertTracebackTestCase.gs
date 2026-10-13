! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for BareAssertTracebackTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BareAssertTracebackTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
BareAssertTracebackTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! BareAssertTracebackTestCase - a bare ``assert'' carries its frames
! ===============================================================================
! A bare assert raised through the kernel's env-0 ``AssertionError signal'', and
! its exception's traceback held only the catching frame (none at all, at
! module level) until another AssertionError had been raised the Python way in
! the session.  pytest's report of a failing plain assert showed none of the
! test's frames.
!
! In a suite run earlier tests have long since raised AssertionError, so the
! "first in the session" case is reproduced only by the fixture run on its own
! (scripts/check_python_fixtures.sh, and ./grail); here the checks guard the
! shape.  tests/python/bare_assert_traceback.py holds the 7 checks.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
BareAssertTracebackTestCase removeAllMethods.
BareAssertTracebackTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: BareAssertTracebackTestCase
setUp

	importlib @env1:modules removeKey: #'bare_assert_traceback' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/bare_assert_traceback.py')
		name: 'bare_assert_traceback'
%

category: 'Grail-Helpers'
method: BareAssertTracebackTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: BareAssertTracebackTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - assert'
method: BareAssertTracebackTestCase
testTheTracebackHasEveryFrame

	self assertAll: #('the_first_bare_assert_keeps_its_frames'
		'a_later_bare_assert_too'
		'an_assert_with_a_message'
		'the_innermost_line_is_the_assert')
%

category: 'Grail-Tests - assert'
method: BareAssertTracebackTestCase
testTheExceptionIsCPythons

	self assertAll: #('a_bare_assert_has_no_args'
		'raised_while_handling_records_the_context'
		'a_falsy_value_still_fails')
%

category: 'Grail-Tests - assert'
method: BareAssertTracebackTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 7 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 7
%
