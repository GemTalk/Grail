! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for OsPathPosixpathNamesTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'OsPathPosixpathNamesTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
OsPathPosixpathNamesTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! OsPathPosixpathNamesTestCase - os.path answers every posixpath name (#1452)
! ===============================================================================
!   In CPython os.path IS posixpath.  Grail's os.path (os_path.gs) answered
!   only the names it had a method for, so eight of posixpath.__all__ were
!   AttributeErrors (expandvars stopped ``import pytest''), relpath took no
!   start= keyword, and realpath(strict=ALLOW_MISSING) reached posixpath as
!   strict=True.  A PEP 562 __getattr__ now sends every other name to
!   posixpath.
!
! tests/python/os_path_posixpath_names.py holds the 13 checks, run under real
! CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
OsPathPosixpathNamesTestCase removeAllMethods.
OsPathPosixpathNamesTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: OsPathPosixpathNamesTestCase
setUp
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/os_path_posixpath_names.py'
		name: 'os_path_posixpath_names'
%

category: 'Grail-Helpers'
method: OsPathPosixpathNamesTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: OsPathPosixpathNamesTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests'
method: OsPathPosixpathNamesTestCase
testEveryPosixpathNameIsAnswered

	self assertAll: #('no_name_missing' 'expandvars' 'from_import' 'getsize'
		'getatime_getctime' 'samestat' 'sameopenfile' 'isdevdrive'
		'allow_missing_is_posixpaths' 'unknown_name')
%

category: 'Grail-Tests'
method: OsPathPosixpathNamesTestCase
testKeywordArguments
	"relpath(start=) had no keyword form, and realpath's strict= reached
	posixpath as True whatever was passed."

	self assertAll: #('relpath_start_keyword' 'realpath_allow_missing'
		'realpath_strict_still_raises')
%

category: 'Grail-Tests - coverage'
method: OsPathPosixpathNamesTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 13 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 13
%
