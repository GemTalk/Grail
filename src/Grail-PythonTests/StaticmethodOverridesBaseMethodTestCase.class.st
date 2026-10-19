Class {
	#name : 'StaticmethodOverridesBaseMethodTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
StaticmethodOverridesBaseMethodTestCase >> assertMatchesCPythonAt: key [
	"Every recorded answer is already a repr string, so the two compare as text."

	| actual expected |
	actual := (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key.
	expected := (testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key.
	self assert: actual asString equals: expected asString.

]

{ #category : 'Grail-Setup' }
StaticmethodOverridesBaseMethodTestCase >> setUp [
	"Reload tests/python/staticmethod_overrides_base_method.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'staticmethod_overrides_base_method' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/staticmethod_overrides_base_method.py')
		name: 'staticmethod_overrides_base_method'.

]

{ #category : 'Grail-Tests' }
StaticmethodOverridesBaseMethodTestCase >> testClassmethodOverridesBaseSelfSend [
	"The same for @classmethod, receiving the class as cls."

	self assertMatchesCPythonAt: 'self_send_Klass'.
	self assertMatchesCPythonAt: 'self_send_OverStatic'.

]

{ #category : 'Grail-Tests' }
StaticmethodOverridesBaseMethodTestCase >> testDictHoldsTheDescriptor [
	"``Sub.__dict__['find_class']'' is the staticmethod / classmethod object --
	including for a def that takes arguments, which the __dict__ view missed."

	self assertMatchesCPythonAt: 'dict_kinds'.

]

{ #category : 'Grail-Tests' }
StaticmethodOverridesBaseMethodTestCase >> testInheritedAndDeeperOverrides [
	"A subclass of the overriding class inherits the forwarder; an override two
	levels below the base gets its own."

	self assertMatchesCPythonAt: 'self_send_StaticChild'.
	self assertMatchesCPythonAt: 'self_send_DeepStatic'.

]

{ #category : 'Grail-Tests' }
StaticmethodOverridesBaseMethodTestCase >> testOrdinaryOverrideAndBaseUnchanged [
	"A plain def override and the base itself behave as before."

	self assertMatchesCPythonAt: 'self_send_Plain'.
	self assertMatchesCPythonAt: 'base_untouched'.

]

{ #category : 'Grail-Tests' }
StaticmethodOverridesBaseMethodTestCase >> testRedefinitionDropsTheForwarder [
	"Redefining the class without the decorator leaves no forwarder behind."

	self assertMatchesCPythonAt: 'redefined'.

]

{ #category : 'Grail-Tests' }
StaticmethodOverridesBaseMethodTestCase >> testStaticmethodOverridesBaseSelfSend [
	"The base's ``self.find_class(m, n)'' -- positional, keyword and via
	getattr -- runs the subclass's @staticmethod; so do class and instance
	reads.  Before: the base's method, and a TypeError from the class read."

	self assertMatchesCPythonAt: 'self_send_Static'.
	self assertMatchesCPythonAt: 'zero_arg'.

]

{ #category : 'Grail-Tests' }
StaticmethodOverridesBaseMethodTestCase >> testUnpicklerFindClass [
	"test_pickle's own shape: _Unpickler.load_global calls self.find_class."

	self assertMatchesCPythonAt: 'unpickler'.

]
