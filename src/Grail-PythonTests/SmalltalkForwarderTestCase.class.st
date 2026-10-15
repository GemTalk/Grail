Class {
	#name : 'SmalltalkForwarderTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
SmalltalkForwarderTestCase >> setUp [
	"Clear the module cache and load the @smalltalk-forwarder fixture."
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'smalltalk_forwarder' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/smalltalk_forwarder.py')
		name: 'smalltalk_forwarder'.

]

{ #category : 'Grail-Tests - @smalltalk forwarder' }
SmalltalkForwarderTestCase >> testBareDerivedUnary [
	"Bare @smalltalk derives the target selector from the method name +
	arity: ``def pong(self)'' forwards to ``self pong'' (env 0)."

	self assert: (testModule @env1:r_derived_unary) equals: 'pong'.

]

{ #category : 'Grail-Tests - @smalltalk forwarder' }
SmalltalkForwarderTestCase >> testClassmethodForwarder [
	"A @classmethod @smalltalk forwarder dispatches on the class itself as
	the Smalltalk receiver."

	self assert: (testModule @env1:r_classmethod_same) equals: true.

]

{ #category : 'Grail-Tests - @smalltalk forwarder' }
SmalltalkForwarderTestCase >> testExplicitBinarySelectorFalse [
	"Distinct receiver/argument -> the binary send answers False."

	self assert: (testModule @env1:r_binary_diff) equals: false.

]

{ #category : 'Grail-Tests - @smalltalk forwarder' }
SmalltalkForwarderTestCase >> testExplicitBinarySelectorTrue [
	"@smalltalk('==') forwards a 1-arg binary send; the Smalltalk Boolean
	result flows back to Python (same object -> True)."

	self assert: (testModule @env1:r_binary_same) equals: true.

]

{ #category : 'Grail-Tests - @smalltalk forwarder' }
SmalltalkForwarderTestCase >> testExplicitUnarySelector [
	"@smalltalk('pong') forwards to the named unary selector even though the
	Python method name (greet) differs from the target."

	self assert: (testModule @env1:r_explicit_unary) equals: 'pong'.

]

{ #category : 'Grail-Tests - @smalltalk forwarder' }
SmalltalkForwarderTestCase >> testKeywordSelectorOneArg [
	"@smalltalk('bump:') forwards a single-argument keyword send."

	self assert: (testModule @env1:r_keyword_one_arg) equals: 42.

]

{ #category : 'Grail-Tests - @smalltalk forwarder' }
SmalltalkForwarderTestCase >> testKeywordSelectorTwoArgs [
	"@smalltalk('combine:with:') forwards a two-argument keyword send, with
	arguments delivered in order."

	self assert: (testModule @env1:r_keyword_two_args) equals: 42.

]

{ #category : 'Grail-Tests - @smalltalk forwarder' }
SmalltalkForwarderTestCase >> testNilResultBecomesNone [
	"A native method that answers Smalltalk nil is coerced to Python None."

	self assert: (testModule @env1:r_nil_is_none) equals: true.

]

{ #category : 'Grail-Tests - @smalltalk forwarder' }
SmalltalkForwarderTestCase >> testStaticmethodDerivedForwarder [
	"A @staticmethod @smalltalk forwarder (bare) dispatches a derived
	selector on the class as the Smalltalk receiver."

	self assert: (testModule @env1:r_static_derived) equals: 'beacon'.

]

{ #category : 'Grail-Tests - @smalltalk forwarder' }
SmalltalkForwarderTestCase >> testStaticmethodKeywordForwarder [
	"A @staticmethod @smalltalk('triple:') forwarder forwards its argument
	to a class-side keyword selector."

	self assert: (testModule @env1:r_static_keyword) equals: 42.

]

{ #category : 'Grail-Tests - @smalltalk forwarder' }
SmalltalkForwarderTestCase >> testVarargsForwarderRaises [
	"A @smalltalk forwarder with a non-fixed-arity signature (here a default
	argument) is rejected at compile time."
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'smalltalk_forwarder_varargs' ifAbsent: [].
	self should: [
		importlib
			loadModuleFromPath: (importlib grailDir , '/tests/python/smalltalk_forwarder_varargs.py')
			name: 'smalltalk_forwarder_varargs'
	] raise: Error.

]
