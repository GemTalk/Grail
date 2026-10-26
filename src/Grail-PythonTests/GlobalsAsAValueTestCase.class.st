"``globals'' reached as a value -- ``_globals = globals'' and a call through it
later, as timeit does -- answers the calling frame's globals, as CPython's does.
A direct ``globals()'' compiles to the module's namespace, so before builtins
had a ``globals'' of its own the assignment was a NameError.

Every expectation in tests/python/globals_as_a_value.py was produced by
CPython 3.14; the fixture gate re-checks it there."
Class {
	#name : 'GlobalsAsAValueTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
GlobalsAsAValueTestCase >> assertAll: keys [

	keys do: [:each |
		| result |
		result := self resultAt: each.
		self assert: result == true description: each , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
GlobalsAsAValueTestCase >> resultAt: aKey [

	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
GlobalsAsAValueTestCase >> setUp [

	importlib @env1:modules removeKey: #'globals_as_a_value' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/globals_as_a_value.py')
		name: 'globals_as_a_value'

]

{ #category : 'Grail-Tests' }
GlobalsAsAValueTestCase >> testACallThroughAnAliasAnswersTheCallersGlobals [

	self assertAll: #('through_an_alias' 'through_getattr_on_builtins')

]

{ #category : 'Grail-Tests' }
GlobalsAsAValueTestCase >> testGlobalsIsABuiltinFunction [

	self assertAll: #('it_is_a_builtin_function')

]
