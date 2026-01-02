! ===============================================================================
! ImportlibTestCase - Tests for Python importlib module
! ===============================================================================

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
ImportlibTestCase removeAllMethods: 0.
ImportlibTestCase class removeAllMethods: 0.
%

! ------------------- Test methods for ImportlibTestCase

category: 'Setup'
method: ImportlibTestCase
setUp
	"Initialize the builtin modules before each test"
	importlib perform: #modules env: 2
%

category: 'Tests - Module Registry'
method: ImportlibTestCase
testModulesRegistry
	"Test that the modules registry exists and contains built-in modules"

	| modules |
	modules := importlib perform: #modules env: 2.

	self assert: (modules includesKey: #builtins).
	self assert: (modules includesKey: #math).
	self assert: (modules includesKey: #cmath).
	self assert: (modules includesKey: #os).
	self assert: (modules includesKey: #sys)
%

category: 'Tests - Module Registry'
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

category: 'Tests - import_module'
method: ImportlibTestCase
testImportModuleMath
	"Test importing the math module"

	| imp importModuleBlock result |
	imp := importlib perform: #instance env: 2.
	importModuleBlock := imp perform: #import_module env: 2.

	result := importModuleBlock value: {'math'} value: nil.

	self assert: result class equals: math
%

category: 'Tests - import_module'
method: ImportlibTestCase
testImportModuleBuiltins
	"Test importing the builtins module"

	| imp importModuleBlock result |
	imp := importlib perform: #instance env: 2.
	importModuleBlock := imp perform: #import_module env: 2.

	result := importModuleBlock value: {'builtins'} value: nil.

	self assert: result class equals: builtins
%

category: 'Tests - import_module'
method: ImportlibTestCase
testImportModuleOs
	"Test importing the os module"

	| imp importModuleBlock result |
	imp := importlib perform: #instance env: 2.
	importModuleBlock := imp perform: #import_module env: 2.

	result := importModuleBlock value: {'os'} value: nil.

	self assert: result class equals: os
%

category: 'Tests - import_module'
method: ImportlibTestCase
testImportModuleCmath
	"Test importing the cmath module"

	| imp importModuleBlock result |
	imp := importlib perform: #instance env: 2.
	importModuleBlock := imp perform: #import_module env: 2.

	result := importModuleBlock value: {'cmath'} value: nil.

	self assert: result class equals: cmath
%

category: 'Tests - import_module'
method: ImportlibTestCase
testImportModuleSys
	"Test importing the sys module"

	| imp importModuleBlock result |
	imp := importlib perform: #instance env: 2.
	importModuleBlock := imp perform: #import_module env: 2.

	result := importModuleBlock value: {'sys'} value: nil.

	self assert: result class equals: sys
%

category: 'Tests - import_module'
method: ImportlibTestCase
testImportModuleNotFound
	"Test that importing a non-existent module raises ModuleNotFoundError"

	| imp importModuleBlock |
	imp := importlib perform: #instance env: 2.
	importModuleBlock := imp perform: #import_module env: 2.

	self should: [importModuleBlock value: {'nonexistent_module'} value: nil]
		raise: ModuleNotFoundError
%

category: 'Tests - __import__'
method: ImportlibTestCase
testBuiltinsImport
	"Test builtins.__import__ function"

	| b importBlock result |
	b := builtins ___instance___.
	importBlock := b perform: #'__import__' env: 2.

	result := importBlock value: {'math'} value: nil.

	self assert: result class equals: math
%

category: 'Tests - __import__'
method: ImportlibTestCase
testBuiltinsImportNotFound
	"Test that builtins.__import__ raises ModuleNotFoundError for unknown modules"

	| b importBlock |
	b := builtins ___instance___.
	importBlock := b perform: #'__import__' env: 2.

	self should: [importBlock value: {'unknown_module'} value: nil]
		raise: ModuleNotFoundError
%

category: 'Tests - reload'
method: ImportlibTestCase
testReload
	"Test reloading a module"

	| imp reloadBlock mathInstance reloadedInstance |
	imp := importlib perform: #instance env: 2.
	reloadBlock := imp perform: #reload env: 2.

	mathInstance := math perform: #instance env: 2.
	reloadedInstance := reloadBlock value: {mathInstance} value: nil.

	"After reload, we should get a fresh instance"
	self assert: reloadedInstance class equals: math
%

category: 'Tests - invalidate_caches'
method: ImportlibTestCase
testInvalidateCaches
	"Test invalidate_caches (should be a no-op for built-in modules)"

	| imp invalidateCachesBlock result |
	imp := importlib perform: #instance env: 2.
	invalidateCachesBlock := imp perform: #invalidate_caches env: 2.

	result := invalidateCachesBlock value: {} value: nil.

	self assert: result equals: None
%

category: 'Tests - Singleton'
method: ImportlibTestCase
testSingleton
	"Test that importlib.instance returns the same instance"

	| instance1 instance2 |
	instance1 := importlib perform: #instance env: 2.
	instance2 := importlib perform: #instance env: 2.

	self assert: instance1 == instance2
%

category: 'Tests - Singleton'
method: ImportlibTestCase
testNewRaisesTypeError
	"Test that importlib.new raises TypeError"

	self should: [importlib perform: #new env: 2]
		raise: TypeError
%

category: 'Tests - AST Generation'
method: ImportlibTestCase
testPprintastSetterGetter
	"Test setting and getting the pprintast path"

	| originalPath testPath |
	originalPath := importlib pprintast.
	testPath := '/test/path/to/pprintast'.

	importlib pprintast: testPath.
	self assert: importlib pprintast equals: testPath.

	"Restore original path"
	importlib pprintast: originalPath
%

category: 'Tests - AST Generation'
method: ImportlibTestCase
testAstStringForPath
	"Test generating AST string from hello.py"

	| astString testFilePath |
	importlib pprintast ifNil: [
		"Skip test if pprintast is not configured"
		^ self
	].

	testFilePath := importlib grailDir , '/smalltalk/tests/hello.py'.
	astString := importlib astStringForPath: testFilePath.

	"The AST should start with Module("
	self assert: (astString beginsWith: 'Module(').

	"The AST should contain FunctionDef for say_hello"
	self assert: (astString includesString: 'FunctionDef').
	self assert: (astString includesString: 'say_hello')
%

category: 'Tests - AST Generation'
method: ImportlibTestCase
testAstStringForSource
	"Test generating AST string from Python source code"

	| astString |
	importlib pprintast ifNil: [
		"Skip test if pprintast is not configured"
		^ self
	].

	astString := importlib astStringForSource: 'x = 1 + 2'.

	"The AST should start with Module("
	self assert: (astString beginsWith: 'Module(').

	"The AST should contain Assign and BinOp"
	self assert: (astString includesString: 'Assign').
	self assert: (astString includesString: 'BinOp')
%

category: 'Tests - AST Generation'
method: ImportlibTestCase
testAstForPath
	"Test creating a ModuleAst from hello.py"

	| moduleAst testFilePath |
	importlib pprintast ifNil: [
		"Skip test if pprintast is not configured"
		^ self
	].

	testFilePath := importlib grailDir , '/smalltalk/tests/hello.py'.
	moduleAst := importlib astForPath: testFilePath.

	self assert: moduleAst class equals: ModuleAst.
	self assert: moduleAst name equals: '__main__'.
	self assert: moduleAst path equals: testFilePath
%

category: 'Tests - AST Generation'
method: ImportlibTestCase
testAstForSource
	"Test creating a ModuleAst from Python source code"

	| moduleAst |
	importlib pprintast ifNil: [
		"Skip test if pprintast is not configured"
		^ self
	].

	moduleAst := importlib astForSource: 'x = 1'.

	self assert: moduleAst class equals: ModuleAst.
	self assert: moduleAst name equals: '__main__'
%

category: 'Tests - Module Loading'
method: ImportlibTestCase
testSmalltalkForPath
	"Test generating Smalltalk code from hello.py"

	| smalltalkCode testFilePath |
	importlib pprintast ifNil: [
		"Skip test if pprintast is not configured"
		^ self
	].

	testFilePath := importlib grailDir , '/smalltalk/tests/hello.py'.
	smalltalkCode := importlib smalltalkForPath: testFilePath.

	"The generated code should be a non-empty string"
	self assert: smalltalkCode isString.
	self assert: smalltalkCode notEmpty
%

category: 'Tests - Module Loading'
method: ImportlibTestCase
testSmalltalkForSource
	"Test generating Smalltalk code from Python source"

	| smalltalkCode |
	importlib pprintast ifNil: [
		"Skip test if pprintast is not configured"
		^ self
	].

	smalltalkCode := importlib smalltalkForSource: '1 + 2'.

	"The generated code should be a non-empty string"
	self assert: smalltalkCode isString.
	self assert: smalltalkCode notEmpty.

	"The generated code should contain addition"
	self assert: (smalltalkCode includesString: ' __add__: ')
%

