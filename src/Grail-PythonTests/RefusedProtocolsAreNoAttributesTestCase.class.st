Class {
	#name : 'RefusedProtocolsAreNoAttributesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
RefusedProtocolsAreNoAttributesTestCase >> testAProtocolATypeRefusesIsNoAttributeOfIt [
	"tests/python/refused_protocols_are_no_attributes.py: tuple's and bytes'
	item assignment and deletion and complex's floor division, modulo and
	divmod are no attributes -- not to hasattr, dir() or the type's __dict__ --
	while the operations still raise CPython's TypeError, and bytearray's,
	list's and complex's real ones stay.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'refused_protocols_are_no_attributes' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/refused_protocols_are_no_attributes.py')
		name: 'refused_protocols_are_no_attributes'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
