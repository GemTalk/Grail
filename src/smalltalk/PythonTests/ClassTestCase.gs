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
	"Test that Point was bound on the module."

	self assert: (testModule @env1:Point) notNil.
%

category: 'Grail-Tests - Class Creation'
method: ClassTestCase
testCounterClassExists
	"Test that Counter was bound on the module."

	self assert: (testModule @env1:Counter) notNil.
%

category: 'Grail-Tests - Instance Variables'
method: ClassTestCase
testPointInstVars
	"Phase B: Point instances expose x and y as Python attributes.
	Storage is dynamic-instVars on each instance — the class itself
	has no static instVar declarations for these names."

	| p |
	p := testModule @env0:dynamicInstVarAt: #p.
	self assert: (p @env1:___pyAttrLoad___: #x) equals: 3.
	self assert: (p @env1:___pyAttrLoad___: #y) equals: 4.
%

category: 'Grail-Tests - Instantiation'
method: ClassTestCase
testPointCreatedDuringInit
	"Phase B: p = Point(3, 4) creates a Point with x=3, y=4 stored
	in the instance's dynamic-instVar storage."

	| p |
	p := testModule @env0:dynamicInstVarAt: #p.
	self assert: (p @env0:dynamicInstVarAt: #x) equals: 3.
	self assert: (p @env0:dynamicInstVarAt: #y) equals: 4.
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
	cls := testModule @env1:Point.
	md := cls methodDictForEnv: 1.
	self assert: (md includesKey: #sum).
%

category: 'Grail-Tests - Real Methods'
method: ClassTestCase
testPointInitIsRealMethod
	"Test that __init__ is a real env-1 method on Point."

	| cls md |
	cls := testModule @env1:Point.
	md := cls methodDictForEnv: 1.
	self assert: (md includesKey: #'__init__:_:').
%

category: 'Grail-Tests - Direct Call'
method: ClassTestCase
testDirectMethodCall
	"Test calling a method via perform on an instance."

	| p |
	p := testModule @env0:dynamicInstVarAt: #p.
	self assert: (p perform: #sum env: 1) equals: 7.
%

category: 'Grail-Tests - Accessors'
method: ClassTestCase
testPointAccessors
	"Test that unary accessor methods work for instance variables."

	| p |
	p := testModule @env0:dynamicInstVarAt: #p.
	self assert: (p perform: #x env: 1) equals: 3.
	self assert: (p perform: #y env: 1) equals: 4.
%
