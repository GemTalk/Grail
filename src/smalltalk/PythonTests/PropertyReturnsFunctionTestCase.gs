! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for PropertyReturnsFunctionTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'PropertyReturnsFunctionTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
PropertyReturnsFunctionTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! PropertyReturnsFunctionTestCase - #1456
! ===============================================================================
!   A @property's value is its getter's result, used as it is.  The accessor-
!   pair branch of object >> ___pyAttrLoad___: ran ___descriptorGet___: on it,
!   so a property returning a plain function answered it bound to the
!   property's own instance (pytest's FunctionDefinition.obj).  object >>
!   ___isPropertyGetterSelector___: now exempts a getter compiled as a def.
!
! tests/python/property_returns_function.py holds the 10 checks, run under
! real CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
PropertyReturnsFunctionTestCase removeAllMethods.
PropertyReturnsFunctionTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: PropertyReturnsFunctionTestCase
setUp
	"The fixture records every answer in its module body; the tests only
	read them, so it is imported once per session."

	testModule := self ___recordedFixture___: '/tests/python/property_returns_function.py'
		name: 'property_returns_function'
%

category: 'Grail-Helpers'
method: PropertyReturnsFunctionTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: PropertyReturnsFunctionTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests'
method: PropertyReturnsFunctionTestCase
testAFunctionValueIsNotBound

	self assertAll: #('returns_the_function' 'not_bound_to_the_holder'
		'getattr_spelling' 'read_write_property' 'fget_agrees' 'slotted_holder')
%

category: 'Grail-Tests'
method: PropertyReturnsFunctionTestCase
testTheValueIsUsable

	self assertAll: #('call_with_explicit_instance' 'module_function_value'
		'bound_method_keeps_its_own_self' 'signature_sees_self')
%

category: 'Grail-Tests - coverage'
method: PropertyReturnsFunctionTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 10 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 10
%
