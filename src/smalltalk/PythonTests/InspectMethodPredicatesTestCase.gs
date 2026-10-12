! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for InspectMethodPredicatesTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'InspectMethodPredicatesTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
InspectMethodPredicatesTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! InspectMethodPredicatesTestCase - #1458
! ===============================================================================
!   inspect.ismethod / isfunction / isroutine ask types.MethodType /
!   FunctionType, as CPython's do, instead of matching Grail's type names --
!   which read a module-level def as a method and a decorated method read
!   through an instance as neither.  Both broke pluggy (pytest's plugin layer);
!   the fixture reproduces the two pluggy shapes.
!
! tests/python/inspect_method_predicates.py holds the 12 checks, run under real
! CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
InspectMethodPredicatesTestCase removeAllMethods.
InspectMethodPredicatesTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: InspectMethodPredicatesTestCase
setUp
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/inspect_method_predicates.py'
		name: 'inspect_method_predicates'
%

category: 'Grail-Helpers'
method: InspectMethodPredicatesTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: InspectMethodPredicatesTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests'
method: InspectMethodPredicatesTestCase
testFunctionsAreFunctions

	self assertAll: #('module_function' 'lambda' 'nested_function'
		'method_through_class')
%

category: 'Grail-Tests'
method: InspectMethodPredicatesTestCase
testMethodsAreMethods

	self assertAll: #('method_through_instance' 'decorated_method_through_instance'
		'wraps_method_through_instance' 'classmethod_through_class')
%

category: 'Grail-Tests'
method: InspectMethodPredicatesTestCase
testOtherShapes

	self assertAll: #('builtin_type_method_is_routine'
		'class_and_instance_are_not_routines')
%

category: 'Grail-Tests'
method: InspectMethodPredicatesTestCase
testPluggyShapes

	self assertAll: #('pluggy_varnames_keeps_first_param'
		'pluggy_registers_decorated_hookimpl')
%

category: 'Grail-Tests - coverage'
method: InspectMethodPredicatesTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 12 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 12
%
