Class {
	#name : 'TypeMroUnboundTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
TypeMroUnboundTestCase >> testTypeMroIsTheUnboundDescriptor [
	"tests/python/type_mro_unbound.py: type.mro(C) is C's order, a
	metaclass inherits the descriptor, C.mro() stays bound, and type.mro()
	without a class is refused.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'type_mro_unbound' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/type_mro_unbound.py')
		name: 'type_mro_unbound'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
