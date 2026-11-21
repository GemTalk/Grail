"``locals'' reached as a value -- ``builtins.locals()'', as pytest's assertion
rewriting emits it, or a call through an alias -- answers the calling frame's
locals, as CPython's does: a fresh dict in a function, the globals mapping at
module scope.  A direct ``locals()'' compiles to the scope's own namespace, so
before builtins had a ``locals'' of its own every failing pytest assert
reported an AttributeError instead of its comparison (issue #2298).

Every expectation in tests/python/locals_as_a_value.py was produced by
CPython 3.14; the fixture gate re-checks it there."
Class {
	#name : 'LocalsAsAValueTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
LocalsAsAValueTestCase >> assertAll: keys [

	keys do: [:each |
		| result |
		result := self resultAt: each.
		self assert: result == true description: each , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
LocalsAsAValueTestCase >> resultAt: aKey [

	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
LocalsAsAValueTestCase >> setUp [

	importlib @env1:modules removeKey: #'locals_as_a_value' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/locals_as_a_value.py')
		name: 'locals_as_a_value'

]

{ #category : 'Grail-Tests' }
LocalsAsAValueTestCase >> testACallThroughBuiltinsAnswersTheCallersLocals [

	self assertAll: #('through_builtins' 'through_getattr_on_builtins'
		'through_an_alias' 'as_pytest_uses_it')

]

{ #category : 'Grail-Tests' }
LocalsAsAValueTestCase >> testAtModuleScopeItAnswersTheGlobals [

	self assertAll: #('at_module_scope')

]

{ #category : 'Grail-Tests' }
LocalsAsAValueTestCase >> testEachCallIsAFreshSnapshot [

	self assertAll: #('each_call_is_a_fresh_snapshot')

]

{ #category : 'Grail-Tests' }
LocalsAsAValueTestCase >> testLocalsIsABuiltinFunction [

	self assertAll: #('it_is_a_builtin_function')

]
