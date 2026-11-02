Class {
	#name : 'ProtocolDefaultsAreNotAttributesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ProtocolDefaultsAreNotAttributesTestCase >> testWhatGrailAddsOnlyToAnswerOrRefuseAProtocolIsNoAttribute [
	"tests/python/protocol_defaults_are_not_attributes.py: object class's
	permissive __class_getitem__ and int's refusing __iter__ and __getitem__ do
	not read as attributes, off a class or an instance, and dir() does not list
	the first; a class's own __class_getitem__ still reads, bound to the class
	as the implicit classmethod it is; subscripting and the refusals are
	unchanged.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'protocol_defaults_are_not_attributes' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/protocol_defaults_are_not_attributes.py')
		name: 'protocol_defaults_are_not_attributes'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '15 checks, 0 disagreeing [], keys match: True'

]
