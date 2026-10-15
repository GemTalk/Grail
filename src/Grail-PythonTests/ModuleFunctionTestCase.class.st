Class {
	#name : 'ModuleFunctionTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
ModuleFunctionTestCase >> setUp [
	"Load the test module via loadModuleFromPath: and cache the instance."
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'module_with_functions' ifAbsent: [].
	"PythonModules SymbolDictionary owns the generated class; install
	recreates that dictionary, so nothing to remove by hand here."
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_with_functions.py')
		name: 'module_with_functions'.

]

{ #category : 'Grail-Tests - Function Results' }
ModuleFunctionTestCase >> testAddResult [
	"Test that add(3, 4) was called during module init and stored 7."

	self assert: (testModule @env1:result) equals: 7.

]

{ #category : 'Grail-Tests - BoundMethod' }
ModuleFunctionTestCase >> testBoundMethodCallable [
	"The lazily-wrapped BoundMethod can be called.
	BoundMethod>>value:value: is env 1, so use @env1: send."

	| addValue result |
	addValue := testModule @env1:add.
	result := addValue @env1:value: {100. 200} value: nil.
	self assert: result equals: 300.

]

{ #category : 'Grail-Tests - Function Results' }
ModuleFunctionTestCase >> testCallOtherResult [
	"Test that call_other(6) calls double(6) + 1 = 13 (inter-function call)."

	self assert: (testModule @env1:composed) equals: 13.

]

{ #category : 'Grail-Tests - Direct Call' }
ModuleFunctionTestCase >> testDirectCallViaPerform [
	"Test calling the method directly via perform."

	self assert: (testModule perform: #'add:_:' env: 1 withArguments: {3. 4}) equals: 7.

]

{ #category : 'Grail-Tests - Direct Call' }
ModuleFunctionTestCase >> testDirectCallZeroArgs [
	"Test calling a zero-arg method directly."

	self assert: (testModule perform: #'use_global' env: 1) equals: 10.

]

{ #category : 'Grail-Tests - Function Results' }
ModuleFunctionTestCase >> testDoubleResult [
	"Test that double(5) produced 10."

	self assert: (testModule @env1:doubled) equals: 10.

]

{ #category : 'Grail-Tests - Eval' }
ModuleFunctionTestCase >> testEvalInlineDefAndCall [
	"Test that inline def + call works in eval context (block path, not Phase 5b)."

	self assert: (self eval: '
def square(n):
    return n * n
square(7)
') equals: 49.

]

{ #category : 'Grail-Tests - BoundMethod' }
ModuleFunctionTestCase >> testFunctionInstVarIsBoundMethod [
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

]

{ #category : 'Grail-Tests - Real Methods' }
ModuleFunctionTestCase >> testFunctionIsRealMethod [
	"Test that add is a real env-1 method on the module class, not a block."

	| md |
	md := testModule class methodDictForEnv: 1.
	self assert: (md includesKey: #'add:_:').

]

{ #category : 'Grail-Tests - Function Results' }
ModuleFunctionTestCase >> testGreetResult [
	"Test that greet('world') produced 'hello world'."

	self assert: (testModule @env1:greeting) equals: 'hello world'.

]

{ #category : 'Grail-Tests - Module Loading' }
ModuleFunctionTestCase >> testModuleLoads [
	"Test that the module loads without error."

	self assert: testModule notNil.

]

{ #category : 'Grail-Tests - Variables' }
ModuleFunctionTestCase >> testModuleVariableX [
	"Test that x = 10 is accessible."

	self assert: (testModule @env1:x) equals: 10.

]

{ #category : 'Grail-Tests - Function Results' }
ModuleFunctionTestCase >> testUseGlobalResult [
	"Test that use_global() reads module-level variable x."

	self assert: (testModule @env1:from_global) equals: 10.

]

{ #category : 'Grail-Tests - Real Methods' }
ModuleFunctionTestCase >> testZeroArgMethod [
	"Test that use_global is a real 0-arg method."

	| md |
	md := testModule class methodDictForEnv: 1.
	self assert: (md includesKey: #'use_global').

]
