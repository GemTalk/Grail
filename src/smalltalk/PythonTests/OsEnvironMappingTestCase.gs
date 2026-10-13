! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for OsEnvironMappingTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'OsEnvironMappingTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
OsEnvironMappingTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! OsEnvironMappingTestCase - os.environ is an os._Environ, and a MutableMapping
! ===============================================================================
!   CPython's os.environ is an instance of os._Environ, a MutableMapping
!   subclass.  Grail's class (os_Environ) had no name in os, so rich's pretty
!   printer -- which lists os._Environ among its mapping types -- failed at
!   import, and 17 of pip's submodules with it.  The class also lacked part of
!   the MutableMapping protocol: update() with keywords or pairs, popitem(),
!   the PEP 584 operators, and an item-wise __eq__.
!
! tests/python/os_environ_mapping.py holds the 10 checks, run under real
! CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
OsEnvironMappingTestCase removeAllMethods.
OsEnvironMappingTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: OsEnvironMappingTestCase
setUp
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/os_environ_mapping.py'
		name: 'os_environ_mapping'
%

category: 'Grail-Helpers'
method: OsEnvironMappingTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: OsEnvironMappingTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests'
method: OsEnvironMappingTestCase
testTheTypeIsOsEnvironAndAMutableMapping

	self assertAll: #('type_is_exported' 'type_names' 'is_mutable_mapping'
		'rich_style_type_test')
%

category: 'Grail-Tests'
method: OsEnvironMappingTestCase
testTheMutableMappingProtocol

	self assertAll: #('update_forms' 'merge_operators' 'merge_with_a_non_mapping'
		'inplace_merge' 'popitem' 'equality')
%

category: 'Grail-Tests - coverage'
method: OsEnvironMappingTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 10 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 10
%
