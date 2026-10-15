Class {
	#name : 'ModuleScopeBindingsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
ModuleScopeBindingsTestCase >> setUp [
	"Load tests/python/module_scope_bindings.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'module_scope_bindings' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_scope_bindings.py')
		name: 'module_scope_bindings'.

]

{ #category : 'Grail-Tests' }
ModuleScopeBindingsTestCase >> testFunctionScopeExceptAsStillWorks [
	"``except ValueError as fe'' inside a function still compiles to a
	bare enclosing-scope temp and binds correctly."

	self assert: (testModule @env1:___pyAttrLoad___: #'fn_except_result') equals: 'k'.

]

{ #category : 'Grail-Tests' }
ModuleScopeBindingsTestCase >> testFunctionScopeWithAsStillWorks [
	"``with m as fw'' inside a function still compiles to a bare
	enclosing-scope temp and binds correctly."

	self assert: (testModule @env1:___pyAttrLoad___: #'fn_with_result') equals: 'inner'.

]

{ #category : 'Grail-Tests' }
ModuleScopeBindingsTestCase >> testModuleScopeExceptAsBindsModuleVariable [
	"``except ValueError as e'' at module top level: the value captured
	from e inside the handler is readable as a module variable."

	self assert: (testModule @env1:___pyAttrLoad___: #'except_msg') equals: 'boom'.
	self assert: (testModule @env1:___pyAttrLoad___: #'except_repr_len') equals: 4.

]

{ #category : 'Grail-Tests' }
ModuleScopeBindingsTestCase >> testModuleScopeWithAsBindsModuleVariable [
	"``with mgr as w'' at module top level: w binds the value from
	__enter__, is readable inside the block, survives as a module
	variable after the block, and __exit__ ran."

	self assert: (testModule @env1:___pyAttrLoad___: #'with_read') equals: 'hello'.
	self assert: (testModule @env1:___pyAttrLoad___: #'w') equals: 'hello'.
	self assert: (testModule @env1:___pyAttrLoad___: #'with_exited') equals: true.

]
