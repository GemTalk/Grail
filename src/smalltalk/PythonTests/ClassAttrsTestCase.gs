! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassAttrsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassAttrsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassAttrsTestCase category: 'Grail-SUnit'
%

set compile_env: 0

expectvalue /Metaclass3
doit
ClassAttrsTestCase removeAllMethods.
ClassAttrsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassAttrsTestCase
setUp

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_attrs' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_attrs.py')
		name: 'class_attrs'.
%

category: 'Grail-Tests - Class Attrs'
method: ClassAttrsTestCase
testClassSideRead
	"`Color.RED` reads the class attribute defined in the class body."

	self assert: (testModule @env1:cls_red) equals: 1.
	self assert: (testModule @env1:cls_blue) equals: 4.
	self assert: (testModule @env1:cls_name) equals: 'palette'.
%

category: 'Grail-Tests - Class Attrs'
method: ClassAttrsTestCase
testInstanceFallthroughRead
	"`c.GREEN` (c is a Color instance) falls through from instance
	to class to find the class attribute."

	self assert: (testModule @env1:inst_green) equals: 2.
%
