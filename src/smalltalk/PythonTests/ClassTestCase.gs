! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassTestCase category: 'SUnit'
%

! ===============================================================================
! ClassTestCase - Phase 5c: Python class as real Smalltalk class
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassTestCase removeAllMethods.
ClassTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Setup'
method: ClassTestCase
setUp
	"Load the test module and cache the instance."
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'module_with_classes' ifAbsent: [].
	UserGlobals removeKey: #'py_module_with_classes' ifAbsent: [].
	UserGlobals removeKey: #'pyc_Point' ifAbsent: [].
	UserGlobals removeKey: #'pyc_Counter' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_with_classes.py')
		name: 'module_with_classes'.
%

category: 'Tests - Module Loading'
method: ClassTestCase
testModuleLoads
	"Test that the module with classes loads without error."

	self assert: testModule notNil.
%

category: 'Tests - Class Creation'
method: ClassTestCase
testPointClassExists
	"Test that pyc_Point was created in UserGlobals."

	self assert: (UserGlobals at: #'pyc_Point' ifAbsent: [nil]) notNil.
%

category: 'Tests - Class Creation'
method: ClassTestCase
testCounterClassExists
	"Test that pyc_Counter was created in UserGlobals."

	self assert: (UserGlobals at: #'pyc_Counter' ifAbsent: [nil]) notNil.
%

category: 'Tests - Instance Variables'
method: ClassTestCase
testPointInstVars
	"Test that pyc_Point has x and y as instance variables."

	| cls varNames |
	cls := UserGlobals at: #'pyc_Point'.
	varNames := cls allInstVarNames.
	self assert: (varNames includes: #x).
	self assert: (varNames includes: #y).
%

category: 'Tests - Instantiation'
method: ClassTestCase
testPointCreatedDuringInit
	"Test that p = Point(3, 4) created a Point with correct values."

	| p |
	p := testModule instVarAt: (testModule class allInstVarNames indexOf: #p).
	self assert: (p instVarAt: (p class allInstVarNames indexOf: #x)) equals: 3.
	self assert: (p instVarAt: (p class allInstVarNames indexOf: #y)) equals: 4.
%

category: 'Tests - Method Calls'
method: ClassTestCase
testPointSumResult
	"Test that p.sum() = 7 was stored during module init."

	self assert: (testModule @env1:p_sum) equals: 7.
%

category: 'Tests - Counter'
method: ClassTestCase
testCounterResult
	"Test that Counter inc/get works: 3 incs → count = 3."

	self assert: (testModule @env1:c_count) equals: 3.
%

category: 'Tests - Real Methods'
method: ClassTestCase
testPointSumIsRealMethod
	"Test that sum is a real env-1 method on pyc_Point."

	| cls md |
	cls := UserGlobals at: #'pyc_Point'.
	md := cls methodDictForEnv: 1.
	self assert: (md includesKey: #sum).
%

category: 'Tests - Real Methods'
method: ClassTestCase
testPointInitIsRealMethod
	"Test that __init__ is a real env-1 method on pyc_Point."

	| cls md |
	cls := UserGlobals at: #'pyc_Point'.
	md := cls methodDictForEnv: 1.
	self assert: (md includesKey: #'__init__:_:').
%

category: 'Tests - Direct Call'
method: ClassTestCase
testDirectMethodCall
	"Test calling a method via perform on an instance."

	| p |
	p := testModule instVarAt: (testModule class allInstVarNames indexOf: #p).
	self assert: (p perform: #sum env: 1) equals: 7.
%

category: 'Tests - Accessors'
method: ClassTestCase
testPointAccessors
	"Test that unary accessor methods work for instance variables."

	| p |
	p := testModule instVarAt: (testModule class allInstVarNames indexOf: #p).
	self assert: (p perform: #x env: 1) equals: 3.
	self assert: (p perform: #y env: 1) equals: 4.
%
