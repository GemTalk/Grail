Class {
	#name : 'DunderCallTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
DunderCallTestCase >> testDunderCallOfAFunctionOrMethodIsTheCall [
	"tests/python/dunder_call_is_a_call.py: f.__call__(...) calls f with
	those arguments, for a function, a lambda, a bound method and a builtin,
	with no, one or two arguments and with keywords, and __call__ of
	__call__ works as a decorator -- the shape test_grammar's test_classdef
	uses.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'dunder_call_is_a_call' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/dunder_call_is_a_call.py')
		name: 'dunder_call_is_a_call'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '11 checks, 0 disagreeing [], keys match: True'

]
