! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for GetattrProbeTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'GetattrProbeTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
GetattrProbeTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! GetattrProbeTestCase - #1214's getattr miss cost
! ===============================================================================
!   * probe    -- getattr(obj, name, default) and hasattr skip the raise-time
!                 frame snapshot for the miss they are probing; every answer,
!                 hook, nested probe and later suggestion is unchanged.
!   * names    -- __name__ / __module__ of the module-attribute classes come
!                 from a table, with the same answers as the compare chain.
!
! tests/python/getattr_probe.py holds the 13 checks, run under real
! CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
GetattrProbeTestCase removeAllMethods.
GetattrProbeTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: GetattrProbeTestCase
setUp
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/getattr_probe.py'
		name: 'getattr_probe'
%

category: 'Grail-Helpers'
method: GetattrProbeTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: GetattrProbeTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - probe'
method: GetattrProbeTestCase
testProbeAnswersAreUnchanged

	self assertAll: #('getattr_default_on_miss' 'getattr_hit' 'hasattr_answers'
		'getattr_hook' 'property_raising_another_name' 'nested_probe'
		'two_arg_getattr_raises')
%

category: 'Grail-Tests - probe'
method: GetattrProbeTestCase
testAMissAfterAProbeKeepsItsSnapshot

	self assertAll: #('suggestion_after_probe' 'frame_locals_after_probe'
		'own_method_suggestion_after_probe' 'outside_miss_hides_underscored')
%

category: 'Grail-Tests - names'
method: GetattrProbeTestCase
testModuleAttributeClassNames

	self assertAll: #('module_attr_identities' 'plain_class_names')
%

category: 'Grail-Tests - coverage'
method: GetattrProbeTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 13 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 13
%
