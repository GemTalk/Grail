! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for GeneratorCloseTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'GeneratorCloseTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
GeneratorCloseTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! GeneratorCloseTestCase -- what generator.close() answers.
!
! CPython 3.13 made close() return the value a generator returns after
! catching the GeneratorExit, once.  Grail answered None in every case.
!
! Fixture: tests/python/generator_close_return_value.py
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
GeneratorCloseTestCase removeAllMethods.
GeneratorCloseTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-Generators'
method: GeneratorCloseTestCase
testCloseAnswersTheValueACaughtExitReturns
	"tests/python/generator_close_return_value.py: ``except GeneratorExit:
	return 0'' makes close() answer 0, once; a return in a finally is
	answered too; an uncaught exit, an unstarted or finished generator and a
	delegator all answer None.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'generator_close_return_value' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/generator_close_return_value.py')
		name: 'generator_close_return_value'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '8 checks, 0 disagreeing [], keys match: True'
%
