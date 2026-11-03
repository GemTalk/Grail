Class {
	#name : 'PrepareMustReturnAMappingTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
PrepareMustReturnAMappingTestCase >> testAPrepareAnsweringNoMappingIsRefused [
	"tests/python/prepare_must_return_a_mapping.py: a metaclass's __prepare__
	answering None or an int makes the class statement CPython's TypeError,
	naming a metaclass that is no class <metaclass>, while a dict, a dict
	subclass and a mapping whose __getitem__ has a defaulted parameter are
	accepted.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'prepare_must_return_a_mapping' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/prepare_must_return_a_mapping.py')
		name: 'prepare_must_return_a_mapping'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
