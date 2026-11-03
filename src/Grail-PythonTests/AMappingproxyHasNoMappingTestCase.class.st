Class {
	#name : 'AMappingproxyHasNoMappingTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
AMappingproxyHasNoMappingTestCase >> testAMappingproxyHasNoMappingAttribute [
	"tests/python/a_mappingproxy_has_no_mapping.py: a mappingproxy refuses
	``mapping'' and leaves it out of dir(), still compares as before, and a
	dict view keeps its own ``mapping''.  Each check agrees with CPython
	3.14."

	| fixture |
	importlib @env1:modules removeKey: #'a_mappingproxy_has_no_mapping' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/a_mappingproxy_has_no_mapping.py')
		name: 'a_mappingproxy_has_no_mapping'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
