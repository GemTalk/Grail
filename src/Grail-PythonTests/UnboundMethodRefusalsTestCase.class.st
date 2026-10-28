Class {
	#name : 'UnboundMethodRefusalsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
UnboundMethodRefusalsTestCase >> testMethodsCalledThroughTheirClassRefuseInCPythonsWords [
	"tests/python/unbound_method_refusals.py: a built-in type's method needs an
	argument (in a slot wrapper's words for a slot), does not apply to an
	object of another type and takes no keyword, while a def in a Python class
	body is missing its parameters.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'unbound_method_refusals' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/unbound_method_refusals.py')
		name: 'unbound_method_refusals'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
