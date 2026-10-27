Class {
	#name : 'MappingProxyDelegationTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
MappingProxyDelegationTestCase >> testMappingProxyWrapsAnyMappingAndReadsThroughIt [
	"tests/python/mappingproxy_delegation.py: types.MappingProxyType accepts
	anything with a __getitem__ but a list or a tuple, answers in, len(),
	iteration, reversed() and str() by asking the wrapped mapping -- so a dict
	subclass's overrides answer -- refuses |=, has no item assignment or
	deletion, and subscripts to a GenericAlias.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'mappingproxy_delegation' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/mappingproxy_delegation.py')
		name: 'mappingproxy_delegation'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]
