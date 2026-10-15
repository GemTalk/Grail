Class {
	#name : 'MakecodesPatternTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
MakecodesPatternTestCase >> setUp [

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'makecodes_pattern' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/makecodes_pattern.py')
		name: 'makecodes_pattern'.

]

{ #category : 'Grail-Tests - Makecodes Pattern' }
MakecodesPatternTestCase >> testInjectedNamesReadable [
	"Each name passed to _makecodes() is injected via
	globals().update() and reachable as a bare module-level name."

	self assert: (testModule @env1:got_failure) equals: 0.
	self assert: (testModule @env1:got_success) equals: 1.
	self assert: (testModule @env1:got_any) equals: 2.
	self assert: (testModule @env1:got_literal) equals: 3.

]

{ #category : 'Grail-Tests - Makecodes Pattern' }
MakecodesPatternTestCase >> testReturnedListMatches [
	"The function's return value is the list of injected values."

	self assert: (testModule @env1:opcodes_count) equals: 4.

]
