Class {
	#name : 'SequenceProtocolClassAttributeTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
SequenceProtocolClassAttributeTestCase >> testAGetitemPropertyMakesItsObjectASequence [
	"tests/python/sequence_protocol_class_attribute.py: a class whose
	__getitem__ is a property iterates by index -- list(), tuple(), a
	comprehension, iter(), set(), ``in'', unpacking and reversed() -- an
	error the property raises propagates, and ``__iter__ = None'' still opts
	out.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'sequence_protocol_class_attribute' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/sequence_protocol_class_attribute.py')
		name: 'sequence_protocol_class_attribute'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
