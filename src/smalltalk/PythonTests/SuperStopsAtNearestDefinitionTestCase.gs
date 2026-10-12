! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SuperStopsAtNearestDefinitionTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SuperStopsAtNearestDefinitionTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SuperStopsAtNearestDefinitionTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SuperStopsAtNearestDefinitionTestCase - pytest collection (#1454 follow-up)
! ===============================================================================
!   super() stops at the nearest class in the MRO defining the name.  Super >>
!   ___pyAttrLoad___: returned the first stored (decorated or runtime) value it
!   met along the superclass chain, skipping a nearer plain def -- pytest's
!   PyCollector.collect lost to Collector's @abc.abstractmethod.  The holder
!   walk now follows the MRO after cls and ends at the nearest defining class,
!   behind a fast path that keeps an ordinary super() read as cheap as before.
!
! tests/python/super_stops_at_nearest_definition.py holds the 6 checks, run
! under real CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SuperStopsAtNearestDefinitionTestCase removeAllMethods.
SuperStopsAtNearestDefinitionTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: SuperStopsAtNearestDefinitionTestCase
setUp
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/super_stops_at_nearest_definition.py'
		name: 'super_stops_at_nearest_definition'
%

category: 'Grail-Helpers'
method: SuperStopsAtNearestDefinitionTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: SuperStopsAtNearestDefinitionTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests'
method: SuperStopsAtNearestDefinitionTestCase
testANearerPlainDefWins

	self assertAll: #('single_inheritance' 'pytest_module_diamond'
		'plain_abstractmethod_base' 'runtime_store_on_ancestor')
%

category: 'Grail-Tests'
method: SuperStopsAtNearestDefinitionTestCase
testADecoratedNearestDefStillAnswersDecorated

	self assertAll: #('decorated_parent_still_decorated'
		'decorated_grandparent_through_plain_parent')
%

category: 'Grail-Tests - coverage'
method: SuperStopsAtNearestDefinitionTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 6 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 6
%
