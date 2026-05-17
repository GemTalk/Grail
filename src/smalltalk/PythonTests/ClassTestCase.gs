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
ClassTestCase category: 'Grail-SUnit'
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

category: 'Grail-Setup'
method: ClassTestCase
setUp
	"Load the test module and cache the instance."
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'module_with_classes' ifAbsent: [].
	"The classes live in the PythonModules SymbolDictionary, which is
	dropped and recreated by install.gs; nothing to clean up by hand."
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_with_classes.py')
		name: 'module_with_classes'.
%

category: 'Grail-Tests - Module Loading'
method: ClassTestCase
testModuleLoads
	"Test that the module with classes loads without error."

	self assert: testModule notNil.
%

category: 'Grail-Tests - Class Creation'
method: ClassTestCase
testPointClassExists
	"Test that Point was created in PythonModules."

	self assert: (PythonModules at: #'Point' ifAbsent: [nil]) notNil.
%

category: 'Grail-Tests - Class Creation'
method: ClassTestCase
testCounterClassExists
	"Test that Counter was created in PythonModules."

	self assert: (PythonModules at: #'Counter' ifAbsent: [nil]) notNil.
%

category: 'Grail-Tests - Instance Variables'
method: ClassTestCase
testPointInstVars
	"Test that Point has x and y as instance variables."

	| cls varNames |
	cls := PythonModules at: #'Point'.
	varNames := cls allInstVarNames.
	self assert: (varNames includes: #x).
	self assert: (varNames includes: #y).
%

category: 'Grail-Tests - Instantiation'
method: ClassTestCase
testPointCreatedDuringInit
	"Test that p = Point(3, 4) created a Point with correct values."

	| p |
	p := testModule instVarAt: (testModule class allInstVarNames indexOf: #p).
	self assert: (p instVarAt: (p class allInstVarNames indexOf: #x)) equals: 3.
	self assert: (p instVarAt: (p class allInstVarNames indexOf: #y)) equals: 4.
%

category: 'Grail-Tests - Method Calls'
method: ClassTestCase
testPointSumResult
	"Test that p.sum() = 7 was stored during module init."

	self assert: (testModule @env1:p_sum) equals: 7.
%

category: 'Grail-Tests - Counter'
method: ClassTestCase
testCounterResult
	"Test that Counter inc/get works: 3 incs → count = 3."

	self assert: (testModule @env1:c_count) equals: 3.
%

category: 'Grail-Tests - Real Methods'
method: ClassTestCase
testPointSumIsRealMethod
	"Test that sum is a real env-1 method on Point."

	| cls md |
	cls := PythonModules at: #'Point'.
	md := cls methodDictForEnv: 1.
	self assert: (md includesKey: #sum).
%

category: 'Grail-Tests - Real Methods'
method: ClassTestCase
testPointInitIsRealMethod
	"Test that __init__ is a real env-1 method on Point."

	| cls md |
	cls := PythonModules at: #'Point'.
	md := cls methodDictForEnv: 1.
	self assert: (md includesKey: #'__init__:_:').
%

category: 'Grail-Tests - Direct Call'
method: ClassTestCase
testDirectMethodCall
	"Test calling a method via perform on an instance."

	| p |
	p := testModule instVarAt: (testModule class allInstVarNames indexOf: #p).
	self assert: (p perform: #sum env: 1) equals: 7.
%

category: 'Grail-Tests - Accessors'
method: ClassTestCase
testPointAccessors
	"Test that unary accessor methods work for instance variables."

	| p |
	p := testModule instVarAt: (testModule class allInstVarNames indexOf: #p).
	self assert: (p perform: #x env: 1) equals: 3.
	self assert: (p perform: #y env: 1) equals: 4.
%
