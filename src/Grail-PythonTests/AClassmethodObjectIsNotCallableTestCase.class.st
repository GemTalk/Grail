Class {
	#name : 'AClassmethodObjectIsNotCallableTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
AClassmethodObjectIsNotCallableTestCase >> testAClassmethodObjectIsNoCallableWhileItsBoundMethodIs [
	"tests/python/a_classmethod_object_is_not_callable.py: callable() answers
	False for a classmethod object, calling one raises CPython's TypeError, a
	class method bound through its class stays callable, and so do a
	staticmethod object and a function.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'a_classmethod_object_is_not_callable' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/a_classmethod_object_is_not_callable.py')
		name: 'a_classmethod_object_is_not_callable'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
