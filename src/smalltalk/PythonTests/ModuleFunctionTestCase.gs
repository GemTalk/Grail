! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ModuleFunctionTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ModuleFunctionTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ModuleFunctionTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ModuleFunctionTestCase - Phase 5b: module-level def as real Smalltalk method
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ModuleFunctionTestCase removeAllMethods.
ModuleFunctionTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ModuleFunctionTestCase
setUp
	"Load the test module via loadModuleFromPath: and cache the instance."
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'module_with_functions' ifAbsent: [].
	"PythonModules SymbolDictionary owns the generated class; install
	recreates that dictionary, so nothing to remove by hand here."
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_with_functions.py')
		name: 'module_with_functions'.
%

category: 'Grail-Tests - Module Loading'
method: ModuleFunctionTestCase
testModuleLoads
	"Test that the module loads without error."

	self assert: testModule notNil.
%

category: 'Grail-Tests - Variables'
method: ModuleFunctionTestCase
testModuleVariableX
	"Test that x = 10 is accessible."

	self assert: (testModule @env1:x) equals: 10.
%

category: 'Grail-Tests - Function Results'
method: ModuleFunctionTestCase
testAddResult
	"Test that add(3, 4) was called during module init and stored 7."

	self assert: (testModule @env1:result) equals: 7.
%

category: 'Grail-Tests - Function Results'
method: ModuleFunctionTestCase
testDoubleResult
	"Test that double(5) produced 10."

	self assert: (testModule @env1:doubled) equals: 10.
%

category: 'Grail-Tests - Function Results'
method: ModuleFunctionTestCase
testGreetResult
	"Test that greet('world') produced 'hello world'."

	self assert: (testModule @env1:greeting) equals: 'hello world'.
%

category: 'Grail-Tests - Function Results'
method: ModuleFunctionTestCase
testUseGlobalResult
	"Test that use_global() reads module-level variable x."

	self assert: (testModule @env1:from_global) equals: 10.
%

category: 'Grail-Tests - Function Results'
method: ModuleFunctionTestCase
testCallOtherResult
	"Test that call_other(6) calls double(6) + 1 = 13 (inter-function call)."

	self assert: (testModule @env1:composed) equals: 13.
%

category: 'Grail-Tests - Real Methods'
method: ModuleFunctionTestCase
testFunctionIsRealMethod
	"Test that add is a real env-1 method on the module class, not a block."

	| md |
	md := testModule class methodDictForEnv: 1.
	self assert: (md includesKey: #'add:_:').
%

category: 'Grail-Tests - Real Methods'
method: ModuleFunctionTestCase
testZeroArgMethod
	"Test that use_global is a real 0-arg method."

	| md |
	md := testModule class methodDictForEnv: 1.
	self assert: (md includesKey: #'use_global').
%

category: 'Grail-Tests - Direct Call'
method: ModuleFunctionTestCase
testDirectCallViaPerform
	"Test calling the method directly via perform."

	self assert: (testModule perform: #'add:_:' env: 1 withArguments: {3. 4}) equals: 7.
%

category: 'Grail-Tests - Direct Call'
method: ModuleFunctionTestCase
testDirectCallZeroArgs
	"Test calling a zero-arg method directly."

	self assert: (testModule perform: #'use_global' env: 1) equals: 10.
%

category: 'Grail-Tests - BoundMethod'
method: ModuleFunctionTestCase
testFunctionInstVarIsBoundMethod
	"Reading a top-level def name through the module's public Python
	attribute API yields a BoundMethod.  The dynamic-instVar slot
	itself is nil until an explicit rebinding — top-level defs are
	lazy-wrapped on read so first-class function value semantics
	hold without blocking later rebinds (see [[function_rebinding]])."

	| addValue |
	addValue := testModule @env1:add.
	self assert: (addValue isKindOf: BoundMethod).
	"Confirm the raw slot is still empty — no pre-store at def time."
	self assert: (testModule dynamicInstVarAt: #add) equals: nil.
%

category: 'Grail-Tests - BoundMethod'
method: ModuleFunctionTestCase
testBoundMethodCallable
	"The lazily-wrapped BoundMethod can be called.
	BoundMethod>>value:value: is env 1, so use @env1: send."

	| addValue result |
	addValue := testModule @env1:add.
	result := addValue @env1:value: {100. 200} value: nil.
	self assert: result equals: 300.
%

category: 'Grail-Tests - Eval'
method: ModuleFunctionTestCase
testEvalInlineDefAndCall
	"Test that inline def + call works in eval context (block path, not Phase 5b)."

	self assert: (self eval: '
def square(n):
    return n * n
square(7)
') equals: 49.
%
