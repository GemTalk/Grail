Class {
	#name : 'FunctionRebindingTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
FunctionRebindingTestCase >> setUp [
	"Load tests/python/function_rebinding.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'function_rebinding' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/function_rebinding.py')
		name: 'function_rebinding'.

]

{ #category : 'Grail-Tests - First-class function' }
FunctionRebindingTestCase >> testFunctionAsValueRoundTrips [
	"Reading a def by name (without calling) yields a callable
	BoundMethod that can be invoked later.  ``f = cuber; f(3)'' →
	27."

	self assert: (testModule @env1:___pyAttrLoad___: #f_call_result) equals: 27.
	self assert: (testModule @env1:___pyAttrLoad___: #cuber_call_result) equals: 27.

]

{ #category : 'Grail-Tests - Rebind to non-callable' }
FunctionRebindingTestCase >> testOriginalDefStillCallableBeforeRebind [
	"Sanity: before the rebinding, the def works normally."

	self assert: (testModule @env1:___pyAttrLoad___: #doubler_before) equals: 10.

]

{ #category : 'Grail-Tests - Rebind to non-callable' }
FunctionRebindingTestCase >> testRebindToIntChangesAttributeValue [
	"After ``doubler = 21'', reading the attribute returns the int."

	self assert: (testModule @env1:___pyAttrLoad___: #doubler_value_after) equals: 21.

]

{ #category : 'Grail-Tests - Rebind to non-callable' }
FunctionRebindingTestCase >> testRebindToIntMakesCallTypeError [
	"After ``doubler = 21'', calling ``doubler(5)'' should TypeError —
	int is not callable.  Pre-fix, CallAst's bare-call self-send
	shortcut bypassed the rebinding and called the original def
	(returning 10).  Red light: rebind_typeerror is False today
	because rebind_call_result successfully = 10."

	self assert: (testModule @env1:___pyAttrLoad___: #rebind_typeerror) equals: true.

]

{ #category : 'Grail-Tests - Rebind to callable alias' }
FunctionRebindingTestCase >> testRebindToOtherFunctionCallsAlias [
	"After ``tripler = quintupler'', calling ``tripler(4)'' should
	dispatch to ``quintupler'' (returns 20), not the original
	tripler (which would return 12)."

	self assert: (testModule @env1:___pyAttrLoad___: #tripler_before) equals: 12.
	self assert: (testModule @env1:___pyAttrLoad___: #tripler_after) equals: 20.

]

{ #category : 'Grail-Tests - Rebind to non-function value' }
FunctionRebindingTestCase >> testRebindToStringYieldsStringValue [
	"After ``stomper = 'stomped''', reading ``stomper'' yields the
	string and isinstance(stomper, str) is True."

	self assert: (testModule @env1:___pyAttrLoad___: #stomper_value) equals: 'stomped'.
	self assert: (testModule @env1:___pyAttrLoad___: #stomper_is_str) equals: true.

]
