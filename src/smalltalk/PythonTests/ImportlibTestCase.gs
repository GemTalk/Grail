! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ImportlibTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ImportlibTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ImportlibTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ImportlibTestCase - Tests for Python importlib module
! ===============================================================================

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
ImportlibTestCase removeAllMethods: 0.
ImportlibTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: ImportlibTestCase
setUp
	"Initialize the builtin modules before each test"
	importlib @env1:modules
%

category: 'Grail-Tests - AST Generation'
method: ImportlibTestCase
testAstForPath
	"Test creating a ModuleAst from hello.py"

	| moduleAst testFilePath |
	testFilePath := importlib grailDir , '/src/python/hello.py'.
	moduleAst := importlib astForPath: testFilePath.

	self assert: moduleAst class equals: ModuleAst.
	self assert: moduleAst name equals: '__main__'.
	self assert: moduleAst path equals: testFilePath
%

category: 'Grail-Tests - AST Generation'
method: ImportlibTestCase
testAstForSource
	"Test creating a ModuleAst from Python source code"

	| moduleAst |
	moduleAst := importlib astForSource: 'x = 1'.

	self assert: moduleAst class equals: ModuleAst.
	self assert: moduleAst name equals: '__main__'
%

category: 'Grail-Tests - __import__'
method: ImportlibTestCase
testBuiltinsImport
	"Test builtins.__import__ — Phase-4 varargs fast-path direct method dispatch."

	| b result |
	b := builtins ___instance___.

	result := b @env1:___import__: { 'math' } kw: nil.

	self assert: result class equals: math
%

category: 'Grail-Tests - __import__'
method: ImportlibTestCase
testBuiltinsImportNotFound
	"Test that builtins.__import__ raises ModuleNotFoundError for unknown modules"

	| b |
	b := builtins ___instance___.

	self should: [b @env1:___import__: { 'unknown_module' } kw: nil]
		raise: ModuleNotFoundError
%

category: 'Grail-Tests - import_module'
method: ImportlibTestCase
testImportModuleBuiltins
	"Test importing the builtins module"

	| imp result |
	imp := importlib @env1:instance.

	result := imp @env1:import_module: 'builtins'.

	self assert: result class equals: builtins
%

category: 'Grail-Tests - import_module'
method: ImportlibTestCase
testImportModuleCmath
	"Test importing the cmath module"

	| imp result |
	imp := importlib @env1:instance.

	result := imp @env1:import_module: 'cmath'.

	self assert: result class equals: cmath
%

category: 'Grail-Tests - import_module'
method: ImportlibTestCase
testImportModuleMath
	"Test importing the math module"

	| imp result |
	imp := importlib @env1:instance.

	result := imp @env1:import_module: 'math'.

	self assert: result class equals: math
%

category: 'Grail-Tests - import_module'
method: ImportlibTestCase
testImportModuleNotFound
	"Test that importing a non-existent module raises ModuleNotFoundError"

	| imp importModuleBlock |
	imp := importlib @env1:instance.

	self should: [imp @env1:import_module: 'nonexistent_module']
		raise: ModuleNotFoundError
%

category: 'Grail-Tests - import_module'
method: ImportlibTestCase
testImportModuleOs
	"Test importing the os module"

	| imp result |
	imp := importlib @env1:instance.

	result := imp @env1:import_module: 'os'.

	self assert: result class equals: os
%

category: 'Grail-Tests - import_module'
method: ImportlibTestCase
testImportModuleSys
	"Test importing the sys module"

	| imp result |
	imp := importlib @env1:instance.

	result := imp @env1:import_module: 'sys'.

	self assert: result class equals: sys
%

category: 'Grail-Tests - invalidate_caches'
method: ImportlibTestCase
testInvalidateCaches
	"Test invalidate_caches (should be a no-op for built-in modules)"

	| imp result |
	imp := importlib @env1:instance.
	result := imp @env1:invalidate_caches.
	self assert: result equals: None
%

category: 'Grail-Tests - Module Registry'
method: ImportlibTestCase
testLookupModule
	"Test looking up modules by name"

	| mathModule osModule unknownModule |
	mathModule := importlib ___lookupModule___: 'math'.
	osModule := importlib ___lookupModule___: 'os'.
	unknownModule := importlib ___lookupModule___: 'nonexistent'.

	self assert: mathModule class equals: math.
	self assert: osModule class equals: os.
	self assert: unknownModule equals: nil
%

category: 'Grail-Tests - Module Registry'
method: ImportlibTestCase
testModulesRegistry
	"Test that the modules registry exists and contains built-in modules"

	| modules |
	modules := importlib @env1:modules.

	self assert: (modules includesKey: #builtins).
	self assert: (modules includesKey: #math).
	self assert: (modules includesKey: #cmath).
	self assert: (modules includesKey: #os).
	self assert: (modules includesKey: #sys)
%

category: 'Grail-Tests - Singleton'
method: ImportlibTestCase
testNewRaisesTypeError
	"Test that importlib.new raises TypeError"

	self should: [importlib @env1:new]
		raise: TypeError
%

category: 'Grail-Tests - reload'
method: ImportlibTestCase
testReload
	"Test reloading a module"

	| imp mathInstance reloadedInstance |
	imp := importlib @env1:instance.

	mathInstance := math @env1:instance.
	reloadedInstance := imp @env1:reload: mathInstance.

	"After reload, we should get a fresh instance"
	self assert: reloadedInstance class equals: math
%

category: 'Grail-Tests - Singleton'
method: ImportlibTestCase
testSingleton
	"Test that importlib.instance returns the same instance"

	| instance1 instance2 |
	instance1 := importlib @env1:instance.
	instance2 := importlib @env1:instance.

	self assert: instance1 == instance2
%

category: 'Grail-Tests - Module Loading'
method: ImportlibTestCase
testSmalltalkForPath
	"Test generating Smalltalk code from hello.py"

	| smalltalkCode testFilePath |
	testFilePath := importlib grailDir , '/src/python/hello.py'.
	smalltalkCode := importlib smalltalkForPath: testFilePath.

	"The generated code should be a non-empty string"
	self assert: smalltalkCode isString.
	self assert: smalltalkCode notEmpty
%

category: 'Grail-Tests - Module Loading'
method: ImportlibTestCase
testSmalltalkForSource
	"Test generating Smalltalk code from Python source"

	| smalltalkCode |
	smalltalkCode := importlib smalltalkForSource: '1 + 2'.

	"The generated code should be a non-empty string"
	self assert: smalltalkCode isString.
	self assert: smalltalkCode notEmpty.

	"The generated code should contain addition"
	self assert: (smalltalkCode includesString: ' __add__: ')
%
