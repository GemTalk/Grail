Class {
	#name : 'CallingConventionTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
CallingConventionTestCase >> setUp [
	"Reload tests/python/calling_convention.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'calling_convention' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/calling_convention.py')
		name: 'calling_convention'.

]

{ #category : 'Grail-Tests - Valid Calls' }
CallingConventionTestCase >> testCorrectKeyword [
	self assert: (testModule @env1:correct_keyword) equals: true

]

{ #category : 'Grail-Tests - Valid Calls' }
CallingConventionTestCase >> testCorrectPositional [
	self assert: (testModule @env1:correct_positional) equals: true

]

{ #category : 'Grail-Tests - Too Many Positional' }
CallingConventionTestCase >> testDefaultTooMany [
	self assert: (testModule @env1:default_toomany) equals: 'TypeError'

]

{ #category : 'Grail-Tests - Valid Calls' }
CallingConventionTestCase >> testDefaultUsed [
	self assert: (testModule @env1:default_used) equals: true

]

{ #category : 'Grail-Tests - Varargs Absorb' }
CallingConventionTestCase >> testKwargsAbsorbsExtras [
	self assert: (testModule @env1:kwargs_absorbs) equals: true

]

{ #category : 'Grail-Tests - Valid Calls' }
CallingConventionTestCase >> testKwonlyOk [
	self assert: (testModule @env1:kwonly_ok) equals: true

]

{ #category : 'Grail-Tests - Unexpected Keyword' }
CallingConventionTestCase >> testKwonlyUnexpected [
	self assert: (testModule @env1:kwonly_unexpected) equals: 'TypeError'

]

{ #category : 'Grail-Tests - Valid Calls' }
CallingConventionTestCase >> testMethodOk [
	self assert: (testModule @env1:method_ok) equals: 'x'

]

{ #category : 'Grail-Tests - Too Many Positional' }
CallingConventionTestCase >> testMethodTooMany [
	self assert: (testModule @env1:method_toomany) equals: 'TypeError'

]

{ #category : 'Grail-Tests - Unexpected Keyword' }
CallingConventionTestCase >> testMethodUnexpectedKeyword [
	self assert: (testModule @env1:method_unexpected_keyword) equals: 'TypeError'

]

{ #category : 'Grail-Tests - Too Many Positional' }
CallingConventionTestCase >> testMissingRequired [
	self assert: (testModule @env1:missing_required) equals: 'TypeError'

]

{ #category : 'Grail-Tests - Varargs Absorb' }
CallingConventionTestCase >> testStarargsAbsorbsExtras [
	self assert: (testModule @env1:starargs_absorbs) equals: true

]

{ #category : 'Grail-Tests - Too Many Positional' }
CallingConventionTestCase >> testTooManyPositional [
	self assert: (testModule @env1:toomany_positional) equals: 'TypeError'

]

{ #category : 'Grail-Tests - Unexpected Keyword' }
CallingConventionTestCase >> testUnexpectedKeyword [
	self assert: (testModule @env1:unexpected_keyword) equals: 'TypeError'

]
