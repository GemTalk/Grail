Class {
	#name : 'AStaticmethodHasACallTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
AStaticmethodHasACallTestCase >> testAStaticmethodObjectHasTheCallItsTypeGivesIt [
	"tests/python/a_staticmethod_has_a_call.py: a staticmethod object has a
	__call__ that calls the wrapped function, dir() and staticmethod's
	__dict__ list it, and calling the object still works.  Each check agrees
	with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'a_staticmethod_has_a_call' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/a_staticmethod_has_a_call.py')
		name: 'a_staticmethod_has_a_call'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '3 checks, 0 disagreeing [], keys match: True'

]
