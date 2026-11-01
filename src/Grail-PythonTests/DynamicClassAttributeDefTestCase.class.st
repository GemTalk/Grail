Class {
	#name : 'DynamicClassAttributeDefTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
DynamicClassAttributeDefTestCase >> testADecoratedDefIsTheDescriptorCPythonBuilds [
	"tests/python/dynamic_class_attribute_def.py: an @DynamicClassAttribute def
	is a DynamicClassAttribute in its class __dict__, a read off the class
	refuses unless it is abstract and then reaches the metaclass's __getattr__,
	a subclass copying it replaces its halves through x.getter / x.setter /
	x.deleter, and abstractness is the getter's.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'dynamic_class_attribute_def' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/dynamic_class_attribute_def.py')
		name: 'dynamic_class_attribute_def'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '19 checks, 0 disagreeing [], keys match: True'

]
