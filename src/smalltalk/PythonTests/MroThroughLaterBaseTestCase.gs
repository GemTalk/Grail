! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for MroThroughLaterBaseTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'MroThroughLaterBaseTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
MroThroughLaterBaseTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! MroThroughLaterBaseTestCase - #1454
! ===============================================================================
!   A method inherited through a NON-FIRST base resolves in C3 order.  The
!   multiple-inheritance merge copied a secondary base's methods only into
!   gaps, so a primary-chain ancestor the MRO puts AFTER that base still won
!   (pytest's Module(File, PyCollector) answered Collector.collect).  importlib
!   >> ___primaryChainProvides___:forClass:mergingFrom: and
!   ___metaChainProvides___:forClass:mergingFrom: now consult the registered
!   linearization -- for Python-written ancestors only, which is what the
!   StrEnum check guards.
!
! tests/python/mro_through_later_base.py holds the 11 checks, run under real
! CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
MroThroughLaterBaseTestCase removeAllMethods.
MroThroughLaterBaseTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: MroThroughLaterBaseTestCase
setUp
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/mro_through_later_base.py'
		name: 'mro_through_later_base'
%

category: 'Grail-Helpers'
method: MroThroughLaterBaseTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: MroThroughLaterBaseTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests'
method: MroThroughLaterBaseTestCase
testPytestCollectorShape

	self assertAll: #('pytest_shape' 'pytest_shape_super' 'pytest_shape_mro')
%

category: 'Grail-Tests'
method: MroThroughLaterBaseTestCase
testSecondaryBaseBeatsALaterSharedAncestor

	self assertAll: #('secondary_beats_shared_ancestor' 'secondary_classmethod'
		'secondary_other_arity')
%

category: 'Grail-Tests'
method: MroThroughLaterBaseTestCase
testPrecedenceThatAlreadyHeld

	self assertAll: #('primary_override_still_wins' 'own_method_wins'
		'cooperative_super' 'nested_class_via_later_base' 'strenum_mixin_equality')
%

category: 'Grail-Tests - coverage'
method: MroThroughLaterBaseTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 11 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 11
%
