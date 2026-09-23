! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for OsErrorErrnoSubclassTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'OsErrorErrnoSubclassTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
OsErrorErrnoSubclassTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! OsErrorErrnoSubclassTestCase - OSError(errno, strerror) answers the errno's subclass
! ===============================================================================
! ``OSError(2, 'No such file or directory')'' IS a FileNotFoundError in CPython:
! OSError.__new__ reads the errno and answers the subclass for it.  Grail
! answered a plain OSError, so an ``except FileNotFoundError'' around code that
! raises the two-argument form never fired -- and that form is what a library
! writes when it re-raises an error carried across a boundary.
!
! The hook for this existed (BaseException class >> ___classForArgs___:, which
! PEP 654's exception groups use), but only the two-argument __new__ consulted
! it, so the class would have depended on how many arguments were written.
! Every arity consults it now.
!
! Only the errnos Darwin and Linux number alike are mapped; the network family
! is numbered differently on the two and is left answering OSError.
!
! tests/python/oserror_errno_subclass.py holds the 9 checks, run under real CPython 3.14 by
! scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
OsErrorErrnoSubclassTestCase removeAllMethods.
OsErrorErrnoSubclassTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: OsErrorErrnoSubclassTestCase
setUp

	importlib @env1:modules removeKey: #'oserror_errno_subclass' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/oserror_errno_subclass.py')
		name: 'oserror_errno_subclass'
%

category: 'Grail-Helpers'
method: OsErrorErrnoSubclassTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: OsErrorErrnoSubclassTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - OSError'
method: OsErrorErrnoSubclassTestCase
testAnErrnoAnswersItsOwnSubclass

	self assertAll: #('every_shared_errno_answers_its_own_subclass'
		'an_unmapped_errno_stays_a_plain_os_error')
%

category: 'Grail-Tests - OSError'
method: OsErrorErrnoSubclassTestCase
testTheNarrowingDoesNotDependOnHowItWasWritten

	self assertAll: #('the_arity_does_not_decide_the_class'
		'one_argument_or_none_stays_a_plain_os_error'
		'a_non_integer_errno_stays_a_plain_os_error')
%

category: 'Grail-Tests - OSError'
method: OsErrorErrnoSubclassTestCase
testASubclassNamedByTheCallerIsKept

	self assertAll: #('a_subclass_named_by_the_caller_is_kept')
%

category: 'Grail-Tests - OSError'
method: OsErrorErrnoSubclassTestCase
testTheSubclassCatchesAndKeepsItsFields

	self assertAll: #('a_raised_two_argument_os_error_is_caught_as_its_subclass'
		'the_fields_survive_the_narrowing' 'isinstance_still_sees_an_os_error')
%

category: 'Grail-Tests - OSError'
method: OsErrorErrnoSubclassTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 9 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 9
%
