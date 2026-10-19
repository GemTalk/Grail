Class {
	#name : 'ClassScopeTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'SUnit'
}

{ #category : 'Setup' }
ClassScopeTestCase >> setUp [
	"Load tests/python/class_scope.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_scope' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_scope.py')
		name: 'class_scope'.

]

{ #category : 'Tests - LEGB' }
ClassScopeTestCase >> testBareNameSkipsClassScope [
	"Tokenizer.error references bare `error`, which Python's LEGB
	resolves to the MODULE-LEVEL `error` function, not to the
	method itself.  Wrapping confirms the module-level was reached."

	self assert: (testModule @env1:cstok_error_result)
		equals: 'tokenizer wrapping: module error: oops'.

]

{ #category : 'Tests - LEGB' }
ClassScopeTestCase >> testClassMethodCallsModuleFunction [
	"Foo.helped calls shared_helper (module-level def)."

	self assert: (testModule @env1:foo_helped_result) equals: 14.

]

{ #category : 'Tests - LEGB' }
ClassScopeTestCase >> testClassMethodComparesToModuleConstant [
	"Foo.gated reads THRESHOLD (module-level) inside an if."

	self assert: (testModule @env1:foo_gated_big) equals: 'big'.
	self assert: (testModule @env1:foo_gated_small) equals: 'small'.

]

{ #category : 'Tests - LEGB' }
ClassScopeTestCase >> testClassMethodReadsModuleConstant [
	"Foo.amplify reads MULTIPLIER (module-level int)."

	self assert: (testModule @env1:foo_amplify_result) equals: 50.

]

{ #category : 'Tests - Property' }
ClassScopeTestCase >> testPropertyAccessFromInsideMethod [
	"Box.describe uses self.size — `self.X` where X is a class method
	(not an inst var) dispatches to the method."

	self assert: (testModule @env1:box_describe_full) equals: 'has 3'.
	self assert: (testModule @env1:box_describe_empty) equals: 'empty'.

]

{ #category : 'Tests - Property' }
ClassScopeTestCase >> testPropertyAccessFromOutside [
	"Box(...).size invokes the @property method."

	self assert: (testModule @env1:box_size_full) equals: 3.

]
